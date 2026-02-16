const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Environment Variables
const uri = process.env.MONGO_URI;

// Database Configuration
const DB_NAME = "hmtutoring";
const COLLECTION_NAME = "attendance";
const STUDENTS_COLLECTION = "students";

// Singleton Client
let client;
let db;
let attendanceCollection;
let studentsCollection;

async function connectToDatabase() {
    if (!uri) throw new Error("MONGO_URI environment variable is not defined.");

    try {
        if (!client || !client.topology || !client.topology.isConnected()) {
            client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
            await client.connect();
            console.log("Connected to MongoDB (Attendance)");

            db = client.db(DB_NAME);
            attendanceCollection = db.collection(COLLECTION_NAME);
            studentsCollection = db.collection(STUDENTS_COLLECTION);

            // Create Index for unique daily records per student
            await attendanceCollection.createIndex({ studentId: 1, date: 1 }, { unique: true });
        }
        return { attendanceCollection, studentsCollection };
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

router.get('/daily', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false });

    try {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const records = await attendanceCollection.find({
            date: { $gte: start, $lte: end }
        }).toArray();

        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// 2. Mark Attendance (Batch)
router.post('/mark', async (req, res) => {
    const { students: studentUpdates, date, classwork, homework } = req.body;

    if (!studentUpdates || !date) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    console.log("PAYLOAD:", JSON.stringify({ studentUpdates, date, classwork, homework }, null, 2));

    const attendanceDate = new Date(date);

    try {
        // 2. Iterate and update/insert
        for (const record of studentUpdates) {
            // Find existing record for this student on this date
            const start = new Date(attendanceDate); start.setHours(0, 0, 0, 0);
            const end = new Date(attendanceDate); end.setHours(23, 59, 59, 999);

            const query = {
                studentId: new ObjectId(record.studentId),
                date: { $gte: start, $lte: end }
            };

            if (record.status === 'unmarked' || record.status === null) {
                // DELETE logic if Unmarked
                await attendanceCollection.deleteOne(query);
            } else if (record.status) {
                // UPSERT logic
                await attendanceCollection.updateOne(
                    query,
                    {
                        $set: {
                            status: record.status,
                            reason: record.reason || "",
                            classwork: record.classwork || classwork || "",
                            homework: record.homework || homework || "",
                            isExtra: false,
                            updatedAt: new Date(),
                            date: attendanceDate // Ensure date is set on insert
                        },
                        $setOnInsert: { createdAt: new Date(), studentId: new ObjectId(record.studentId) }
                    },
                    { upsert: true }
                );
            }
        }

        res.json({ success: true, message: "Attendance updated" });
    } catch (error) {
        console.error("Mark Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 2. Get Report (Monthly)
router.get('/report', async (req, res) => {
    const { month, year } = req.query; // 0-indexed month
    if (month === undefined || year === undefined) {
        return res.status(400).json({ success: false, message: "Month and Year required" });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, parseInt(month) + 1, 0, 23, 59, 59, 999);

    try {
        // 1. Get all students (Private Only for Reports)
        // If studentType is missing, assume 'private' for backward compatibility
        const allStudents = await studentsCollection.find(
            { $or: [{ studentType: 'private' }, { studentType: { $exists: false } }] },
            { projection: { username: 1, userid: 1, schedule: 1, studentType: 1 } }
        ).toArray();

        // 2. Get all attendance records for the month
        const records = await attendanceCollection.find({
            date: { $gte: startDate, $lte: endDate }
        }).toArray();

        // 3. Process Report
        const report = allStudents.map(student => {
            const studentRecords = records.filter(r => r.studentId.toString() === student._id.toString());

            let totalPresent = 0;
            let totalLate = 0;
            let totalAbsent = 0;
            const days = [];

            studentRecords.forEach(r => {
                const dateStr = r.date.toISOString(); // keep ISO for sorting/display
                if (r.status === 'present') totalPresent++;
                if (r.status === 'late') totalLate++;
                if (r.status === 'absent') totalAbsent++;

                // Collect detailed history
                days.push({
                    date: r.date,
                    status: r.status,
                    reason: r.reason,
                    id: r._id
                });
            });

            /* 
               Calculate how many classes they were SUPPOSED to have this month 
               based on their 'schedule' (e.g., ['Sat', 'Mon']).
               Then compare with Total Attended.
            */
            let expectedClasses = 0;
            if (student.schedule && Array.isArray(student.schedule) && student.schedule.length > 0) {
                // User requested simple calculation: 4 days/week = 16 days/month
                expectedClasses = student.schedule.length * 4;
            }

            const totalAttended = totalPresent + totalLate;
            // If expected is 0 (no schedule), maybe all are extra? Or strict policy? 
            // Let's assume if no schedule, then 0 expected, so all attended are extra.
            const extraClasses = totalAttended > expectedClasses ? totalAttended - expectedClasses : 0;

            return {
                student: { _id: student._id, username: student.username, schedule: student.schedule || [] },
                totalPresent,
                totalLate,
                totalAbsent,
                totalAttended,
                expectedClasses, // Useful to show "Attended X / Y"
                extraClasses,
                history: days.sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort newest first
            };
        });

        res.json({ success: true, report });
    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. Student Summary (Dashboard)
router.get('/summary/:studentId', async (req, res) => {
    const { studentId } = req.params;

    if (!studentId) {
        return res.status(400).json({ success: false, message: "Student ID required" });
    }

    try {
        // 1. Get Student Details (for Schedule)
        const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // 2. Get All Attendance Records for this Student
        const records = await attendanceCollection.find({ studentId: new ObjectId(studentId) }).toArray();

        // 3. Calculate Stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // This Week (Sat - Fri)
        const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
        // Calculate days to subtract to get to last Saturday
        // If today is Sat (6), subtract 0. If Sun (0), subtract 1. ... If Fri (5), subtract 6.
        // Formula: (day + 1) % 7 ?? No.
        // Sat=6 -> 0. Sun=0 -> 1. Mon=1 -> 2. ... Fri=5 -> 6.
        const daysSinceSaturday = (dayOfWeek + 1) % 7;
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - daysSinceSaturday);
        startOfWeek.setHours(0, 0, 0, 0);

        const thisWeekCount = records.filter(r => {
            const d = new Date(r.date);
            return d >= startOfWeek && d <= now && (r.status === 'present' || r.status === 'late');
        }).length;

        const thisMonthCount = records.filter(r => {
            const d = new Date(r.date);
            return d >= startOfMonth && d <= endOfMonth && (r.status === 'present' || r.status === 'late');
        }).length;

        // Total Extra Classes
        let totalExtra = 0;
        const scheduleDays = student.schedule || []; // e.g. ['Sat', 'Mon']
        const dayMapStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        records.forEach(r => {
            if (r.status === 'present' || r.status === 'late') {
                const rDate = new Date(r.date);
                const dayStr = dayMapStrings[rDate.getDay()];
                if (!scheduleDays.includes(dayStr)) {
                    totalExtra++;
                }
            }
        });

        // Latest Classwork
        // Sort descending by date
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestWorkRecord = sortedRecords.find(r => (r.classwork && r.classwork.trim() !== "") || (r.homework && r.homework.trim() !== ""));

        const latestWork = latestWorkRecord ? {
            date: latestWorkRecord.date,
            classwork: latestWorkRecord.classwork,
            homework: latestWorkRecord.homework
        } : null;

        res.json({
            success: true,
            summary: {
                thisWeek: thisWeekCount,
                thisMonth: thisMonthCount,
                totalExtra,
                latestWork,
                scheduleStats: {
                    daysPerWeek: scheduleDays.length,
                    daysPerMonth: scheduleDays.length * 4
                },
                classSchedule: (() => {
                    const todayIndex = now.getDay(); // 0=Sun, 6=Sat
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const todayStr = days[todayIndex];
                    const routine = student.routine || {};

                    let todayClass = null;
                    if (routine[todayStr]) {
                        todayClass = { hasClass: true, time: routine[todayStr] };
                    } else {
                        todayClass = { hasClass: false };
                    }

                    let nextClass = null;
                    // Find next class
                    for (let i = 1; i <= 7; i++) {
                        const nextIndex = (todayIndex + i) % 7;
                        const checkDay = days[nextIndex];
                        if (routine[checkDay]) {
                            nextClass = { day: checkDay, time: routine[checkDay] };
                            break;
                        }
                    }

                    return { todayClass, nextClass };
                })(),
                attendanceHistory: records.map(r => ({
                    date: r.date,
                    status: r.status
                }))
            }
        });

    } catch (error) {
        console.error("Summary Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
