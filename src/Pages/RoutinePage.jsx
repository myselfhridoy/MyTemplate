import React, { useState, useEffect } from 'react';
import '@fontsource/anek-bangla'; // Defaults to weight 400
import '@fontsource/anek-bangla/700.css'; // Weight 700

// Helper: Parse "4:30 PM - 5:30 PM" to minutes from midnight
const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(' - ');
    if (parts.length === 0) return 0;

    const parseSingle = (t) => {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    return parseSingle(parts[0]);
};

// Helper: Get end time in minutes
const parseEndTime = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(' - ');
    if (parts.length < 2) return parseTime(timeStr) + 60; // Default 1 hour if no range

    const parseSingle = (t) => {
        const [time, modifier] = t.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    return parseSingle(parts[1]);
};

const RoutinePage = () => {
    const [students, setStudents] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Mapping English days to Bengali
    const dayMapping = {
        'Sat': 'শনি',
        'Sun': 'রবি',
        'Mon': 'সোম',
        'Tue': 'মঙ্গল',
        'Wed': 'বুধ',
        'Thu': 'বৃহঃ',
        'Fri': 'শুক্র'
    };

    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsRes, slotsRes] = await Promise.all([
                    fetch('https://geminiai-render.onrender.com/api/students/public/routine'),
                    fetch('https://geminiai-render.onrender.com/api/timeslots')
                ]);
                const sData = await studentsRes.json();
                const tData = await slotsRes.json();

                if (sData.success) {
                    setStudents(sData.students);
                }
                if (tData.success) {
                    // Sort slots by start time
                    const sortedSlots = tData.slots.sort((a, b) => parseTime(a.label) - parseTime(b.label));
                    setTimeSlots(sortedSlots);
                }
            } catch (error) {
                console.error("Error fetching routine data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Group overlapping slots
    const groupedSlots = [];
    if (timeSlots.length > 0) {
        let currentGroup = {
            slots: [timeSlots[0]],
            start: parseTime(timeSlots[0].label),
            end: parseEndTime(timeSlots[0].label)
        };

        for (let i = 1; i < timeSlots.length; i++) {
            const slot = timeSlots[i];
            const slotStart = parseTime(slot.label);
            const slotEnd = parseEndTime(slot.label);

            // Access previous group's end time (max of all slots in group)
            if (slotStart < currentGroup.end) {
                // Overlap found, merge
                currentGroup.slots.push(slot);
                currentGroup.end = Math.max(currentGroup.end, slotEnd);
            } else {
                // No overlap, push current group and start a new one
                groupedSlots.push(currentGroup);
                currentGroup = {
                    slots: [slot],
                    start: slotStart,
                    end: slotEnd
                };
            }
        }
        groupedSlots.push(currentGroup);
    }

    if (isLoading) return <div className="min-h-screen flex items-center justify-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

    const currentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="bg-white text-black p-1 sm:p-4 font-['Anek_Bangla']">
            <div className="max-w-7xl mx-auto shadow-sm border border-black/10">

                {/* Header Section */}
                <div className="border border-black border-b-0 p-4 relative flex flex-col md:flex-row items-center justify-center gap-4">
                    {/* Logo */}
                    <div className="md:absolute md:left-4">
                        <img src="/HMT Logo.png" alt="H.M. Tutoring Logo" className="h-10 sm:h-14 w-auto object-contain" />
                    </div>

                    {/* Centered Text */}
                    <div className="text-center">
                        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-gray-900">H.M. TUTORING</h1>
                        <h2 className="text-base sm:text-lg font-bold underline decoration-2 underline-offset-8 mt-1 text-gray-800">শ্রেণি সময়সূচি</h2>
                    </div>
                </div>

                {/* Table Container for Responsiveness */}
                <div className="overflow-x-auto w-full border border-black">
                    <table className="w-full border-collapse text-center table-fixed min-w-[800px]">
                        <thead>
                            {/* Day / Bar Row */}
                            <tr className="bg-gray-50">
                                <th className="border border-black p-2 w-[110px] sm:w-[160px] bg-gray-100 font-black text-sm sm:text-base align-middle sticky left-0 z-20 shadow-[2px_0_0_0_rgba(0,0,0,1)]">সময়</th>
                                <th colSpan={7} className="border border-black p-0">
                                    <div className="border-b border-black p-2 font-black text-sm sm:text-base bg-gray-100 uppercase tracking-tighter sm:tracking-normal">বার / দিন</div>
                                    <div className="grid grid-cols-7 divide-x divide-black bg-white">
                                        {days.map(day => (
                                            <div key={day} className="p-2 font-black text-xs sm:text-sm">{dayMapping[day]}</div>
                                        ))}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedSlots.map((group, groupIndex) => {
                                // Determine row label
                                // Ideally show range: min(start) - max(end). 
                                // Or just list distinct labels if they are disparate?
                                // For simplicity, let's construct "Start - End" based on min start and max end
                                // But format back to string is complex.
                                // Easier: Just join the labels with <br/> or show the main label if 1 slot.
                                // Assuming "4:30 - 5:30" and "5:00 - 6:00" -> "4:30 PM - 6:00 PM"
                                // Let's rely on the first slot's start string and last slot's end string parts?
                                // Bit risky. Let's just list the labels, separated by commas or newlines?
                                // User wants it merged. "4:30 PM - 6:00 PM" is best.

                                // Reconstruct time string from minutes is hard without a formatter.
                                // Let's use the first slot's label start part and the slot with max end's label end part.
                                // Find slot with max end
                                const lastSlot = group.slots.reduce((prev, curr) => parseEndTime(curr.label) > parseEndTime(prev.label) ? curr : prev, group.slots[0]);
                                const firstSlot = group.slots[0]; // Already sorted by start

                                const startStr = firstSlot.label.split(' - ')[0];
                                const endStr = lastSlot.label.split(' - ')[1];
                                const rowLabel = `${startStr} - ${endStr}`;

                                return (
                                    <tr key={groupIndex} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="border border-black p-2 font-black bg-white text-xs sm:text-sm whitespace-nowrap align-middle sticky left-0 z-10 shadow-[2px_0_0_0_rgba(0,0,0,1)]">
                                            {group.slots.length > 1 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span>{rowLabel}</span>
                                                </div>
                                            ) : (
                                                <span>{group.slots[0].label}</span>
                                            )}
                                        </td>
                                        {days.map(day => {
                                            const studentsInGroup = [];
                                            group.slots.forEach(slot => {
                                                const matches = students.filter(s => s.routine && s.routine[day] === slot.label);
                                                matches.forEach(s => studentsInGroup.push({ ...s, slotLabel: slot.label }));
                                            });

                                            return (
                                                <td key={`${day}-${groupIndex}`} className="border border-black p-1 align-middle h-16 min-w-[100px]">
                                                    <div className="flex flex-col gap-1.5 items-center justify-center">
                                                        {studentsInGroup.map(student => (
                                                            <div key={student._id} className="text-[11px] sm:text-xs font-bold leading-tight flex flex-col items-center group/item cursor-help">
                                                                <span>{student.username}</span>
                                                                {group.slots.length > 1 && (
                                                                    <span className="text-[9px] font-medium text-gray-500 whitespace-nowrap mt-0.5">
                                                                        {student.slotLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-2 text-right font-bold text-xs">
                    Effective From: {currentDate}
                </div>
            </div>
        </div>
    );
};

export default RoutinePage;
