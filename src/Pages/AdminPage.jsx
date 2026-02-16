import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
    const { user, isAdmin, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [newStudent, setNewStudent] = useState({ username: '', email: '', password: '', userid: '', joinDate: '' });
    const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
    const [isLoading, setIsLoading] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null); // { _id, username, email, password }
    const [timeSlots, setTimeSlots] = useState([]);
    const [newTimeSlot, setNewTimeSlot] = useState('');
    const [routine, setRoutine] = useState({});

    // Protect Route
    useEffect(() => {
        if (!loading && !isAdmin()) {
            navigate('/login');
        }
    }, [user, navigate, isAdmin, loading]);

    const fetchStudents = async () => {
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

    const fetchTimeSlots = async () => {
        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/timeslots');
            const data = await response.json();
            if (data.success) setTimeSlots(data.slots);
        } catch (error) {
            console.error("Error fetching time slots:", error);
        }
    };

    useEffect(() => {
        if (isAdmin()) {
            fetchStudents();
            fetchTimeSlots();
        }
    }, [user, isAdmin]);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Default password is the User ID
        const studentPayload = {
            ...newStudent,
            password: newStudent.password, // Use actual password input
            routine,
            schedule: Object.keys(routine),
            joinDate: newStudent.joinDate || undefined
        };

        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/students/admin/create-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentPayload),
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', 'Student created successfully!');
                setNewStudent({ username: '', email: '', password: '', userid: '', joinDate: '' }); // Reset
                setRoutine({});
                fetchStudents();
            } else {
                showToast('error', data.message || 'Failed to create student');
            }
        } catch (error) {
            console.error("Error creating student:", error);
            showToast('error', 'Network error');
        } finally {
            setIsLoading(false);
        }
    };


    const handleDeleteStudent = async (id, username) => {
        if (!window.confirm(`Are you sure you want to delete student: ${username}?`)) return;

        setIsLoading(true);
        try {
            const response = await fetch(`https://geminiai-render.onrender.com/api/students/admin/delete-student/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', 'Student deleted successfully!');
                fetchStudents();
            } else {
                showToast('error', data.message || 'Failed to delete student');
            }
        } catch (error) {
            console.error("Error deleting student:", error);
            showToast('error', 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (student) => {
        // Backfill schedule if missing but routine exists
        let schedule = student.schedule;
        if ((!schedule || schedule.length === 0) && student.routine) {
            schedule = Object.keys(student.routine);
        }
        setEditingStudent({ ...student, schedule });
        // Open modal
        const modal = document.getElementById('edit_student_modal');
        if (modal) modal.showModal();
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/students/admin/update-student', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingStudent),
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', 'Student updated successfully!');
                fetchStudents();
                const modal = document.getElementById('edit_student_modal');
                if (modal) modal.close();
            } else {
                showToast('error', data.message || 'Failed to update student');
            }
        } catch (error) {
            console.error("Error updating student:", error);
            showToast('error', 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTimeSlot = async (e) => {
        e.preventDefault();
        if (!newTimeSlot.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/timeslots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: newTimeSlot }),
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', 'Time slot added successfully!');
                setNewTimeSlot('');
                fetchTimeSlots();
            } else {
                showToast('error', data.message || 'Failed to add time slot');
            }
        } catch (error) {
            console.error("Error adding time slot:", error);
            showToast('error', 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTimeSlot = async (id) => {
        if (!window.confirm('Are you sure you want to delete this time slot?')) return;
        setIsLoading(true);
        try {
            const response = await fetch(`https://geminiai-render.onrender.com/api/timeslots/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                showToast('success', 'Time slot deleted!');
                fetchTimeSlots();
            } else {
                showToast('error', data.message || 'Failed to delete time slot');
            }
        } catch (error) {
            console.error("Error deleting time slot:", error);
            showToast('error', 'Network error');
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!user || !isAdmin()) return null;

    return (
        <div className="min-h-screen bg-base-200 p-4 md:p-8 pb-24 font-['Hind_Siliguri']">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-base-100/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-white/20 gap-4 transition-all hover:shadow-xl">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            <span className="text-4xl">🛡️</span> Admin Dashboard
                        </h1>
                        <p className="text-base-content/60 text-sm mt-1 font-medium">Manage your students and content seamlessly</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                        <div className="text-left md:text-right mr-2 hidden sm:block">
                            <p className="font-bold text-sm text-base-content/80">{user.username}</p>
                            <div className="badge badge-primary badge-outline badge-xs">Administrator</div>
                        </div>
                        <button onClick={logout} className="btn btn-ghost hover:bg-error/10 hover:text-error btn-circle transition-all duration-300 transform hover:rotate-90" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="stats shadow-lg bg-gradient-to-br from-base-100 to-base-200 w-full border border-white/10 hover:-translate-y-1 transition-transform duration-300">
                        <div className="stat place-items-center">
                            <div className="stat-title font-semibold text-base-content/60">Total Students</div>
                            <div className="stat-value text-primary text-4xl mt-2">{students.length}</div>
                            <div className="stat-desc text-secondary">Registered users</div>
                        </div>
                    </div>
                    <div className="stats shadow-lg bg-gradient-to-br from-base-100 to-base-200 w-full border border-white/10 hover:-translate-y-1 transition-transform duration-300">
                        <div className="stat place-items-center">
                            <div className="stat-title font-semibold text-base-content/60">Active Students</div>
                            {/* Mock data for now, or calculate from list */}
                            <div className="stat-value text-secondary text-4xl mt-2">{students.filter(s => s.status !== 'inactive').length}</div>
                            <div className="stat-desc text-success">Currently learning</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Student Form */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Create Student Form */}
                        <div className="card bg-base-100 shadow-xl border border-white/20 overflow-hidden">
                            <div className="card-body">
                                <h2 className="card-title text-xl mb-6 flex items-center gap-2 text-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                    Add New Student
                                </h2>
                                <form onSubmit={handleCreateStudent} className="space-y-4">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium text-base-content/70">Username</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. john_doe"
                                            className="input input-bordered focus:input-primary w-full bg-base-200/50 rounded-xl"
                                            value={newStudent.username}
                                            onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium text-base-content/70">Email</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="e.g. john@example.com"
                                            className="input input-bordered focus:input-primary w-full bg-base-200/50 rounded-xl"
                                            value={newStudent.email}
                                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium text-base-content/70">Password</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="******"
                                            className="input input-bordered focus:input-primary w-full bg-base-200/50 rounded-xl"
                                            value={newStudent.password}
                                            onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">Type</span></label>
                                            <select
                                                className="select select-bordered w-full bg-base-200/50 rounded-xl"
                                                value={newStudent.studentType || 'private'}
                                                onChange={(e) => setNewStudent({ ...newStudent, studentType: e.target.value })}
                                            >
                                                <option value="private">Private</option>
                                                <option value="public">Public</option>
                                            </select>
                                        </div>
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">Status</span></label>
                                            <select
                                                className="select select-bordered w-full bg-base-200/50 rounded-xl"
                                                value={newStudent.status || 'active'}
                                                onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Join Date */}
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium">Join Date (optional)</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="input input-bordered w-full bg-base-200/50 rounded-xl"
                                            value={newStudent.joinDate || ''}
                                            onChange={(e) => setNewStudent({ ...newStudent, joinDate: e.target.value })}
                                        />
                                    </div>

                                    {/* Schedule Selector */}
                                    {(newStudent.studentType !== 'public') && (
                                        <div className="form-control bg-base-200/30 p-4 rounded-xl border border-base-300">
                                            <label className="label pt-0">
                                                <span className="label-text font-bold text-base-content/80">Schedule (Routine)</span>
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                                                    <div key={day} className="flex items-center gap-2">
                                                        <label className="cursor-pointer label border border-base-300 rounded-lg hover:bg-base-200 px-3 py-2 flex-1 transition-colors bg-base-100">
                                                            <span className="label-text mr-2 font-medium">{day}</span>
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-xs checkbox-primary"
                                                                checked={newStudent.schedule?.includes(day)}
                                                                onChange={(e) => {
                                                                    const current = newStudent.schedule || [];
                                                                    let newSchedule;
                                                                    let newRoutine = { ...routine };

                                                                    if (e.target.checked) {
                                                                        newSchedule = [...current, day];
                                                                    } else {
                                                                        newSchedule = current.filter(d => d !== day);
                                                                        delete newRoutine[day];
                                                                    }
                                                                    setNewStudent({ ...newStudent, schedule: newSchedule });
                                                                    setRoutine(newRoutine);
                                                                }}
                                                            />
                                                        </label>
                                                        {newStudent.schedule?.includes(day) && (
                                                            <select
                                                                className="select select-bordered select-xs w-full max-w-xs rounded-lg"
                                                                value={routine[day] || ''}
                                                                onChange={(e) => setRoutine({ ...routine, [day]: e.target.value })}
                                                            >
                                                                <option value="">Select Time</option>
                                                                {timeSlots.map(slot => (
                                                                    <option key={slot._id} value={slot.label}>{slot.label}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-control mt-6">
                                        <button className="btn btn-primary w-full shadow-lg shadow-primary/30 rounded-xl" disabled={isLoading}>
                                            {isLoading ? <span className="loading loading-spinner"></span> : 'Create Student'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Manage Time Slots */}
                        <div className="card bg-base-100 shadow-xl border border-white/20">
                            <div className="card-body">
                                <h2 className="card-title text-xl mb-4 flex items-center gap-2 text-secondary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Manage Time Slots
                                </h2>
                                <form onSubmit={handleCreateTimeSlot} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. 5:00 PM - 6:00 PM"
                                        className="input input-bordered input-sm flex-1 rounded-lg bg-base-200/50"
                                        value={newTimeSlot}
                                        onChange={(e) => setNewTimeSlot(e.target.value)}
                                        required
                                    />
                                    <button className="btn btn-sm btn-secondary rounded-lg" disabled={isLoading}>Add</button>
                                </form>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {timeSlots.map(slot => (
                                        <div key={slot._id} className="badge badge-lg badge-outline gap-2 p-3 rounded-lg border-secondary/30 text-secondary">
                                            {slot.label}
                                            <button
                                                onClick={() => handleDeleteTimeSlot(slot._id)}
                                                className="btn btn-ghost btn-xs btn-circle text-error h-5 w-5 min-h-0"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    {timeSlots.length === 0 && <span className="text-xs text-base-content/50 opacity-50">No slots added yet.</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student List */}
                    <div className="lg:col-span-2">
                        <div className="card bg-base-100 shadow-xl border border-white/20 h-full overflow-hidden">
                            <div className="card-body p-0">
                                <div className="p-6 border-b border-base-200 flex justify-between items-center bg-base-100/50 backdrop-blur-sm sticky top-0 z-20">
                                    <h2 className="card-title text-xl">Student List</h2>
                                    <div className="badge badge-primary badge-outline font-bold">{students.length} students</div>
                                </div>
                                <div className="overflow-x-auto h-[700px] overflow-y-auto custom-scrollbar">
                                    <table className="table table-zebra table-pin-rows w-full">
                                        <thead className="bg-base-200/80 backdrop-blur text-base-content">
                                            <tr>
                                                <th className="w-10 rounded-tl-xl">#</th>
                                                <th>User</th>
                                                <th>Type/Status</th>
                                                <th>Schedule</th>
                                                <th className="text-right rounded-tr-xl">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((student, index) => (
                                                <tr key={index} className="hover:bg-base-200/50 transition-colors">
                                                    <td className="font-mono text-xs opacity-50">{index + 1}</td>
                                                    <td className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="avatar placeholder hidden sm:inline-flex">
                                                                <div className="bg-gradient-to-tr from-neutral to-neutral-focus text-neutral-content rounded-xl w-10 shadow-sm">
                                                                    <span className="text-sm font-bold">{student.username.substring(0, 2).toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-base">{student.username}</span>
                                                                <span className="text-[11px] text-base-content/50 font-mono">{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span className={`badge badge-xs ${student.studentType === 'public' ? 'badge-ghost' : 'badge-primary'}`}>
                                                                {student.studentType || 'private'}
                                                            </span>
                                                            <span className={`badge badge-xs ${student.status === 'inactive' ? 'badge-error badge-outline' : 'badge-success badge-outline'}`}>
                                                                {student.status || 'active'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-xs">
                                                        {student.schedule && student.schedule.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {student.schedule.map(d => <span key={d} className="badge badge-sm badge-ghost bg-base-300 text-base-content/80 border-0">{d}</span>)}
                                                            </div>
                                                        ) : <span className="opacity-30 italic">No schedule</span>}
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="join">
                                                            <button
                                                                className="btn btn-ghost btn-sm join-item text-info hover:bg-info/10"
                                                                onClick={() => handleEditClick(student)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm join-item text-error hover:bg-error/10"
                                                                onClick={() => handleDeleteStudent(student._id, student.username)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-20 text-base-content/50">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                            <span>No students found. Add one to get started!</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="toast toast-end toast-bottom z-50">
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} shadow-2xl rounded-xl animate-bounce-short`}>
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            <span className="font-semibold">{toast.message}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <dialog id="edit_student_modal" className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
                <div className="modal-box w-11/12 max-w-2xl bg-base-100 shadow-2xl border border-white/10 rounded-2xl">
                    <h3 className="font-bold text-2xl mb-6">Edit Student</h3>
                    {editingStudent && (
                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Username</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full rounded-xl"
                                        value={editingStudent.username}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Email</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="input input-bordered w-full rounded-xl"
                                        value={editingStudent.email}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-medium">Password (Leave blank to keep current)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full rounded-xl"
                                        placeholder="New Password"
                                        value={editingStudent.password || ''}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Type</span></label>
                                    <select
                                        className="select select-bordered w-full rounded-xl"
                                        value={editingStudent.studentType || 'private'}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, studentType: e.target.value })}
                                    >
                                        <option value="private">Private</option>
                                        <option value="public">Public</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Status</span></label>
                                    <select
                                        className="select select-bordered w-full rounded-xl"
                                        value={editingStudent.status || 'active'}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Join Date in Edit */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-medium">Join Date</span>
                                </label>
                                <input
                                    type="date"
                                    className="input input-bordered w-full rounded-xl"
                                    value={editingStudent.joinDate ? new Date(editingStudent.joinDate).toLocaleDateString('en-CA') : ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, joinDate: e.target.value })}
                                />
                            </div>

                            {/* Schedule Selector in Edit */}
                            {(editingStudent.studentType !== 'public') && (
                                <div className="form-control bg-base-200/50 p-4 rounded-xl">
                                    <label className="label pt-0">
                                        <span className="label-text font-bold">Schedule (Routine)</span>
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                                            <div key={day} className="flex items-center gap-2">
                                                <label className="cursor-pointer label border border-base-300 rounded-lg hover:bg-base-100 px-2 py-1 flex-1 transition-colors">
                                                    <span className="label-text mr-2">{day}</span>
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-xs checkbox-primary"
                                                        checked={editingStudent.schedule?.includes(day)}
                                                        onChange={(e) => {
                                                            const current = editingStudent.schedule || [];
                                                            let newSchedule;
                                                            let newRoutine = { ...(editingStudent.routine || {}) };

                                                            if (e.target.checked) {
                                                                newSchedule = [...current, day];
                                                            } else {
                                                                newSchedule = current.filter(d => d !== day);
                                                                delete newRoutine[day]; // Remove time slot if day unchecked
                                                            }
                                                            setEditingStudent({ ...editingStudent, schedule: newSchedule, routine: newRoutine });
                                                        }}
                                                    />
                                                </label>
                                                {editingStudent.schedule?.includes(day) && (
                                                    <select
                                                        className="select select-bordered select-xs w-full max-w-xs rounded-lg"
                                                        value={editingStudent.routine?.[day] || ''}
                                                        onChange={(e) => {
                                                            setEditingStudent({
                                                                ...editingStudent,
                                                                routine: { ...(editingStudent.routine || {}), [day]: e.target.value }
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Select Time</option>
                                                        {timeSlots.map(slot => (
                                                            <option key={slot._id} value={slot.label}>{slot.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-action">
                                <button type="button" className="btn rounded-xl" onClick={() => document.getElementById('edit_student_modal').close()}>Cancel</button>
                                <button type="submit" className={`btn btn-primary rounded-xl px-8 ${isLoading ? 'loading' : ''}`} disabled={isLoading}>Update</button>
                            </div>
                        </form>
                    )}
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
};

export default AdminPage;
