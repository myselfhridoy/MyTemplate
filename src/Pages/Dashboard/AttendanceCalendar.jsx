import React, { useState, useEffect } from 'react';

const AttendanceCalendar = ({ history }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState({});
    const [activeTooltip, setActiveTooltip] = useState(null);

    useEffect(() => {
        if (history) {
            const s = {};
            history.forEach(h => {
                const dateStr = new Date(h.date).toISOString().split('T')[0];
                s[dateStr] = { status: h.status, reason: h.reason, makeupDate: h.makeupDate, makeupTime: h.makeupTime };
            });
            setStats(s);
        }
    }, [history]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year, month) => {
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
        setActiveTooltip(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setActiveTooltip(null);
    };

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = stats[dateStr];
        const status = record?.status;

        calendarDays.push(
            <div
                key={d}
                className="aspect-square p-0.5 relative group cursor-pointer hover:z-50"
                onClick={() => {
                    if (status) {
                        setActiveTooltip(activeTooltip === dateStr ? null : dateStr);
                    }
                }}
            >
                {status ? (
                    <div className={`w-full h-full flex items-center justify-center rounded-full shadow-sm text-xs font-bold transition-transform hover:scale-105 active:scale-95
                        ${status === 'present' ? 'bg-green-500 text-white shadow-green-200 dark:shadow-none' : ''}
                        ${status === 'late' ? 'bg-yellow-500 text-white shadow-yellow-200 dark:shadow-none' : ''}
                        ${status === 'makeup' ? 'bg-blue-500 text-white shadow-blue-200 dark:shadow-none' : ''}
                        ${status === 'absent' ? 'bg-red-500 text-white shadow-red-200 dark:shadow-none' : ''}
                     `}>
                        {d}
                        {/* Tooltip */}
                        <div className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg
                            ${activeTooltip === dateStr ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 md:group-hover:opacity-100'}
                        `}>
                            {status === 'present' && 'উপস্থিত'}
                            {status === 'late' && (record.reason ? `দেরি: ${record.reason}` : 'দেরি')}
                            {status === 'makeup' && (record.makeupDate ? `মেকাপ: ${new Date(record.makeupDate).toLocaleDateString('en-GB')}` : 'মেকাপ')}
                            {status === 'absent' && (record.reason ? `অনুপস্থিত: ${record.reason}` : 'অনুপস্থিত')}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-full hover:bg-base-200 transition-colors text-xs font-medium opacity-50">
                        {d}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-md border border-base-200 mb-8 max-w-sm mx-auto overflow-visible">
            <div className="card-body p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="card-title text-base">📅 উপস্থিতির ক্যালেন্ডার</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className="btn btn-xs btn-ghost btn-circle">❮</button>
                        <span className="font-bold text-sm min-w-[80px] text-center">{monthNames[month]} {year}</span>
                        <button onClick={nextMonth} className="btn btn-xs btn-ghost btn-circle">❯</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {daysOfWeek.map(day => (
                        <div key={day} className="text-[10px] font-bold opacity-50 uppercase tracking-wide">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays}
                </div>

                <div className="flex justify-center gap-4 mt-4 text-[10px] opacity-70">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div> উপস্থিত</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> মেকাপ</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> অনুপস্থিত</div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;
