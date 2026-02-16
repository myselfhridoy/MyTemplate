import React, { useEffect, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import AttendanceCalendar from './Dashboard/AttendanceCalendar';

const ProfilePage = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user._id) {
            const fetchSummary = async () => {
                try {
                    const response = await fetch(`https://geminiai-render.onrender.com/api/attendance/summary/${user._id}`);
                    const data = await response.json();
                    if (data.success) {
                        setSummary(data.summary);
                    }
                } catch (error) {
                    console.error("Error fetching summary:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSummary();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user) return <div className="p-10 text-center">Please login to view profile.</div>;

    return (
        <div className="container mx-auto max-w-4xl py-10 px-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
            <h1 className="text-3xl font-bold text-center mb-8">আমার প্রোফাইল</h1>

            {/* Profile Card */}
            <div className="card bg-base-100 shadow-xl border border-base-200 mb-8">
                <div className="card-body flex flex-col md:flex-row items-center gap-6">
                    <div className="avatar">
                        <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <img src="https://img.icons8.com/3d-fluency/94/student-male--v3.png" alt="avatar" />
                        </div>
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="card-title text-2xl justify-center md:justify-start">{user.username}</h2>
                        <p className="text-base-content/70">{user.email || 'No email provided'}</p>
                        <div className="badge badge-primary mt-2">{user.isAdmin ? 'Admin' : 'Student'}</div>
                    </div>
                </div>
            </div>

            {/* Attendance Calendar */}
            {loading ? (
                <div className="text-center py-10"><span className="loading loading-spinner loading-lg"></span></div>
            ) : (
                summary?.attendanceHistory && (
                    <AttendanceCalendar history={summary.attendanceHistory} />
                )
            )}
        </div>
    );
};

export default ProfilePage;
