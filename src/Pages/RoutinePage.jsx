import React, { useState, useEffect } from 'react';
import '@fontsource/anek-bangla'; // Defaults to weight 400
import '@fontsource/anek-bangla/700.css'; // Weight 700
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// ... (helpers remain same)

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

import { useAuth } from '../Context/AuthContext';

const RoutinePage = () => {
    const { user } = useAuth();
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

    // Redirect inactive students
    useEffect(() => {
        if (user && !user.isAdmin && user.status && user.status.toLowerCase() === 'inactive') {
            window.location.href = '/'; // Simple redirect to home
        }
    }, [user]);

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
            // 1. Create a deep clone of the element
            const clone = input.cloneNode(true);

            // 2. Create a wrapper to hold the clone off-screen but rendered
            // We need it in the DOM for html-to-image to work correctly with styles/fonts
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.style.width = '1200px'; // Force Desktop Width
            wrapper.style.backgroundColor = '#ffffff'; // Ensure white background
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // 3. Enforce Desktop Styles on the Clone
            // Fix Header Layout (Force Row instead of Column)
            const header = clone.querySelector('#print-header');
            if (header) {
                header.style.position = 'relative';
                header.style.width = '100%';
                header.style.height = '120px'; // Give explicit height
                header.style.display = 'flex';
                header.style.flexDirection = 'row';
                header.style.justifyContent = 'center'; // Center text content
                header.style.alignItems = 'center';
                header.style.borderBottomWidth = '0px';
            }

            // Fix Logo Positioning (Force Absolute Left)
            const logoWrapper = clone.querySelector('#print-logo');
            if (logoWrapper) {
                logoWrapper.style.setProperty('position', 'absolute', 'important');
                logoWrapper.style.setProperty('left', '20px', 'important');
                logoWrapper.style.setProperty('top', '50%', 'important');
                logoWrapper.style.setProperty('transform', 'translateY(-50%)', 'important');
                logoWrapper.style.setProperty('margin', '0', 'important');
                logoWrapper.style.zIndex = '10';
            }

            // Fix Centered Text Container
            const textContainer = clone.querySelector('.text-center');
            if (textContainer) {
                textContainer.style.textAlign = 'center';
                textContainer.style.width = '100%';
                textContainer.style.position = 'relative';
                textContainer.style.zIndex = '1';

                // Force H1 to be visible in PDF even if hidden on mobile
                const h1 = textContainer.querySelector('h1');
                if (h1) {
                    h1.style.display = 'block';
                    h1.style.fontSize = '30px'; // Ensure desktop size
                }
            }

            // Fix Main Content Container
            clone.style.width = '100%';
            clone.style.maxWidth = 'none';
            clone.style.padding = '20px';
            clone.style.boxSizing = 'border-box';
            clone.style.display = 'flex';
            clone.style.flexDirection = 'column';
            clone.style.alignItems = 'center';

            // Ensure Table is full width and centered
            const tableContainer = clone.querySelector('.overflow-x-auto');
            if (tableContainer) {
                tableContainer.style.overflow = 'visible';
                tableContainer.style.width = '100%';
                tableContainer.style.display = 'flex';
                tableContainer.style.justifyContent = 'center';
            }
            const table = clone.querySelector('table');
            if (table) {
                table.style.margin = '0 auto';
                table.style.width = '100%';
            }

            // 4. Capture the Clone
            // Force a small delay to ensure rendering matches
            await new Promise(r => setTimeout(r, 100));

            const dataUrl = await toPng(clone, {
                quality: 1,
                pixelRatio: 3, // Balance quality/size
                width: 1200,   // Explicitly tell toPng the width
                style: {
                    margin: '0',
                    padding: '0',
                },
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            // 5. Clean up
            document.body.removeChild(wrapper);

            // 6. Generate PDF
            // Use Landscape ('l') for better fit of wide tables
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const img = new Image();
            img.src = dataUrl;
            await new Promise(r => img.onload = r);

            const imgWidth = img.width;
            const imgHeight = img.height;

            // Calculate ratio to fit within margins (5mm horizontal, 5mm vertical total for buffer)
            const margin = 5;
            const usableWidth = pdfWidth - (margin * 2);
            const usableHeight = pdfHeight - (margin * 2);

            const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);

            // Center the image
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = (pdfHeight - imgHeight * ratio) / 2;

            pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save('HMT_Routine.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
            // Try to clean up wrapper if error occurred before cleanup
            const existingWrapper = document.querySelector('div[style*="left: -9999px"]');
            if (existingWrapper) document.body.removeChild(existingWrapper);
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
                <div id="print-header" className="p-4 relative flex flex-col md:flex-row items-center justify-center gap-4" style={{ borderColor: '#000000', borderBottomWidth: '0px', borderWidth: '1px', borderStyle: 'solid' }}>
                    {/* Logo */}
                    <div id="print-logo" className="md:absolute md:left-4">
                        <img src="/HMT Logo.png" alt="H.M. Tutoring Logo" className="h-14 sm:h-20 w-auto object-contain" crossOrigin="anonymous" />
                    </div>

                    {/* Centered Text */}
                    <div className="text-center">
                        <h1 className="hidden sm:block text-2xl sm:text-3xl font-black uppercase tracking-widest" style={{ color: '#111827', fontWeight: '900' }}>H.M. TUTORING</h1>
                        <h2 className="text-lg sm:text-xl font-bold underline decoration-2 underline-offset-8 mt-2" style={{ color: '#1f2937', fontWeight: '700' }}>শ্রেণি সময়সূচি</h2>
                    </div>
                </div>

                {/* Table Container for Responsiveness */}
                <div className="overflow-x-auto w-full" style={{ borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid' }}>
                    <table className="w-full border-collapse text-center table-fixed min-w-[800px]">
                        <thead>
                            {/* Day / Bar Row */}
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th className="p-2 w-[110px] sm:w-[200px] font-black text-sm sm:text-base align-middle sticky left-0 z-20" style={{ backgroundColor: '#f3f4f6', borderColor: '#000000', borderWidth: '1px', borderStyle: 'solid', color: '#000000' }}>সময়</th>
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
                                                const matches = students.filter(s =>
                                                    s.routine &&
                                                    s.routine[day] === slot.label &&
                                                    (!s.status || s.status.toLowerCase() === 'active') // Ensure only active (or legitimate legacy)
                                                );
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
