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
        if (!client || !client.topology || !client.topology.isConnected()) {
            client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 5000,
            });
            await client.connect();
            console.log("Connected to MongoDB (Students)");

            db = client.db(DB_NAME);
            studentsCollection = db.collection(COLLECTION_NAME);
        }
        return studentsCollection;
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

// 1. Student Login
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing credentials" });

    try {
        // Plaintext password for now as requested
        const student = await studentsCollection.findOne({ email, password });
        if (student) {
            res.json({
                success: true,
                message: "Login successful",
                user: {
                    username: student.username,
                    email: student.email,
                    _id: student._id,
                    isAdmin: false,
                    studentType: student.studentType || 'private',
                    status: student.status || 'active'
                }
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
    // routine: { "Sat": "TimeSlotLabel" }
    const { username, email, password, schedule, routine, studentType, status, joinDate, ...otherInfo } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "Missing credentials" });

    try {
        const existing = await studentsCollection.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: "Email exists" });

        const result = await studentsCollection.insertOne({
            username,
            email,
            password,
            schedule: schedule || [],
            routine: routine || {},
            studentType: studentType || 'private', // Default
            status: status || 'active',           // Default
            joinDate: joinDate ? new Date(joinDate) : new Date(),
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
        // Return all fields including type and status
        const students = await studentsCollection.find({}).sort({ username: 1 }).toArray();
        res.json({ success: true, students });
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3.5 Public: Get Routine (Safe)
router.get('/public/routine', async (req, res) => {
    try {
        const students = await studentsCollection.find(
            { status: 'active', studentType: 'private' },
            { projection: { username: 1, routine: 1, _id: 1 } }
        ).sort({ username: 1 }).toArray();
        res.json({ success: true, students });
    } catch (error) {
        console.error("Routine fetch error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Admin: Update Student
router.put('/admin/update-student', async (req, res) => {
    const { _id, username, email, password, schedule, routine, studentType, status, joinDate } = req.body;
    if (!_id) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const updateFields = {};
        if (username) updateFields.username = username;
        if (email) updateFields.email = email;
        if (password) updateFields.password = password;
        if (schedule) updateFields.schedule = schedule;
        if (routine) updateFields.routine = routine;
        if (studentType) updateFields.studentType = studentType;
        if (status) updateFields.status = status;
        if (joinDate) updateFields.joinDate = new Date(joinDate);

        const result = await studentsCollection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateFields }
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

// 5. Admin: Delete Student
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
