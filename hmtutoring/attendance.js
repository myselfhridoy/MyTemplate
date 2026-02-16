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

// --- Helper: Get effective joinDate for a student ---
function getJoinDate(student) {
    if (student.joinDate) return new Date(student.joinDate);
    if (student.createdAt) return new Date(student.createdAt);
    return new Date('2026-01-01'); // Fallback
}

// --- Helper: Calculate expected classes for a month ---
// RULE: Expected = schedule.length * 4 (FIXED per full month)
// For the join month: proportional based on remaining days in that month
function calculateExpectedClasses(student, monthStart, monthEnd) {
    const joinDate = getJoinDate(student);
    const schedule = student.schedule || [];

    // If student joined after this month ends, 0 expected
    if (joinDate > monthEnd) return 0;

    const fullMonthExpected = schedule.length * 4;

    // If student joined during this month (not on the 1st), reduce proportionally
    if (joinDate > monthStart) {
        const totalDaysInMonth = monthEnd.getDate();
        const joinDay = joinDate.getDate();
        const remainingDays = totalDaysInMonth - joinDay + 1;
        return Math.round(fullMonthExpected * (remainingDays / totalDaysInMonth));
    }

    return fullMonthExpected;
}

// --- Endpoints ---

// 1. Get Daily Attendance
router.get('/daily', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false });

    try {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // Get regular attendance records for this date
        const records = await attendanceCollection.find({
            date: { $gte: start, $lte: end }
        }).toArray();

        // Also find makeup classes scheduled for this date
        const makeupRecords = await attendanceCollection.find({
            makeupDate: { $gte: start, $lte: end },
            status: 'makeup'
        }).toArray();

        res.json({ success: true, records, makeupRecords });
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

    const attendanceDate = new Date(date);

    try {
        for (const record of studentUpdates) {
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
                const updateData = {
                    status: record.status,
                    reason: record.reason || "",
                    classwork: record.classwork || classwork || "",
                    homework: record.homework || homework || "",
                    isExtra: false,
                    updatedAt: new Date(),
                    date: attendanceDate
                };

                // If makeup, store the scheduled makeup date/time
                if (record.status === 'makeup') {
                    updateData.makeupDate = record.makeupDate ? new Date(record.makeupDate) : null;
                    updateData.makeupTime = record.makeupTime || "";
                } else {
                    // Clear makeup fields if status changed from makeup to something else
                    updateData.makeupDate = null;
                    updateData.makeupTime = "";
                }

                await attendanceCollection.updateOne(
                    query,
                    {
                        $set: updateData,
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

// 3. Get Report (Monthly)
router.get('/report', async (req, res) => {
    const { month, year } = req.query;
    if (month === undefined || year === undefined) {
        return res.status(400).json({ success: false, message: "Month and Year required" });
    }

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, parseInt(month) + 1, 0, 23, 59, 59, 999);

    try {
        // Get all active private students
        const allStudents = await studentsCollection.find(
            { $or: [{ studentType: 'private' }, { studentType: { $exists: false } }] },
            { projection: { username: 1, userid: 1, schedule: 1, studentType: 1, joinDate: 1, createdAt: 1 } }
        ).toArray();

        // Get all attendance records for the month
        const records = await attendanceCollection.find({
            date: { $gte: monthStart, $lte: monthEnd }
        }).toArray();

        const report = allStudents
            .filter(student => {
                // Filter out students whose joinDate is after this month ends
                const joinDate = getJoinDate(student);
                return joinDate <= monthEnd;
            })
            .map(student => {
                const studentRecords = records.filter(r => r.studentId.toString() === student._id.toString());

                let totalPresent = 0;
                let totalAbsent = 0;
                let totalMakeup = 0;
                const days = [];

                studentRecords.forEach(r => {
                    if (r.status === 'present') totalPresent++;
                    if (r.status === 'absent') totalAbsent++;
                    if (r.status === 'makeup') totalMakeup++;
                    // Legacy: count 'late' as present
                    if (r.status === 'late') totalPresent++;

                    days.push({
                        date: r.date,
                        status: r.status,
                        reason: r.reason,
                        makeupDate: r.makeupDate,
                        makeupTime: r.makeupTime,
                        id: r._id
                    });
                });

                // Expected classes: schedule.length * 4 (fixed per full month)
                const expectedClasses = calculateExpectedClasses(student, monthStart, monthEnd);

                // Total attended: present (includes legacy late)
                const totalAttended = totalPresent;

                // Extra = attended - expected (can be negative)
                // RULE: If month is current or future, show 0 extra/deficit. 
                // Only finished months show the calculated deviation.
                const now = new Date();
                const isFinishedMonth = (parseInt(year) < now.getFullYear()) ||
                    (parseInt(year) === now.getFullYear() && parseInt(month) < now.getMonth());

                const extraClasses = isFinishedMonth ? (totalAttended - expectedClasses) : 0;

                return {
                    student: {
                        _id: student._id,
                        username: student.username,
                        schedule: student.schedule || [],
                        joinDate: getJoinDate(student)
                    },
                    totalPresent,
                    totalAbsent,
                    totalMakeup,
                    totalAttended,
                    expectedClasses,
                    extraClasses,
                    history: days.sort((a, b) => new Date(b.date) - new Date(a.date))
                };
            });

        res.json({ success: true, report });
    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 4. Student Summary (Dashboard)
router.get('/summary/:studentId', async (req, res) => {
    const { studentId } = req.params;

    if (!studentId) {
        return res.status(400).json({ success: false, message: "Student ID required" });
    }

    try {
        const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        // Only count records from Jan 2026 onwards
        const countingEpoch = new Date('2026-01-01');
        const records = await attendanceCollection.find({
            studentId: new ObjectId(studentId),
            date: { $gte: countingEpoch }
        }).toArray();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // This Week (Sat - Fri)
        const dayOfWeek = now.getDay();
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

        // Calculate cumulative extra: sum of max(0, attended - expected) per completed month
        const joinDate = getJoinDate(student);
        const schedule = student.schedule || [];

        let totalExtra = 0;
        const epochYear = 2026;
        const epochMonth = 0; // January

        // Loop through each COMPLETED month from Jan 2026 to last month
        for (let y = epochYear; y <= now.getFullYear(); y++) {
            const mStart = (y === epochYear) ? epochMonth : 0;
            const mEnd = (y === now.getFullYear()) ? now.getMonth() - 1 : 11;

            for (let m = mStart; m <= mEnd; m++) {
                const mS = new Date(y, m, 1);
                const mE = new Date(y, m + 1, 0, 23, 59, 59, 999);

                if (joinDate > mE) continue; // Student hadn't joined yet

                const monthExpected = calculateExpectedClasses(student, mS, mE);
                const monthAttended = records.filter(r => {
                    const d = new Date(r.date);
                    return d >= mS && d <= mE && (r.status === 'present' || r.status === 'late');
                }).length;

                totalExtra += (monthAttended - monthExpected);
            }
        }

        // This month expected (full month target)
        const thisMonthExpected = calculateExpectedClasses(student, startOfMonth, endOfMonth);

        // Latest Classwork
        const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
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
                thisMonthExpected,
                totalExtra,
                latestWork,
                scheduleStats: {
                    daysPerWeek: schedule.length,
                    daysPerMonth: schedule.length * 4
                },
                classSchedule: (() => {
                    // Use Bangladesh Time (UTC+6)
                    const bdTime = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
                    const todayIndex = bdTime.getUTCDay(); // getUTCDay() on a shifted date gives local day
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const todayStr = days[todayIndex];

                    // Normalize routine keys to 3 chars (e.g. "Sunday" -> "Sun")
                    const routine = student.routine || {};
                    const normalizedRoutine = {};
                    Object.keys(routine).forEach(k => {
                        const shortKey = k.substring(0, 3);
                        normalizedRoutine[shortKey] = routine[k];
                    });

                    let todayClass = null;
                    if (normalizedRoutine[todayStr]) {
                        // Check if attendance is already marked for today (using local date string match)
                        const todayDateString = bdTime.toISOString().split('T')[0];
                        const isMarked = records.some(r => {
                            const rDate = new Date(r.date).toISOString().split('T')[0];
                            return rDate === todayDateString && (r.status === 'present' || r.status === 'late' || r.status === 'makeup');
                        });

                        todayClass = {
                            hasClass: true,
                            time: normalizedRoutine[todayStr],
                            isFinished: isMarked
                        };
                    } else {
                        todayClass = { hasClass: false };
                    }

                    // Calculate Next Regular Class
                    let nextClass = null;
                    for (let i = 1; i <= 7; i++) {
                        const nextIndex = (todayIndex + i) % 7;
                        const checkDay = days[nextIndex];
                        if (normalizedRoutine[checkDay]) {
                            nextClass = { day: checkDay, time: normalizedRoutine[checkDay] };
                            break;
                        }
                    }

                    // CHECK FOR UPCOMING MAKEUP CLASSES
                    const bdMidnight = new Date(bdTime);
                    bdMidnight.setHours(0, 0, 0, 0);

                    const makeupClasses = records
                        .filter(r => r.status === 'makeup' && r.makeupDate && new Date(r.makeupDate) >= bdMidnight)
                        .sort((a, b) => new Date(a.makeupDate) - new Date(b.makeupDate));

                    const upcomingMakeup = makeupClasses.length > 0 ? {
                        date: makeupClasses[0].makeupDate,
                        time: makeupClasses[0].makeupTime,
                        originalDate: makeupClasses[0].date
                    } : null;

                    // If makeup is TODAY, override or set todayClass
                    if (upcomingMakeup) {
                        const mkDate = new Date(upcomingMakeup.date).toISOString().split('T')[0];
                        const todayDateStr = bdTime.toISOString().split('T')[0];

                        if (mkDate === todayDateStr) {
                            todayClass = {
                                hasClass: true,
                                time: upcomingMakeup.time + " (Makeup Class)",
                                isMakeup: true,
                                isFinished: false
                            };
                        }
                    }

                    return { todayClass, nextClass, upcomingMakeup };
                })(),
                attendanceHistory: records.map(r => ({
                    date: r.date,
                    status: r.status,
                    reason: r.reason,
                    makeupDate: r.makeupDate,
                    makeupTime: r.makeupTime
                }))
            }
        });

    } catch (error) {
        console.error("Summary Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 5. Get Makeup Schedule (for Routine page)
router.get('/makeup-schedule', async (req, res) => {
    const { from } = req.query;

    try {
        const fromDate = from ? new Date(from) : new Date();
        fromDate.setHours(0, 0, 0, 0);

        // Find all makeup records with a makeupDate >= from
        const makeupRecords = await attendanceCollection.find({
            status: 'makeup',
            makeupDate: { $gte: fromDate }
        }).toArray();

        // Enrich with student names
        const studentIds = [...new Set(makeupRecords.map(r => r.studentId.toString()))];
        const students = await studentsCollection.find({
            _id: { $in: studentIds.map(id => new ObjectId(id)) }
        }, { projection: { username: 1 } }).toArray();

        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s.username; });

        const enriched = makeupRecords.map(r => ({
            _id: r._id,
            studentId: r.studentId,
            studentName: studentMap[r.studentId.toString()] || 'Unknown',
            originalDate: r.date,
            makeupDate: r.makeupDate,
            makeupTime: r.makeupTime,
            status: r.status
        }));

        res.json({ success: true, makeupSchedule: enriched });
    } catch (error) {
        console.error("Makeup Schedule Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
