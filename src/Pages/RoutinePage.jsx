import React, { useState, useEffect } from 'react';
import '@fontsource/anek-bangla'; // Defaults to weight 400
import '@fontsource/anek-bangla/700.css'; // Weight 700
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    const [isDownloading, setIsDownloading] = useState(false);

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

    const handleDownloadPDF = async () => {
        const input = document.getElementById('routine-content');
        if (!input) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(input, {
                scale: 4, // Higher resolution for sharper text
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 1280, // Force desktop viewport
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('routine-content');
                    if (clonedElement) {
                        // Force the width to be wide enough for the table
                        clonedElement.style.width = '1000px';
                        clonedElement.style.padding = '20px';

                        // Explicitly fix header text sizes to prevent "explosion"
                        const title = clonedElement.querySelector('h1');
                        if (title) {
                            title.style.fontSize = '24px'; // Fixed size
                            title.style.lineHeight = '1.2';
                            title.style.marginBottom = '5px';
                            title.style.letterSpacing = 'normal';
                        }
                        const subtitle = clonedElement.querySelector('h2');
                        if (subtitle) {
                            subtitle.style.fontSize = '18px'; // Fixed size
                            subtitle.style.marginTop = '0';
                        }

                        // Fix logo size in PDF
                        const logo = clonedElement.querySelector('img');
                        if (logo) {
                            logo.style.height = '60px';
                            logo.style.width = 'auto';
                        }

                        // Ensure the overflow container is visible
                        const overflowContainer = clonedElement.querySelector('.overflow-x-auto');
                        if (overflowContainer) {
                            overflowContainer.style.overflow = 'visible';
                            overflowContainer.style.width = '100%';
                        }
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            // Use Landscape ('l') for better fit of wide tables
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            // Center the image
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = (pdfHeight - imgHeight * ratio) / 2;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save('HMT_Routine.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

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
            {/* Controls */}
            <div className="max-w-7xl mx-auto mb-4 flex justify-end">
                <button
                    onClick={handleDownloadPDF}
                    className="btn btn-primary btn-sm sm:btn-md shadow-lg gap-2 text-white font-bold"
                    disabled={isDownloading}
                >
                    {isDownloading ? (
                        <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Generating PDF...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Routine
                        </>
                    )}
                </button>
            </div>

            <div id="routine-content" className="max-w-7xl mx-auto shadow-sm p-2 sm:p-4" style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: '1px', borderStyle: 'solid', color: '#000000' }}>
                {/* Header Section */}
                <div className="p-4 relative flex flex-col md:flex-row items-center justify-center gap-4" style={{ borderColor: '#000000', borderBottomWidth: '0px', borderWidth: '1px', borderStyle: 'solid' }}>
                    {/* Logo */}
                    <div className="md:absolute md:left-4">
                        <img src="/HMT Logo.png" alt="H.M. Tutoring Logo" className="h-14 sm:h-20 w-auto object-contain" />
                    </div>

                    {/* Centered Text */}
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest" style={{ color: '#111827', fontWeight: '900' }}>H.M. TUTORING</h1>
                        <h2 className="text-lg sm:text-xl font-bold underline decoration-2 underline-offset-8 mt-2" style={{ color: '#1f2937', fontWeight: '700' }}>শ্রেণি সময়সূচি</h2>
                    </div>
                </div>

                {/* Table Container for Responsiveness */}
                <div className="overflow-x-auto w-full" style={{ borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid' }}>
                    <table className="w-full border-collapse text-center table-fixed min-w-[800px]">
                        <thead>
                            {/* Day / Bar Row */}
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th className="p-2 w-[110px] sm:w-[160px] font-black text-sm sm:text-base align-middle sticky left-0 z-20" style={{ backgroundColor: '#f3f4f6', borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid', color: '#000000' }}>সময়</th>
                                <th colSpan={7} className="p-0" style={{ borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid' }}>
                                    <div className="p-2 font-black text-sm sm:text-base uppercase tracking-tighter sm:tracking-normal" style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000000', color: '#000000' }}>বার / দিন</div>
                                    <div className="grid grid-cols-7 divide-x" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                        {days.map(day => (
                                            <div key={day} className="p-2 font-black text-xs sm:text-sm" style={{ borderRight: '1px solid #000000', color: '#000000' }}>{dayMapping[day]}</div>
                                        ))}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedSlots.map((group, groupIndex) => {
                                const lastSlot = group.slots.reduce((prev, curr) => parseEndTime(curr.label) > parseEndTime(prev.label) ? curr : prev, group.slots[0]);
                                const firstSlot = group.slots[0];

                                const startStr = firstSlot.label.split(' - ')[0];
                                const endStr = lastSlot.label.split(' - ')[1];
                                const rowLabel = `${startStr} - ${endStr}`;

                                return (
                                    <tr key={groupIndex} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-2 font-black text-xs sm:text-sm whitespace-nowrap align-middle sticky left-0 z-10" style={{ backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid', color: '#000000' }}>
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
                                                <td key={`${day}-${groupIndex}`} className="p-1 align-middle h-16 min-w-[100px]" style={{ borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid' }}>
                                                    <div className="flex flex-col gap-1.5 items-center justify-center">
                                                        {studentsInGroup.map(student => (
                                                            <div key={student._id} className="text-[11px] sm:text-xs font-bold leading-tight flex flex-col items-center group/item cursor-help" style={{ color: '#000000' }}>
                                                                <span>{student.username}</span>
                                                                {group.slots.length > 1 && (
                                                                    <span className="text-[9px] font-medium whitespace-nowrap mt-0.5" style={{ color: '#6b7280' }}>
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
                <div className="mt-2 text-right font-bold text-xs" style={{ color: '#000000' }}>
                    Effective From: {currentDate}
                </div>
            </div>
        </div>
    );
};

export default RoutinePage;
