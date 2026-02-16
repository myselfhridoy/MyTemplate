const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const studentRoutes = require('./students');
const attendanceRoutes = require('./attendance');
const timeslotRoutes = require('./timeslots');

// Mount Routes
app.use('/api/students', studentRoutes);      // For Auth & Student CRUD
app.use('/api/attendance', attendanceRoutes); // For Attendance
app.use('/api/timeslots', timeslotRoutes);    // For TimeSlots

// Root Route
app.get('/', (req, res) => {
    res.send('H.M. Tutoring Backend (Native Driver) is Running 🚀');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
