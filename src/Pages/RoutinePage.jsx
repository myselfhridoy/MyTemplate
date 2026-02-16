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
        <div className="bg-white text-black p-2 md:p-4 font-['Anek_Bangla']">
            <div className="max-w-full mx-auto">

                {/* Header Section */}
                <div className="border border-black border-b-0 p-2 relative">
                    {/* Logo on Left */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <img src="/HMT Logo.png" alt="H.M. Tutoring Logo" className="h-12 w-auto object-contain" />
                    </div>

                    {/* Centered Text */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold uppercase tracking-wide">H.M. TUTORING</h1>
                        <h2 className="text-lg font-bold underline decoration-1 underline-offset-4 mt-1">শ্রেণি সময়সূচি</h2>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-black text-center box-border">
                    <thead>
                        {/* Day / Bar Row */}
                        <tr>
                            <th className="border border-black p-1 w-[160px] bg-white font-bold text-base align-middle">সময়</th>
                            <th colSpan={7} className="border border-black p-0">
                                <div className="border-b border-black p-1 font-bold text-base">বার / দিন</div>
                                <div className="grid grid-cols-7 divide-x divide-black">
                                    {days.map(day => (
                                        <div key={day} className="p-1 font-bold text-sm">{dayMapping[day]}</div>
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
                                <tr key={groupIndex}>
                                    <td className="border border-black p-2 font-bold bg-white text-sm whitespace-nowrap align-middle">
                                        {group.slots.length > 1 ? (
                                            <div className="flex flex-col">
                                                <span>{rowLabel}</span>
                                                {/* Optional: Show breakdown if range is wide? No, clean is better. */}
                                            </div>
                                        ) : (
                                            group.slots[0].label
                                        )}
                                    </td>
                                    {days.map(day => {
                                        // Find students in ANY of the slots in this group for this day
                                        // But careful: we want to show specific time if it's not the full range?

                                        // Collect all students for this day across all slots in group
                                        const studentsInGroup = [];
                                        group.slots.forEach(slot => {
                                            const matches = students.filter(s => s.routine && s.routine[day] === slot.label);
                                            matches.forEach(s => studentsInGroup.push({ ...s, slotLabel: slot.label }));
                                        });

                                        return (
                                            <td key={`${day}-${groupIndex}`} className="border border-black p-1 align-middle h-12 w-[140px]">
                                                <div className="flex flex-col gap-1 items-center justify-center">
                                                    {studentsInGroup.map(student => (
                                                        <div key={student._id} className="text-xs font-bold leading-tight flex flex-col items-center">
                                                            <span>{student.username}</span>
                                                            {/* Show time ONLY if group has multiple slots OR if user wants precision */}
                                                            {group.slots.length > 1 && (
                                                                <span className="text-[10px] font-normal opacity-75 whitespace-nowrap">
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

                {/* Footer */}
                <div className="mt-2 text-right font-bold text-xs">
                    Effective From: {currentDate}
                </div>
            </div>
        </div>
    );
};

export default RoutinePage;
