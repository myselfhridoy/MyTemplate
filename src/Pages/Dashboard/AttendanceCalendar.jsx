import React, { useState, useEffect } from 'react';

const AttendanceCalendar = ({ history }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState({});

    // Map history to a date-key object for O(1) lookup
    // Key format: "YYYY-MM-DD"
    // Value: status
    useEffect(() => {
        if (history) {
            const s = {};
            history.forEach(h => {
                const dateStr = new Date(h.date).toISOString().split('T')[0];
                s[dateStr] = h.status;
            });
            setStats(s);
        }
    }, [history]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
        // 0 = Sun, 1 = Mon ... 6 = Sat
        return new Date(year, month, 1).getDay();
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // Generate calendar grid
    const calendarDays = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const status = stats[dateStr];
        if (status === 'present') {
            // content logic removed
        }

        calendarDays.push(
            <div key={d} className="aspect-square p-1 relative group cursor-default">
                {/* Only show day number if it has status, or maybe always show day number? 
                    User asked for "tick on days taught". 
                    Let's show day number unless it's a specialized icon, 
                    OR overlay the icon. 
                    Let's do: Circle background with Icon or Number.
                 */}
                {status ? (
                    <div className={`w-full h-full flex items-center justify-center rounded-lg shadow-sm
                        ${status === 'present' ? 'bg-green-500 text-white' : ''}
                        ${status === 'late' ? 'bg-yellow-500 text-white' : ''}
                        ${status === 'absent' ? 'bg-red-500 text-white' : ''}
                     `}>
                        {status === 'present' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        {status === 'late' && <span className="font-bold text-sm">L</span>}
                        {status === 'absent' && <span className="font-bold text-sm">✕</span>}

                        {/* Tooltip for date */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {d} {monthNames[month]}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-lg hover:bg-base-200 transition-colors text-sm font-medium opacity-70">
                        {d}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-xl border border-base-200 mb-8">
            <div className="card-body p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="card-title text-lg">📅 উপস্থিতির ক্যালেন্ডার</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="btn btn-sm btn-ghost btn-circle">❮</button>
                        <span className="font-bold min-w-[100px] text-center">{monthNames[month]} {year}</span>
                        <button onClick={nextMonth} className="btn btn-sm btn-ghost btn-circle">❯</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {daysOfWeek.map(day => (
                        <div key={day} className="text-xs font-bold opacity-50 uppercase tracking-wide">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays}
                </div>

                <div className="flex justify-center gap-6 mt-6 text-xs opacity-70">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> উপস্থিত</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> দেরি</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> অনুপস্থিত</div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;
