import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
    const { user, isAdmin, logout, loading } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [newStudent, setNewStudent] = useState({ username: '', email: '', password: '', userid: '' });
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
            schedule: Object.keys(routine)
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
                setNewStudent({ username: '', email: '', password: '' });
                setNewStudent({ username: '', email: '', password: '', userid: '' }); // Reset userid
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
        <div className="min-h-screen bg-base-200 p-4 md:p-12 pb-24">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-base-100 p-4 md:p-6 rounded-2xl shadow-sm gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-primary text-3xl">🛡️</span> Admin Dashboard
                        </h1>
                        <p className="text-base-content/60 text-sm mt-1">Manage your students and contents</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0">
                        <div className="text-left md:text-right mr-2">
                            <p className="font-bold text-sm">{user.username}</p>
                            <p className="text-xs text-base-content/50">Administrator</p>
                        </div>
                        <button onClick={logout} className="btn btn-ghost hover:bg-error/10 hover:text-error btn-circle" title="Logout">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="stats shadow bg-base-100 w-full">
                        <div className="stat">
                            <div className="stat-figure text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            </div>
                            <div className="stat-title">Total Students</div>
                            <div className="stat-value text-primary">{students.length}</div>
                            <div className="stat-desc">Registered users</div>
                        </div>
                    </div>
                    {/* Add more stats here if needed */}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Student Form */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Create Student Form */}
                        <div className="card bg-base-100 shadow-sm border border-base-300">
                            <div className="card-body">
                                <h2 className="card-title text-lg mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                    Add New Student
                                </h2>
                                <form onSubmit={handleCreateStudent} className="space-y-4">
                                    {/* ... existing form ... */}
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium">Username</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. john_doe"
                                            className="input input-bordered focus:input-primary w-full"
                                            value={newStudent.username}
                                            onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium">Email</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="e.g. john@example.com"
                                            className="input input-bordered focus:input-primary w-full"
                                            value={newStudent.email}
                                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-medium">Password</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="******"
                                            className="input input-bordered focus:input-primary w-full"
                                            value={newStudent.password}
                                            onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="form-control">
                                            <label className="label"><span className="label-text">Type</span></label>
                                            <select
                                                className="select select-bordered w-full"
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
                                                className="select select-bordered w-full"
                                                value={newStudent.status || 'active'}
                                                onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Schedule Selector */}
                                    {(newStudent.studentType !== 'public') && (
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-medium">Schedule (Routine)</span>
                                            </label>
                                            <div className="flex flex-col gap-2">
                                                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                                                    <div key={day} className="flex items-center gap-2">
                                                        <label className="cursor-pointer label border rounded-lg hover:bg-base-200 px-2 py-1 flex-1">
                                                            <span className="label-text mr-2">{day}</span>
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
                                                                className="select select-bordered select-xs w-full max-w-xs"
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
                                        <button className="btn btn-primary w-full" disabled={isLoading}>
                                            {isLoading ? <span className="loading loading-spinner"></span> : 'Create Student'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Manage Time Slots */}
                        <div className="card bg-base-100 shadow-sm border border-base-300">
                            <div className="card-body">
                                <h2 className="card-title text-lg mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Manage Time Slots
                                </h2>
                                <form onSubmit={handleCreateTimeSlot} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. 5:00 PM - 6:00 PM"
                                        className="input input-bordered input-sm flex-1"
                                        value={newTimeSlot}
                                        onChange={(e) => setNewTimeSlot(e.target.value)}
                                        required
                                    />
                                    <button className="btn btn-sm btn-secondary" disabled={isLoading}>Add</button>
                                </form>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {timeSlots.map(slot => (
                                        <div key={slot._id} className="badge badge-lg badge-outline gap-2 p-3">
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
                        <div className="card bg-base-100 shadow-sm border border-base-300 h-full">
                            <div className="card-body p-0">
                                <div className="p-6 border-b border-base-200 flex justify-between items-center">
                                    <h2 className="card-title text-lg">Student List</h2>
                                    <div className="badge badge-outline">{students.length} students</div>
                                </div>
                                <div className="overflow-x-auto h-[500px] overflow-y-auto">
                                    <table className="table table-zebra table-sm md:table-md w-full">
                                        <thead className="bg-base-200 sticky top-0 z-10">
                                            <tr>
                                                <th className="w-10">#</th>
                                                <th>User</th>
                                                <th>Type/Status</th>
                                                <th>Schedule</th>
                                                <th className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map((student, index) => (
                                                <tr key={index} className="hover">
                                                    <td className="font-mono text-xs opacity-50">{index + 1}</td>
                                                    <td className="font-medium text-sm md:text-base">
                                                        <div className="flex items-center gap-2">
                                                            <div className="avatar placeholder hidden sm:inline-flex">
                                                                <div className="bg-neutral text-neutral-content rounded-full w-8">
                                                                    <span className="text-xs">{student.username.substring(0, 2).toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span>{student.username}</span>
                                                                <span className="text-[10px] text-base-content/50">{student.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col gap-1">
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
                                                                {student.schedule.map(d => <span key={d} className="badge badge-xs badge-ghost">{d}</span>)}
                                                            </div>
                                                        ) : <span className="opacity-30">-</span>}
                                                    </td>
                                                    <td className="text-right">
                                                        <button
                                                            className="btn btn-ghost btn-xs text-info"
                                                            onClick={() => handleEditClick(student)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-xs text-error ml-2"
                                                            onClick={() => handleDeleteStudent(student._id, student.username)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {students.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-10 text-base-content/50">
                                                        No students found. Add one from the left!
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
                    <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
                        <div>
                            <span>{toast.message}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <dialog id="edit_student_modal" className="modal">
                <div className="modal-box">
                    <h3 className="font-bold text-lg">Edit Student</h3>
                    {editingStudent && (
                        <form onSubmit={handleUpdateStudent} className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Username</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editingStudent.username}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Email</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="input input-bordered w-full"
                                        value={editingStudent.email}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-control col-span-2 md:col-span-1">
                                    <label className="label">
                                        <span className="label-text">Password (Leave blank to keep current)</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="New Password"
                                        value={editingStudent.password || ''}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label"><span className="label-text">Type</span></label>
                                    <select
                                        className="select select-bordered w-full"
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
                                        className="select select-bordered w-full"
                                        value={editingStudent.status || 'active'}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Schedule Selector in Edit */}
                            {(editingStudent.studentType !== 'public') && (
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-medium">Schedule (Routine)</span>
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                                            <div key={day} className="flex items-center gap-2">
                                                <label className="cursor-pointer label border rounded-lg hover:bg-base-200 px-2 py-1 flex-1">
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
                                                        className="select select-bordered select-xs w-full max-w-xs"
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
                                <button type="button" className="btn" onClick={() => document.getElementById('edit_student_modal').close()}>Cancel</button>
                                <button type="submit" className={`btn btn-primary ${isLoading ? 'loading' : ''}`} disabled={isLoading}>Update</button>
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
