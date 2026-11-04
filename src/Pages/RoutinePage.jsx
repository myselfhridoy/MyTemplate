import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import IOSButton from '../Components/ios/iOSButton';
import IOSSpinner from '../Components/ios/iOSSpinner';
import '@fontsource/anek-bangla';
import '@fontsource/anek-bangla/700.css';

const API_BASE = 'https://geminiai-render.onrender.com/api';
const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_MAP = { Sat: 'শনি', Sun: 'রবি', Mon: 'সোম', Tue: 'মঙ্গল', Wed: 'বুধ', Thu: 'বৃহঃ', Fri: 'শুক্র' };

const parseTimeValue = (time) => {
    if (!time) return 0;
    const [clock, modifier] = time.trim().split(/\s+/);
    let [hours, minutes] = (clock || '').split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

const parseTime = (timeStr) => parseTimeValue(timeStr?.split(' - ')[0]);

const parseEndTime = (timeStr) => {
    const parts = timeStr?.split(' - ') || [];
    return parts.length < 2 ? parseTime(timeStr) + 60 : parseTimeValue(parts[1]);
};

export default function RoutinePage() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (user && !user.isAdmin && user.status?.toLowerCase() === 'inactive') {
            window.location.href = '/';
        }
    }, [user]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            try {
                const [studentsResponse, slotsResponse] = await Promise.all([
                    fetch(`${API_BASE}/students/public/routine`, { signal: controller.signal }),
                    fetch(`${API_BASE}/timeslots`, { signal: controller.signal }),
                ]);
                if (!studentsResponse.ok || !slotsResponse.ok) {
                    throw new Error(`Routine request failed (${studentsResponse.status}, ${slotsResponse.status})`);
                }
                const [studentsData, slotsData] = await Promise.all([
                    studentsResponse.json(),
                    slotsResponse.json(),
                ]);
                if (studentsData.success) setStudents(studentsData.students);
                if (slotsData.success) {
                    setTimeSlots(slotsData.slots.sort((a, b) => parseTime(a.label) - parseTime(b.label)));
                }
            } catch (error) {
                if (error.name !== 'AbortError') console.error('Error fetching routine data:', error);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        fetchData();
        return () => controller.abort();
    }, []);

    const groupedSlots = useMemo(() => {
        if (!timeSlots.length) return [];
        const groups = [];
        let currentGroup = {
            slots: [timeSlots[0]],
            end: parseEndTime(timeSlots[0].label),
        };
        for (let i = 1; i < timeSlots.length; i++) {
            const slot = timeSlots[i];
            const slotStart = parseTime(slot.label);
            const slotEnd = parseEndTime(slot.label);
            if (slotStart < currentGroup.end) {
                currentGroup.slots.push(slot);
                currentGroup.end = Math.max(currentGroup.end, slotEnd);
            } else {
                groups.push(currentGroup);
                currentGroup = { slots: [slot], end: slotEnd };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [timeSlots]);

    const handleDownloadPDF = async () => {
        const input = document.getElementById('routine-content');
        if (!input) return;
        setDownloading(true);
        let wrapper;
        try {
            const clone = input.cloneNode(true);
            wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#ffffff;';
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            const header = clone.querySelector('#print-header');
            if (header) {
                Object.assign(header.style, {
                    position: 'relative',
                    width: '100%',
                    height: '120px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderBottomWidth: '0px',
                });
            }
            const logoWrapper = clone.querySelector('#print-logo');
            if (logoWrapper) {
                logoWrapper.style.cssText = 'position:absolute;left:20px;top:50%;transform:translateY(-50%);margin:0;z-index:10;';
            }
            const textContainer = clone.querySelector('.text-center');
            if (textContainer) {
                Object.assign(textContainer.style, {
                    textAlign: 'center',
                    width: '100%',
                    position: 'relative',
                    zIndex: '1',
                });
                const title = textContainer.querySelector('h1');
                if (title) Object.assign(title.style, { display: 'block', fontSize: '30px' });
            }
            Object.assign(clone.style, {
                width: '100%',
                maxWidth: 'none',
                padding: '20px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            });
            const tableContainer = clone.querySelector('.overflow-x-auto');
            if (tableContainer) {
                Object.assign(tableContainer.style, {
                    overflow: 'visible',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                });
            }
            const table = clone.querySelector('table');
            if (table) Object.assign(table.style, { margin: '0 auto', width: '100%' });

            await new Promise((resolve) => setTimeout(resolve, 100));
            const dataUrl = await toPng(clone, {
                quality: 1,
                pixelRatio: 3,
                width: 1200,
                style: { margin: '0', padding: '0' },
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            const image = new Image();
            image.src = dataUrl;
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Could not load generated routine image.'));
            });

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 5;
            const ratio = Math.min(
                (pdfWidth - margin * 2) / image.width,
                (pdfHeight - margin * 2) / image.height,
            );
            pdf.addImage(
                dataUrl,
                'PNG',
                (pdfWidth - image.width * ratio) / 2,
                (pdfHeight - image.height * ratio) / 2,
                image.width * ratio,
                image.height * ratio,
            );
            pdf.save('HMT_Routine.pdf');
        } catch (error) {
            console.error('PDF generation failed:', error);
            window.alert('Failed to generate PDF. Please try again.');
        } finally {
            wrapper?.remove();
            setDownloading(false);
        }
    };

    const todayDayKey = useMemo(() => {
        const dayIndex = new Date().getDay();
        const dayMap = { 6: 'Sat', 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
        return dayMap[dayIndex];
    }, []);
    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-base-200">
                <IOSSpinner size="lg" className="text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
            <div className="mx-auto max-w-4xl px-3 pt-4 sm:px-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="ios-title mb-1">Routine</h1>
                        <p className="ios-caption">শ্রেণি সময়সূচি · {currentDate}</p>
                    </div>
                    <IOSButton onClick={handleDownloadPDF} loading={downloading} size="sm">
                        📥 PDF
                    </IOSButton>
                </div>

                <p className="mb-2 px-1 text-[11px] text-base-content/40 sm:hidden">
                    ← টেবিল বামে-ডানে স্ক্রল করুন →
                </p>

                <div
                    id="routine-content"
                    className="rounded-2xl bg-white p-2 text-black shadow-sm sm:p-4 font-['Anek_Bangla']"
                    style={{ border: '1px solid #e5e7eb' }}
                >
                    <div
                        id="print-header"
                        className="relative flex flex-col items-center justify-center gap-4 p-4 md:flex-row"
                        style={{ borderBottom: '1px solid #e5e7eb' }}
                    >
                        <div id="print-logo" className="md:absolute md:left-4">
                            <img
                                src="/HMT Logo.png"
                                alt="H.M. Tutoring Logo"
                                className="h-14 w-auto object-contain sm:h-20"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div className="text-center">
                            <h1
                                className="hidden text-2xl font-black uppercase tracking-widest sm:block sm:text-3xl"
                                style={{ color: '#111827', fontWeight: '900' }}
                            >
                                H.M. TUTORING
                            </h1>
                            <h2
                                className="mt-2 text-lg font-bold underline decoration-2 underline-offset-8 sm:text-xl"
                                style={{ color: '#1f2937', fontWeight: '700' }}
                            >
                                শ্রেণি সময়সূচি
                            </h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full" style={{ border: '1px solid #000' }}>
                        <table className="w-full min-w-[800px] table-fixed border-collapse text-center">
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb' }}>
                                    <th
                                        className="sticky left-0 z-20 w-[110px] p-2 align-middle text-sm font-black sm:w-[200px] sm:text-base"
                                        style={{ backgroundColor: '#f3f4f6', border: '1px solid #000', color: '#000' }}
                                    >
                                        সময়
                                    </th>
                                    <th colSpan={7} className="p-0" style={{ border: '1px solid #000' }}>
                                        <div
                                            className="p-2 text-sm font-black uppercase tracking-tighter sm:text-base sm:tracking-normal"
                                            style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000', color: '#000' }}
                                        >
                                            বার / দিন
                                        </div>
                                        <div className="grid grid-cols-7 divide-x" style={{ backgroundColor: '#fff', borderColor: '#000' }}>
                                            {DAYS.map((day) => {
                                                const isToday = day === todayDayKey;
                                                return (
                                                    <div
                                                        key={day}
                                                        className="p-2 text-xs font-black sm:text-sm"
                                                        style={{
                                                            borderRight: '1px solid #000',
                                                            color: isToday ? '#007aff' : '#000',
                                                            backgroundColor: isToday ? '#eff6ff' : undefined,
                                                        }}
                                                    >
                                                        {DAY_MAP[day]}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedSlots.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-6 text-sm" style={{ color: '#6b7280' }}>
                                            কোনো টাইম স্লট নেই
                                        </td>
                                    </tr>
                                )}
                                {groupedSlots.map((group, groupIndex) => {
                                    const lastSlot = group.slots.reduce(
                                        (previous, current) => (
                                            parseEndTime(current.label) > parseEndTime(previous.label) ? current : previous
                                        ),
                                        group.slots[0],
                                    );
                                    const rowLabel = `${group.slots[0].label.split(' - ')[0]} - ${lastSlot.label.split(' - ')[1]}`;

                                    return (
                                        <tr key={groupIndex}>
                                            <td
                                                className="sticky left-0 z-10 whitespace-nowrap p-2 align-middle text-xs font-black sm:text-sm"
                                                style={{ backgroundColor: '#fff', border: '1px solid #000', color: '#000' }}
                                            >
                                                {group.slots.length > 1 ? rowLabel : group.slots[0].label}
                                            </td>
                                            {DAYS.map((day) => {
                                                const studentsInGroup = group.slots.flatMap((slot) => (
                                                    students
                                                        .filter((student) => (
                                                            student.routine
                                                            && student.routine[day] === slot.label
                                                            && (!student.status || student.status.toLowerCase() === 'active')
                                                        ))
                                                        .map((student) => ({ ...student, slotLabel: slot.label }))
                                                ));
                                                const isToday = day === todayDayKey;
                                                return (
                                                    <td
                                                        key={`${day}-${groupIndex}`}
                                                        className="h-16 min-w-[100px] p-1 align-middle"
                                                        style={{
                                                            border: '1px solid #000',
                                                            backgroundColor: isToday ? '#f0f7ff' : undefined,
                                                        }}
                                                    >
                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                            {studentsInGroup.map((student) => (
                                                                <div
                                                                    key={student._id}
                                                                    className="flex flex-col items-center text-[11px] font-bold leading-tight sm:text-xs"
                                                                    style={{ color: '#000' }}
                                                                >
                                                                    <span>{student.username}</span>
                                                                    {group.slots.length > 1 && (
                                                                        <span
                                                                            className="mt-0.5 whitespace-nowrap text-[9px] font-medium"
                                                                            style={{ color: '#6b7280' }}
                                                                        >
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

                    <div className="mt-2 text-right text-xs font-bold" style={{ color: '#000' }}>
                        Effective From: {currentDate}
                    </div>
                </div>

                <div className="mt-3 text-center text-[11px] text-base-content/40">
                    আজকের দিন হাইলাইট করা হয়েছে
                </div>
            </div>
        </div>
    );
}
