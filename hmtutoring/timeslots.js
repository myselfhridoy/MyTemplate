const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Environment Variables
const uri = process.env.MONGO_URI;

// Database Configuration
const DB_NAME = "hmtutoring";
const COLLECTION_NAME = "timeslots";

// Singleton Client
let client;
let db;
let slotsCollection;

async function connectToDatabase() {
    if (!uri) throw new Error("MONGO_URI environment variable is not defined.");

    try {
        if (!client || !client.topology || !client.topology.isConnected()) {
            client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            await client.connect();
            console.log("Connected to MongoDB (TimeSlots)");

            db = client.db(DB_NAME);
            slotsCollection = db.collection(COLLECTION_NAME);
        }
        return slotsCollection;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

// Middleware
router.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: "Database connection failed" });
    }
});

// --- Endpoints ---

// 1. Get All Slots
router.get('/', async (req, res) => {
    try {
        // Sort by label for now, or add a 'order' field later
        const slots = await slotsCollection.find({}).sort({ label: 1 }).toArray();
        res.json({ success: true, slots });
    } catch (error) {
        console.error("Fetch Slots Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Add Slot
router.post('/', async (req, res) => {
    const { label } = req.body; // e.g., "8:00 AM - 9:30 AM"
    if (!label) return res.status(400).json({ success: false, message: "Label required" });

    try {
        const existing = await slotsCollection.findOne({ label });
        if (existing) return res.status(409).json({ success: false, message: "Slot exists" });

        const result = await slotsCollection.insertOne({ label, createdAt: new Date() });
        res.status(201).json({ success: true, message: "Slot added", slotId: result.insertedId });
    } catch (error) {
        console.error("Add Slot Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Delete Slot
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await slotsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Not found" });
        res.json({ success: true, message: "Slot deleted" });
    } catch (error) {
        console.error("Delete Slot Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
