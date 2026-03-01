const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Environment Variables
const uri = process.env.MONGO_URI;

// Database Configuration
const DB_NAME = "hmtutoring";
const COLLECTION_NAME = "newsfeed";

// Singleton Client
let client;
let db;
let newsfeedCollection;

async function connectToDatabase() {
    if (!uri) {
        throw new Error("MONGO_URI environment variable is not defined.");
    }

    try {
        if (!client || !client.topology || !client.topology.isConnected()) {
            client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 5000,
            });
            await client.connect();
            console.log("Connected to MongoDB (NewsFeed)");

            db = client.db(DB_NAME);
            newsfeedCollection = db.collection(COLLECTION_NAME);
        }
        return newsfeedCollection;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

// Middleware: Ensure DB connection
router.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: "Database connection failed" });
    }
});

// --- API Endpoints ---

// 1. Create Post
router.post('/', async (req, res) => {
    const { authorId, authorName, authorRole, content, imageUrl } = req.body;

    if (!authorId || !authorName || !content) {
        return res.status(400).json({ success: false, message: "Missing required fields (authorId, authorName, content)" });
    }

    try {
        const post = {
            authorId,
            authorName,
            authorRole: authorRole || 'Student',
            content: content.trim(),
            imageUrl: imageUrl || null,
            reactions: {
                like: [],
                love: [],
                haha: [],
                wow: [],
                sad: [],
                angry: []
            },
            comments: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await newsfeedCollection.insertOne(post);

        if (result.acknowledged) {
            res.status(201).json({
                success: true,
                message: "Post created",
                post: { ...post, _id: result.insertedId }
            });
        } else {
            res.status(500).json({ success: false, message: "Failed to create post" });
        }
    } catch (error) {
        console.error("Create post error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Get Posts (Paginated)
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const posts = await newsfeedCollection
            .find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await newsfeedCollection.countDocuments();

        res.json({
            success: true,
            posts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + posts.length < total
            }
        });
    } catch (error) {
        console.error("Fetch posts error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Toggle Reaction
router.post('/:id/react', async (req, res) => {
    const { id } = req.params;
    const { userId, reactionType } = req.body;

    if (!userId || !reactionType) {
        return res.status(400).json({ success: false, message: "Missing userId or reactionType" });
    }

    const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ success: false, message: "Invalid reaction type" });
    }

    try {
        const post = await newsfeedCollection.findOne({ _id: new ObjectId(id) });
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        // Remove user from ALL reaction arrays first (user can only have one reaction)
        const pullUpdate = {};
        for (const r of validReactions) {
            pullUpdate[`reactions.${r}`] = userId;
        }
        await newsfeedCollection.updateOne(
            { _id: new ObjectId(id) },
            { $pull: pullUpdate }
        );

        // Check if user already had this specific reaction (toggle off)
        const alreadyReacted = post.reactions[reactionType]?.includes(userId);

        if (!alreadyReacted) {
            // Add reaction
            await newsfeedCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $push: { [`reactions.${reactionType}`]: userId },
                    $set: { updatedAt: new Date() }
                }
            );
        } else {
            await newsfeedCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { updatedAt: new Date() } }
            );
        }

        // Return updated post
        const updatedPost = await newsfeedCollection.findOne({ _id: new ObjectId(id) });
        res.json({ success: true, reactions: updatedPost.reactions });
    } catch (error) {
        console.error("React error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Add Comment
router.post('/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { authorId, authorName, authorRole, text } = req.body;

    if (!authorId || !authorName || !text) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const comment = {
            commentId: uuidv4(),
            authorId,
            authorName,
            authorRole: authorRole || 'Student',
            text: text.trim(),
            createdAt: new Date()
        };

        const result = await newsfeedCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $push: { comments: comment },
                $set: { updatedAt: new Date() }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        res.json({ success: true, comment });
    } catch (error) {
        console.error("Comment error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 5. Delete Post (author or admin)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, isAdmin } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "Missing userId" });
    }

    try {
        const post = await newsfeedCollection.findOne({ _id: new ObjectId(id) });
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        // Only author or admin can delete
        if (post.authorId !== userId && !isAdmin) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this post" });
        }

        await newsfeedCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ success: true, message: "Post deleted" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
