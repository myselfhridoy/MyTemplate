const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Environment Variables
const uri = process.env.MONGO_URI;

// Database Configuration
const DB_NAME = "hmtutoring";
const COLLECTION_NAME = "saved_answers";

// Singleton Client
let client;
let db;
let answersCollection;

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
            console.log("Connected to MongoDB (Saved Answers)");

            db = client.db(DB_NAME);
            answersCollection = db.collection(COLLECTION_NAME);
        }
        return answersCollection;
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

// 1. Save Answer
router.post('/save', async (req, res) => {
    try {
        const { userId, username, questionHash, questionText, answerText, modelUsed, imageBase64, stemText, source, marks } = req.body;

        if (!userId || (!answerText && !imageBase64)) {
            return res.status(400).json({ success: false, message: "Missing required fields (userId, and either answerText or imageBase64)" });
        }

        const newAnswer = {
            userId: userId,
            username: username || 'Anonymous',
            questionHash: questionHash || 'unknown',
            questionText: questionText || '',
            stemText: stemText || '',
            answerText: answerText || '',
            source: source || '',
            marks: marks || '',
            modelUsed: modelUsed || 'AI',
            imageBase64: imageBase64 || null, // Optional now
            createdAt: new Date()
        };

        const result = await answersCollection.insertOne(newAnswer);

        if (result.acknowledged) {
            res.status(201).json({ success: true, message: "Answer saved successfully", id: result.insertedId });
        } else {
            res.status(500).json({ success: false, message: "Failed to save answer" });
        }
    } catch (error) {
        console.error("Save answer error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Get Answers for a User (Filtered by Question Hash)
router.get('/:userId/:questionHash', async (req, res) => {
    try {
        const { userId, questionHash } = req.params;

        if (!userId || !questionHash) {
            return res.status(400).json({ success: false, message: "Missing params" });
        }

        const answers = await answersCollection.find({ userId: userId, questionHash: questionHash })
            .sort({ createdAt: -1 }) // Newest first
            .toArray();

        res.json({ success: true, answers });
    } catch (error) {
        console.error("Fetch answers error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Delete Answer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: "Missing ID" });

        const result = await answersCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
            res.json({ success: true, message: "Deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Answer not found" });
        }
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
