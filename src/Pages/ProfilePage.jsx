import React, { useEffect, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import AttendanceCalendar from './Dashboard/AttendanceCalendar';
import { iOSCard as IOSCard } from '../Components/ios/iOSCard';
import IOSSpinner from '../Components/ios/iOSSpinner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    fetch(`https://geminiai-render.onrender.com/api/attendance/summary/${user._id}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Attendance request failed (${response.status}).`);
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          setSummary(data.summary);
          setError('');
        } else {
          setError(data.message || 'Attendance information could not be loaded.');
        }
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        console.error('Error fetching attendance summary:', requestError);
        setError('Attendance information could not be loaded. Please try again later.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [user]);

  if (!user) return null;
  const isAdmin = user.isAdmin || user.username === 'admin';
  const roleBadge = (
    <span className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
      isAdmin ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'
    }`}>
      {isAdmin ? 'Administrator' : 'Student'}
    </span>
  );
  const profileCard = React.createElement(
    IOSCard,
    null,
    <div className="p-5 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 mb-4">
        <img
          src={isAdmin
            ? 'https://img.icons8.com/3d-fluency/94/manager.png'
            : 'https://img.icons8.com/3d-fluency/94/student-male--v3.png'}
          alt="avatar"
          className="w-full h-full object-cover"
        />
      </div>
      <h2 className="ios-title-lg">{user.username}</h2>
      <p className="ios-subhead mt-1">{user.email || 'No email'}</p>
      {roleBadge}
    </div>
  );
  const noRecordsCard = React.createElement(
    IOSCard,
    { className: 'p-6 text-center' },
    <p className="text-base-content/50 text-sm">No attendance records yet</p>
  );

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        <h1 className="ios-title">Profile</h1>
        {profileCard}

        {!isAdmin && (
          <div>
            <h2 className="ios-headline mb-2 px-1">Attendance</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                {React.createElement(IOSSpinner, { size: 'lg' })}
              </div>
            ) : error ? (
              <div role="alert" className="text-sm text-error bg-error/10 rounded-lg p-3">
                {error}
              </div>
            ) : summary?.attendanceHistory?.length ? (
              <AttendanceCalendar history={summary.attendanceHistory} />
            ) : noRecordsCard}
          </div>
        )}
      </div>
    </div>
  );
}
