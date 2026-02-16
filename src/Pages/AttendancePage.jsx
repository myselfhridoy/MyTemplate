import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';

const API_BASE = 'https://geminiai-render.onrender.com/api';

// Modern Card Component for Student
const StudentCard = ({ student, attendanceForm, updateStudentField, onMakeupClick }) => {
    const data = attendanceForm[student._id] || {};
    return (
        <div className="card bg-base-100 shadow-xl border border-white/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="card-body p-6">
                {/* Header: Name, Actions */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="card-title text-lg font-bold text-base-content/90">{student.username}</h3>
                        {student.email && <div className="badge badge-ghost badge-sm mt-1 bg-base-200/50">{student.email}</div>}
                    </div>
                    <div className="join shadow-sm rounded-lg overflow-hidden">
                        <button
                            className={`join-item btn btn-sm px-3 font-bold transition-all ${data.status === 'present' ? 'btn-success text-white' : 'btn-ghost hover:bg-success/20 text-success'}`}
                            onClick={() => updateStudentField(student._id, 'status', 'present')}
                        >P</button>
                        <button
                            className={`join-item btn btn-sm px-3 font-bold transition-all ${data.status === 'makeup' ? 'btn-info text-white' : 'btn-ghost hover:bg-info/20 text-info'}`}
                            onClick={() => {
                                if (data.status === 'makeup') {
                                    // Toggle off
                                    updateStudentField(student._id, 'status', 'unmarked');
                                } else {
                                    onMakeupClick(student._id);
                                }
                            }}
                        >M</button>
                        <button
                            className={`join-item btn btn-sm px-3 font-bold transition-all ${data.status === 'absent' ? 'btn-error text-white' : 'btn-ghost hover:bg-error/20 text-error'}`}
                            onClick={() => updateStudentField(student._id, 'status', 'absent')}
                        >A</button>
                    </div>
                </div>

                {/* Makeup Info */}
                {data.status === 'makeup' && data.makeupDate && (
                    <div className="alert alert-info py-2 px-3 text-xs shadow-inner rounded-lg mb-3">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="font-semibold">Makeup: {new Date(data.makeupDate).toLocaleDateString('en-GB')} {data.makeupTime && `(${data.makeupTime})`}</span>
                        </div>
                        <button
                            className="btn btn-xs btn-ghost btn-circle"
                            onClick={() => onMakeupClick(student._id)}
                        >✎</button>
                    </div>
                )}

                {/* Inputs */}
                <div className="space-y-3">
                    <div className="form-control w-full">
                        <input
                            type="text"
                            placeholder="Classwork"
                            className="input input-sm input-bordered w-full rounded-lg hover:border-primary/50 focus:border-primary bg-base-200/50 transition-colors"
                            value={data.classwork || ''}
                            onChange={(e) => updateStudentField(student._id, 'classwork', e.target.value)}
                        />
                    </div>
                    <div className="form-control w-full">
                        <input
                            type="text"
                            placeholder="Homework"
                            className="input input-sm input-bordered w-full rounded-lg hover:border-primary/50 focus:border-primary bg-base-200/50 transition-colors"
                            value={data.homework || ''}
                            onChange={(e) => updateStudentField(student._id, 'homework', e.target.value)}
                        />
                    </div>
                    {(data.status === 'absent' || data.status === 'makeup' || data.reason) && (
                        <div className="form-control w-full">
                            <input
                                type="text"
                                placeholder="Reason/Note..."
                                className="input input-sm input-bordered input-warning w-full rounded-lg bg-warning/10"
                                value={data.reason || ''}
                                onChange={(e) => updateStudentField(student._id, 'reason', e.target.value)}
                            />
                        </div>
                    )}
                    {!data.status && !data.reason && (
                        <button
                            className="btn btn-xs btn-ghost text-base-content/50 hover:text-primary w-full border border-dashed border-base-content/20 hover:border-primary/50"
                            onClick={() => updateStudentField(student._id, 'reason', ' ')}
                        >
                            + Add Note
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Makeup Scheduled Class Card (shown on daily view)
const MakeupClassCard = ({ record }) => {
    return (
        <div className="card bg-info/10 border border-info/30 shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-50 rotate-12 group-hover:rotate-0 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-info/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="card-body p-5 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="badge badge-info badge-sm font-bold text-white shadow-sm">Makeup Class</div>
                </div>
                <h3 className="font-bold text-lg text-base-content/90">{record.studentName}</h3>
                <div className="text-sm text-base-content/70 mt-1 font-medium bg-base-100/50 inline-block px-2 py-1 rounded-md">
                    Original Date: {new Date(record.date).toLocaleDateString('en-GB')} <br />
                    <span className="text-info font-bold">{record.makeupTime && `Time: ${record.makeupTime}`}</span>
                </div>
            </div>
        </div>
    );
};

const AttendancePage = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();

    const [activeTab, setActiveTab] = useState('daily');

    // API State
    const [students, setStudents] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Helper to get BDT Date components
    const getBDTNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));

    // Daily View State
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
        return d;
    });
    const [attendanceForm, setAttendanceForm] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [makeupRecords, setMakeupRecords] = useState([]);

    // Report View State
    const [month, setMonth] = useState(getBDTNow().getMonth());
    const [year, setYear] = useState(getBDTNow().getFullYear());
    const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

    // Makeup Modal State
    const [makeupModal, setMakeupModal] = useState({ open: false, studentId: null, date: '', time: '' });

    // Time slots
    const [timeSlots, setTimeSlots] = useState([]);

    // Fetch Students
    useEffect(() => {
        const fetchStudents = async () => {
            if (loading || !isAdmin()) return;
            try {
                const response = await fetch(`${API_BASE}/students/admin/students`);
                const data = await response.json();
                if (data.success) setStudents(data.students);
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };
        fetchStudents();
    }, [authLoading, isAdmin]);

    // Fetch Time Slots
    useEffect(() => {
        const fetchSlots = async () => {
            try {
                const response = await fetch(`${API_BASE}/timeslots`);
                const data = await response.json();
                if (data.success) setTimeSlots(data.slots);
            } catch (error) {
                console.error("Error fetching time slots:", error);
            }
        };
        fetchSlots();
    }, []);

    // Fetch Report
    useEffect(() => {
        const fetchReport = async () => {
            if (activeTab !== 'report' || !isAdmin()) return;
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE}/attendance/report?month=${month}&year=${year}`);
                const data = await response.json();
                if (data.success) setReportData(data.report);
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [activeTab, month, year, isAdmin]);

    // Fetch Daily Attendance on Date Change
    useEffect(() => {
        const fetchDailyAttendance = async () => {
            if (!selectedDate || !isAdmin()) return;
            try {
                const response = await fetch(`${API_BASE}/attendance/daily?date=${selectedDate}`);
                const data = await response.json();
                if (data.success) {
                    const map = {};
                    data.records.forEach(r => {
                        map[r.studentId] = {
                            status: r.status,
                            reason: r.reason,
                            classwork: r.classwork,
                            homework: r.homework,
                            makeupDate: r.makeupDate,
                            makeupTime: r.makeupTime
                        };
                    });
                    setAttendanceForm(map);
                    setMakeupRecords(data.makeupRecords || []);
                }
            } catch (error) {
                console.error("Error fetching daily:", error);
            }
        };
        fetchDailyAttendance();
    }, [selectedDate, isAdmin]);

    // Daily Logic
    const getScheduledStudents = () => {
        const dateObj = new Date(selectedDate);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

        const relevantStudents = students.filter(s =>
            (s.status !== 'inactive') &&
            (s.studentType === 'private' || !s.studentType)
        );

        return {
            scheduled: relevantStudents.filter(s => s.schedule?.includes(dayName)),
            others: relevantStudents.filter(s =>
                !s.schedule?.includes(dayName) &&
                s.username.toLowerCase().includes(searchTerm.toLowerCase())
            )
        };
    };

    // Toggle Logic for Status
    const updateStudentField = (id, field, value) => {
        setAttendanceForm(prev => {
            const currentStudentData = prev[id] || {};
            let newValue = value;

            if (field === 'status' && currentStudentData.status === value) {
                newValue = 'unmarked';
            }

            return {
                ...prev,
                [id]: { ...currentStudentData, [field]: newValue }
            };
        });
    };

    // Makeup Modal handlers
    const handleMakeupClick = (studentId) => {
        const existing = attendanceForm[studentId] || {};
        setMakeupModal({
            open: true,
            studentId,
            date: existing.makeupDate ? new Date(existing.makeupDate).toLocaleDateString('en-CA') : '',
            time: existing.makeupTime || ''
        });
    };

    const handleMakeupConfirm = () => {
        if (!makeupModal.date) {
            alert('Please select a makeup date');
            return;
        }

        setAttendanceForm(prev => ({
            ...prev,
            [makeupModal.studentId]: {
                ...(prev[makeupModal.studentId] || {}),
                status: 'makeup',
                makeupDate: makeupModal.date,
                makeupTime: makeupModal.time
            }
        }));

        setMakeupModal({ open: false, studentId: null, date: '', time: '' });
    };

    const handleMarkAttendance = async () => {
        setLoading(true);
        const payload = {
            date: selectedDate,
            students: Object.entries(attendanceForm).map(([id, data]) => ({
                studentId: id,
                status: data.status,
                reason: data.reason,
                classwork: data.classwork,
                homework: data.homework,
                makeupDate: data.makeupDate || null,
                makeupTime: data.makeupTime || ''
            })),
            classwork: "",
            homework: ""
        };

        try {
            const response = await fetch(`${API_BASE}/attendance/mark`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                alert('Attendance Marked!');
            } else {
                alert('Failed: ' + data.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error marking attendance');
        } finally {
            setLoading(false);
        }
    };

    if (!user || !isAdmin()) return null;

    const { scheduled, others } = getScheduledStudents();

    // Enrich makeup records with student names
    const enrichedMakeupRecords = makeupRecords.map(r => {
        const student = students.find(s => s._id === r.studentId?.toString() || s._id === r.studentId);
        return { ...r, studentName: student?.username || 'Unknown' };
    });

    return (
        <div className="min-h-screen bg-base-200 p-4 pb-24 md:p-8 font-['Hind_Siliguri']">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="navbar bg-base-100/60 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 px-6 py-4">
                    <div className="flex-1">
                        <a className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary cursor-pointer">Attendance Tracker</a>
                    </div>
                    <div className="flex-none gap-2">
                        <div className="tabs tabs-boxed bg-base-200/50 p-1 rounded-xl">
                            <a className={`tab px-6 rounded-lg transition-all ${activeTab === 'daily' ? 'tab-active bg-primary text-white shadow-md' : 'hover:bg-base-300'}`} onClick={() => setActiveTab('daily')}>Daily</a>
                            <a className={`tab px-6 rounded-lg transition-all ${activeTab === 'report' ? 'tab-active bg-primary text-white shadow-md' : 'hover:bg-base-300'}`} onClick={() => setActiveTab('report')}>Report</a>
                        </div>
                    </div>
                </div>

                {/* DAILY TAB */}
                {activeTab === 'daily' && (
                    <div className="space-y-8">
                        {/* Top Controls Bar */}
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-base-100 p-6 rounded-2xl shadow-xl border border-white/10">
                            <div className="flex items-center gap-6 w-full md:w-auto">
                                <div className="form-control w-full md:w-auto">
                                    <input
                                        type="date"
                                        className="input input-lg input-bordered font-mono bg-base-200/50 rounded-xl focus:outline-none focus:ring-2 ring-primary/50"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div className="hidden md:block h-12 w-px bg-base-300"></div>
                                <div className="text-2xl font-bold text-base-content/70 whitespace-nowrap">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary btn-lg w-full md:w-auto min-w-[200px] shadow-lg shadow-primary/30 rounded-xl hover:-translate-y-1 transition-transform"
                                onClick={handleMarkAttendance}
                                disabled={loading}
                            >
                                {loading ? <span className="loading loading-spinner"></span> : 'SAVE ATTENDANCE'}
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="stats shadow-lg w-full bg-base-100 border border-white/10 overflow-hidden">
                            <div className="stat hover:bg-base-200/50 transition-colors">
                                <div className="stat-title font-bold text-success/80">Present</div>
                                <div className="stat-value text-success">
                                    {Object.values(attendanceForm).filter(r => r.status === 'present').length}
                                </div>
                                <div className="stat-desc font-medium">Students present today</div>
                            </div>
                            <div className="stat hover:bg-base-200/50 transition-colors">
                                <div className="stat-title font-bold text-info/80">Makeup</div>
                                <div className="stat-value text-info">
                                    {Object.values(attendanceForm).filter(r => r.status === 'makeup').length}
                                </div>
                                <div className="stat-desc font-medium">Rescheduled classes</div>
                            </div>
                            <div className="stat hover:bg-base-200/50 transition-colors">
                                <div className="stat-title font-bold text-error/80">Absent</div>
                                <div className="stat-value text-error">
                                    {Object.values(attendanceForm).filter(r => r.status === 'absent').length}
                                </div>
                                <div className="stat-desc font-medium">Students absent</div>
                            </div>
                        </div>

                        {/* Makeup Classes Scheduled for Today */}
                        {enrichedMakeupRecords.length > 0 && (
                            <div className="animate-fade-in-up">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                                    <span className="badge badge-info badge-lg shadow-md">{enrichedMakeupRecords.length}</span>
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-info to-blue-500">Makeup Classes Today</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {enrichedMakeupRecords.map((record, i) => (
                                        <MakeupClassCard key={i} record={record} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Scheduled Section */}
                        <div className="animate-fade-in-up delay-100">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <span className="badge badge-primary badge-lg shadow-md">{scheduled.length}</span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Scheduled Today</span>
                            </h2>
                            {scheduled.length === 0 ? (
                                <div className="alert bg-base-100 shadow-md border-l-4 border-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <span>No students scheduled for this day. Relax!</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {scheduled.map(student => (
                                        <StudentCard
                                            key={student._id}
                                            student={student}
                                            attendanceForm={attendanceForm}
                                            updateStudentField={updateStudentField}
                                            onMakeupClick={handleMakeupClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Others Section */}
                        <div className="collapse collapse-arrow bg-base-100 shadow-lg rounded-2xl border border-white/10 overflow-hidden animate-fade-in-up delay-200">
                            <input type="checkbox" />
                            <div className="collapse-title text-xl font-bold p-6">
                                Show Other Students ({others.length})
                            </div>
                            <div className="collapse-content p-6 pt-0">
                                <div className="form-control mb-6">
                                    <input
                                        type="text"
                                        placeholder="Search student..."
                                        className="input input-lg input-bordered w-full rounded-xl focus:outline-none focus:ring-2 ring-primary/30"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {others.map(student => (
                                        <StudentCard
                                            key={student._id}
                                            student={student}
                                            attendanceForm={attendanceForm}
                                            updateStudentField={updateStudentField}
                                            onMakeupClick={handleMakeupClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* REPORT TAB */}
                {activeTab === 'report' && (
                    <div className="space-y-6">
                        <div className="flex justify-center gap-4 bg-base-100 p-6 rounded-2xl shadow-lg border border-white/10">
                            <select
                                className="select select-bordered select-lg rounded-xl w-full max-w-xs focus:ring-2 ring-primary/30"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                className="select select-bordered select-lg rounded-xl w-full max-w-xs focus:ring-2 ring-primary/30"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            >
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>

                        <div className="card bg-base-100 shadow-xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full text-center">
                                    <thead className="bg-base-200/80 backdrop-blur text-base-content/80 text-sm uppercase tracking-wide">
                                        <tr>
                                            <th className="text-left pl-8 py-4">Student</th>
                                            <th>Present</th>
                                            <th>Makeup</th>
                                            <th>Absent</th>
                                            <th>Attended / Expected</th>
                                            <th className="bg-primary/5">Extra Classes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-base">
                                        {loading ? (
                                            <tr><td colSpan="6" className="py-20"><span className="loading loading-spinner loading-lg text-primary"></span></td></tr>
                                        ) : reportData.map((data, idx) => (
                                            <tr
                                                key={idx}
                                                className="hover cursor-pointer transition-colors hover:bg-base-200/50"
                                                onClick={() => {
                                                    setSelectedStudentHistory(data);
                                                    document.getElementById('history_modal').showModal();
                                                }}
                                            >
                                                <td className="text-left pl-8 py-4">
                                                    <div className="font-bold text-lg">{data.student.username}</div>
                                                    {data.student.joinDate && (
                                                        <div className="text-xs text-base-content/40 font-mono">
                                                            Joined: {new Date(data.student.joinDate).toLocaleDateString('en-GB')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-success font-bold text-lg">{data.totalPresent}</td>
                                                <td className="text-info font-bold text-lg">{data.totalMakeup}</td>
                                                <td className="text-error font-bold text-lg">{data.totalAbsent}</td>
                                                <td className="font-bold text-lg">
                                                    {data.totalAttended} <span className="opacity-40 text-sm font-normal">/ {data.expectedClasses}</span>
                                                </td>
                                                <td className={`bg-primary/5 font-bold text-lg ${data.extraClasses >= 0 ? 'text-primary' : 'text-error'}`}>
                                                    {data.extraClasses > 0 ? `+${data.extraClasses}` : data.extraClasses < 0 ? `${data.extraClasses}` : '0'}
                                                </td>
                                            </tr>
                                        ))}
                                        {!loading && reportData.length === 0 && (
                                            <tr><td colSpan="6" className="py-12 opacity-50 text-lg">No records found for this month</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                <dialog id="history_modal" className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
                    <div className="modal-box bg-base-100 shadow-2xl rounded-2xl border border-white/10">
                        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                            <span className="text-primary">📜</span> Attendance History: <span className="text-base-content">{selectedStudentHistory?.student?.username}</span>
                        </h3>
                        <div className="overflow-y-auto max-h-96 custom-scrollbar pr-2">
                            <table className="table table-sm w-full">
                                <thead className="sticky top-0 bg-base-100 z-10">
                                    <tr>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Info</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudentHistory?.history?.length > 0 ? (
                                        selectedStudentHistory.history.map((record, i) => (
                                            <tr key={i} className="hover">
                                                <td className="font-mono">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                                                <td>
                                                    <span className={`badge badge-sm font-bold ${record.status === 'present' ? 'badge-success text-white' :
                                                        record.status === 'makeup' ? 'badge-info text-white' :
                                                            record.status === 'absent' ? 'badge-error text-white' :
                                                                record.status === 'late' ? 'badge-warning text-white' : 'badge-ghost'
                                                        }`}>
                                                        {record.status?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="text-xs max-w-[150px] truncate">
                                                    {record.status === 'makeup' && record.makeupDate && (
                                                        <div className="text-info font-bold">→ {new Date(record.makeupDate).toLocaleDateString('en-GB')}</div>
                                                    )}
                                                    {record.reason && <div className="opacity-70 italic truncate" title={record.reason}>{record.reason}</div>}
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        className="btn btn-xs btn-outline btn-primary rounded-md"
                                                        onClick={() => {
                                                            const targetDate = new Date(record.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
                                                            setSelectedDate(targetDate);
                                                            setActiveTab('daily');
                                                            document.getElementById('history_modal').close();
                                                        }}
                                                    >
                                                        EDIT
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center py-4 text-base-content/50">No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-action mt-6">
                            <form method="dialog">
                                <button className="btn rounded-xl">Close</button>
                            </form>
                        </div>
                    </div>
                </dialog>

                {/* Makeup Schedule Modal */}
                {makeupModal.open && (
                    <dialog className="modal modal-open backdrop-blur-sm">
                        <div className="modal-box bg-base-100 shadow-2xl rounded-2xl border border-white/10">
                            <h3 className="font-bold text-xl mb-2 flex items-center gap-2 text-info">
                                📅 Schedule Makeup Class
                            </h3>
                            <p className="text-sm text-base-content/60 mb-6">
                                কবে এবং কখন makeup class নেওয়া হবে সেটা সিলেক্ট করুন
                            </p>
                            <div className="space-y-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Makeup Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full rounded-xl"
                                        value={makeupModal.date}
                                        onChange={(e) => setMakeupModal(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold">Time Slot</span>
                                    </label>
                                    <select
                                        className="select select-bordered w-full rounded-xl"
                                        value={makeupModal.time}
                                        onChange={(e) => setMakeupModal(prev => ({ ...prev, time: e.target.value }))}
                                    >
                                        <option value="">Select Time</option>
                                        {timeSlots.map(slot => (
                                            <option key={slot._id} value={slot.label}>{slot.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-action mt-8">
                                <button
                                    className="btn rounded-xl"
                                    onClick={() => setMakeupModal({ open: false, studentId: null, date: '', time: '' })}
                                >Cancel</button>
                                <button
                                    className="btn btn-info text-white rounded-xl px-6 shadow-lg shadow-info/30"
                                    onClick={handleMakeupConfirm}
                                >Confirm Makeup</button>
                            </div>
                        </div>
                        <form method="dialog" className="modal-backdrop">
                            <button onClick={() => setMakeupModal({ open: false, studentId: null, date: '', time: '' })}>close</button>
                        </form>
                    </dialog>
                )}
            </div>
        </div >
    );
};

export default AttendancePage;
