const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Environment Variables
const uri = process.env.MONGO_URI;

// Database Configuration
const DB_NAME = "hmtutoring";
const COLLECTION_NAME = "students";

// Singleton Client
let client;
let db;
let studentsCollection;

async function connectToDatabase() {
    if (!uri) {
        throw new Error("MONGO_URI environment variable is not defined.");
    }

    try {
        // If client doesn't exist or isn't connected, create/connect
        if (!client || !client.topology || !client.topology.isConnected()) {
            client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 5000,
            });
            await client.connect();
            console.log("Connected to MongoDB");

            db = client.db(DB_NAME);
            studentsCollection = db.collection(COLLECTION_NAME);
        }
        return studentsCollection;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error; // Rethrow so the request fails cleanly
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

// 1. Student Login
router.post('/auth/login', async (req, res) => {
    const { username, userid } = req.body;
    if (!username || !userid) return res.status(400).json({ success: false, message: "Missing credentials" });

    try {
        const student = await studentsCollection.findOne({ username, userid });
        if (student) {
            res.json({
                success: true,
                message: "Login successful",
                user: { username: student.username, userid: student.userid, _id: student._id }
            });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Admin: Create Student
router.post('/admin/create-student', async (req, res) => {
    const { username, userid, ...otherInfo } = req.body;
    if (!username || !userid) return res.status(400).json({ success: false, message: "Missing credentials" });

    try {
        const existing = await studentsCollection.findOne({ userid });
        if (existing) return res.status(409).json({ success: false, message: "UserID exists" });

        const result = await studentsCollection.insertOne({
            username,
            userid,
            createdAt: new Date(),
            ...otherInfo
        });

        if (result.acknowledged) {
            res.status(201).json({ success: true, message: "Student created", studentId: result.insertedId });
        } else {
            res.status(500).json({ success: false, message: "Failed to create" });
        }
    } catch (error) {
        console.error("Create error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Admin: Get Students
router.get('/admin/students', async (req, res) => {
    try {
        const students = await studentsCollection.find({}).toArray();
        res.json({ success: true, students });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Admin: Update Student (NEW)
router.put('/admin/update-student', async (req, res) => {
    const { _id, username, userid } = req.body;
    if (!_id || !username || !userid) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const result = await studentsCollection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: { username, userid } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.json({ success: true, message: "Student updated successfully" });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 5. Admin: Delete Student (NEW)
router.delete('/admin/delete-student/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ success: false, message: "Missing student ID" });
    }

    try {
        const result = await studentsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.json({ success: true, message: "Student deleted successfully" });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
