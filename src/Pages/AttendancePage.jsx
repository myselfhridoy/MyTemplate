import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
// import { useNavigate } from 'react-router-dom';

// Modern Card Component for Student
const StudentCard = ({ student, attendanceForm, updateStudentField }) => {
    const data = attendanceForm[student._id] || {};
    return (
        <div className="card bg-base-100 shadow-md border border-base-200 hover:shadow-lg transition-shadow">
            <div className="card-body p-5">
                {/* Header: Name, ID, Actions */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="card-title text-lg">{student.username}</h3>
                        <div className="badge badge-ghost badge-sm mt-1">{student.userid}</div>
                    </div>
                    <div className="join">
                        <button
                            className={`join-item btn btn-sm ${data.status === 'present' ? 'btn-success text-white' : 'btn-outline btn-success'}`}
                            onClick={() => updateStudentField(student._id, 'status', 'present')}
                        >P</button>
                        <button
                            className={`join-item btn btn-sm ${data.status === 'late' ? 'btn-warning text-white' : 'btn-outline btn-warning'}`}
                            onClick={() => updateStudentField(student._id, 'status', 'late')}
                        >L</button>
                        <button
                            className={`join-item btn btn-sm ${data.status === 'absent' ? 'btn-error text-white' : 'btn-outline btn-error'}`}
                            onClick={() => updateStudentField(student._id, 'status', 'absent')}
                        >A</button>
                    </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                    {/* Classwork */}
                    <div className="form-control w-full">
                        <input
                            type="text"
                            placeholder="Classwork"
                            className="input input-sm input-bordered w-full"
                            value={data.classwork || ''}
                            onChange={(e) => updateStudentField(student._id, 'classwork', e.target.value)}
                        />
                    </div>
                    {/* Homework */}
                    <div className="form-control w-full">
                        <input
                            type="text"
                            placeholder="Homework"
                            className="input input-sm input-bordered w-full"
                            value={data.homework || ''}
                            onChange={(e) => updateStudentField(student._id, 'homework', e.target.value)}
                        />
                    </div>
                    {/* Note/Reason */}
                    {(data.status === 'absent' || data.status === 'late' || data.reason) && (
                        <div className="form-control w-full">
                            <input
                                type="text"
                                placeholder="Reason/Note..."
                                className="input input-sm input-bordered input-warning w-full"
                                value={data.reason || ''}
                                onChange={(e) => updateStudentField(student._id, 'reason', e.target.value)}
                            />
                        </div>
                    )}
                    {!data.status && !data.reason && (
                        <button
                            className="btn btn-xs btn-ghost text-base-content/50 hover:text-base-content w-full"
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

const AttendancePage = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    // const navigate = useNavigate(); // Removed unused

    // Tabs: 'daily' (Mark) | 'report' (Monthly)
    const [activeTab, setActiveTab] = useState('daily');

    // API State
    const [students, setStudents] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Helper to get BDT Date components
    const getBDTNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));

    // Daily View State
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); // "YYYY-MM-DD"
        return d;
    });
    const [attendanceForm, setAttendanceForm] = useState({}); // { studentId: { status, cw, hw } }
    const [searchTerm, setSearchTerm] = useState('');

    // Report View State
    const [month, setMonth] = useState(getBDTNow().getMonth()); // 0-11
    const [year, setYear] = useState(getBDTNow().getFullYear());
    const [selectedStudentHistory, setSelectedStudentHistory] = useState(null);

    // Fetch Students
    useEffect(() => {
        const fetchStudents = async () => {
            if (loading || !isAdmin()) return;
            try {
                const response = await fetch('https://geminiai-render.onrender.com/api/students/admin/students');
                const data = await response.json();
                if (data.success) {
                    setStudents(data.students);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };
        fetchStudents();
    }, [authLoading, isAdmin]);

    // Fetch Report
    useEffect(() => {
        const fetchReport = async () => {
            if (activeTab !== 'report' || !isAdmin()) return;
            setLoading(true);
            try {
                const response = await fetch(`https://geminiai-render.onrender.com/api/attendance/report?month=${month}&year=${year}`);
                const data = await response.json();
                if (data.success) {
                    setReportData(data.report); // Ensure the backend returns { success: true, report: [...] }
                }
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
            // Don't set global loading here to avoid full screen flicker, maybe local loading?
            // For now, simple fetch
            try {
                const response = await fetch(`https://geminiai-render.onrender.com/api/attendance/daily?date=${selectedDate}`);
                const data = await response.json();
                if (data.success) {
                    // Convert array to object map
                    const map = {};
                    data.records.forEach(r => {
                        map[r.studentId] = {
                            status: r.status,
                            reason: r.reason,
                            classwork: r.classwork,
                            homework: r.homework
                        };
                    });
                    setAttendanceForm(map);
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
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // "Sat", "Sun"

        // Filter: Active AND Private (or legacy undefined)
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

    // Helper to update specific field with Toggle Logic for Status
    const updateStudentField = (id, field, value) => {
        setAttendanceForm(prev => {
            const currentStudentData = prev[id] || {};
            let newValue = value;

            // TOGGLE LOGIC: If clicking the same status, uncheck it (set to 'unmarked')
            if (field === 'status' && currentStudentData.status === value) {
                newValue = 'unmarked';
            }

            return {
                ...prev,
                [id]: { ...currentStudentData, [field]: newValue }
            };
        });
    };

    const handleMarkAttendance = async () => {
        setLoading(true);
        // We need to send ALL changed records. 
        // For simplicity, we send the whole 'attendanceForm' state mapped.
        // But be careful: create-react-app might preserve old state keys? 
        // No, 'attendanceForm' is the source of truth for THIS date.

        const payload = {
            date: selectedDate,
            students: Object.entries(attendanceForm).map(([id, data]) => ({
                studentId: id,
                status: data.status, // Can be 'unmarked'
                reason: data.reason,
                classwork: data.classwork,
                homework: data.homework
            })),
            classwork: "",
            homework: ""
        };



        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                alert('Attendance Marked!');
                // setAttendanceForm({}); // DO NOT Reset, keep the view
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

    // Modern Card Component for Student


    return (
        <div className="min-h-screen bg-base-200 p-4 pb-24 md:p-8 font-['Outfit']">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="navbar bg-base-100 rounded-box shadow-sm">
                    <div className="flex-1">
                        <a className="btn btn-ghost text-xl">Attendance Tracker</a>
                    </div>
                    <div className="flex-none gap-2">
                        <div className="tabs tabs-boxed bg-base-200">
                            <a className={`tab ${activeTab === 'daily' ? 'tab-active' : ''}`} onClick={() => setActiveTab('daily')}>Daily</a>
                            <a className={`tab ${activeTab === 'report' ? 'tab-active' : ''}`} onClick={() => setActiveTab('report')}>Report</a>
                        </div>
                    </div>
                </div>

                {/* DAILY TAB */}
                {activeTab === 'daily' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Sticky Sidebar for PC */}
                        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 h-fit">
                            <div className="card bg-base-100 shadow-sm p-4">
                                <h3 className="text-sm font-bold uppercase text-base-content/60 mb-2">Controls</h3>
                                <input
                                    type="date"
                                    className="input input-bordered w-full font-mono"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                                <div className="mt-2 text-center text-sm font-bold text-primary">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}
                                </div>
                                <button
                                    className="btn btn-primary w-full mt-4 shadow-xl"
                                    onClick={handleMarkAttendance}
                                    disabled={loading}
                                >
                                    {loading ? <span className="loading loading-spinner"></span> : 'SAVE ALL'}
                                </button>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="stats shadow w-full bg-base-100">
                                <div className="stat">
                                    <div className="stat-title text-success font-bold">Present</div>
                                    <div className="stat-value text-success">
                                        {Object.values(attendanceForm).filter(r => r.status === 'present').length}
                                    </div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title text-error font-bold">Absent</div>
                                    <div className="stat-value text-error">
                                        {Object.values(attendanceForm).filter(r => r.status === 'absent').length}
                                    </div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title text-warning font-bold">Late</div>
                                    <div className="stat-value text-warning">
                                        {Object.values(attendanceForm).filter(r => r.status === 'late').length}
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Section */}
                            <div>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <span className="badge badge-primary badge-lg">{scheduled.length}</span>
                                    Scheduled Today
                                </h2>
                                {scheduled.length === 0 ? (
                                    <div className="alert">No students scheduled for this day.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {scheduled.map(student => (
                                            <StudentCard key={student._id} student={student} attendanceForm={attendanceForm} updateStudentField={updateStudentField} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Others Section */}
                            <div className="collapse collapse-arrow bg-base-100 shadow-sm rounded-box">
                                <input type="checkbox" />
                                <div className="collapse-title text-lg font-medium">
                                    Show Other Students ({others.length})
                                </div>
                                <div className="collapse-content">
                                    <div className="form-control mb-4">
                                        <input
                                            type="text"
                                            placeholder="Search student..."
                                            className="input input-bordered w-full"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {others.map(student => (
                                            <StudentCard key={student._id} student={student} attendanceForm={attendanceForm} updateStudentField={updateStudentField} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* REPORT TAB */}
                {activeTab === 'report' && (
                    <div className="space-y-4">
                        <div className="flex justify-center gap-4 bg-base-100 p-4 rounded-xl shadow-sm">
                            <select
                                className="select select-bordered"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                className="select select-bordered"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>

                        <div className="card bg-base-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full text-center">
                                    <thead className="bg-base-200">
                                        <tr>
                                            <th className="text-left pl-6">Student</th>
                                            <th>Present</th>
                                            <th>Late</th>
                                            <th>Absent</th>
                                            <th>Total Classes</th>
                                            <th className="bg-primary/10">Extra Classes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="py-10"><span className="loading loading-spinner"></span></td></tr>
                                        ) : reportData.map((data, idx) => (
                                            <tr
                                                key={idx}
                                                className="hover cursor-pointer"
                                                onClick={() => {
                                                    setSelectedStudentHistory(data);
                                                    document.getElementById('history_modal').showModal();
                                                }}
                                            >
                                                <td className="text-left pl-6 font-bold">{data.student.username}</td>
                                                <td className="text-success">{data.totalPresent}</td>
                                                <td className="text-warning">{data.totalLate}</td>
                                                <td className="text-error">{data.totalAbsent}</td>
                                                <td className="font-bold">{data.totalAttended} <span className="opacity-50 text-xs font-normal">/ {data.expectedClasses}</span></td>
                                                <td className="bg-primary/5 font-bold text-primary">
                                                    {data.extraClasses > 0 ? `+${data.extraClasses}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {!loading && reportData.length === 0 && (
                                            <tr><td colSpan="6" className="py-8 opacity-50">No records found for this month</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                <dialog id="history_modal" className="modal">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">
                            Attendance History: {selectedStudentHistory?.student?.username}
                        </h3>
                        <div className="overflow-y-auto max-h-96">
                            <table className="table table-xs w-full">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudentHistory?.history?.length > 0 ? (
                                        selectedStudentHistory.history.map((record, i) => (
                                            <tr key={i}>
                                                <td>{new Date(record.date).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`badge badge-sm ${record.status === 'present' ? 'badge-success' :
                                                        record.status === 'late' ? 'badge-warning' : 'badge-error'
                                                        }`}>
                                                        {record.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-xs btn-error btn-outline"
                                                        onClick={() => {
                                                            // Close modal, set date, switch to daily
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
                                        <tr><td colSpan="3" className="text-center">No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-action">
                            <form method="dialog">
                                <button className="btn">Close</button>
                            </form>
                        </div>
                    </div>
                </dialog>
            </div>
        </div>
    );
};

export default AttendancePage;
