import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import IOSButton from '../Components/ios/iOSButton';
import IOSCard from '../Components/ios/iOSCard';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';
import IOSSegmented from '../Components/ios/iOSSegmented';

const API_BASE = 'https://geminiai-render.onrender.com/api';
const BN_DAYS = { Sat: 'শনি', Sun: 'রবি', Mon: 'সোম', Tue: 'মঙ্গল', Wed: 'বুধ', Thu: 'বৃহঃ', Fri: 'শুক্র' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseTimeForSort = (timeStr) => {
  const match = timeStr?.split(' - ')[0]?.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 9999;
  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getBDTDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatDate = (date, options = {}) => {
  if (!date) return '';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', ...options });
};

const bn = (number) => String(number ?? 0)
  .split('')
  .map((digit) => '০১২৩৪৫৬৭৮৯'[digit] ?? digit)
  .join('');

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok || data.success !== true) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function StatusSelector({ value, onChange, onMakeupClick }) {
  const select = (status) => {
    if (value === status) onChange('unmarked');
    else if (status === 'makeup') onMakeupClick();
    else onChange(status);
  };

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-base-200 flex-shrink-0" aria-label="Attendance status">
      {[
        { key: 'present', label: 'P', active: 'bg-success text-white', idle: 'text-success' },
        { key: 'makeup', label: 'M', active: 'bg-info text-white', idle: 'text-info' },
        { key: 'absent', label: 'A', active: 'bg-error text-white', idle: 'text-error' },
      ].map((status) => (
        <button
          key={status.key}
          type="button"
          onClick={() => select(status.key)}
          aria-pressed={value === status.key}
          className={`w-9 h-8 rounded-lg font-bold text-[13px] ios-pressable transition-all ${
            value === status.key ? status.active : status.idle
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  );
}

function StudentCard({ student, data = {}, onChange, onMakeupClick }) {
  return (
    <IOSCard className="p-3 mb-2.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[15px] truncate">{student.username}</h3>
          {student.email && <p className="text-[11px] text-base-content/50 truncate">{student.email}</p>}
        </div>
        <StatusSelector
          value={data.status}
          onChange={(value) => onChange('status', value)}
          onMakeupClick={() => onMakeupClick(student._id)}
        />
      </div>

      {data.status === 'makeup' && data.makeupDate && (
        <div className="flex items-center justify-between gap-2 mb-2 px-2.5 py-1.5 rounded-lg bg-info/10">
          <span className="text-[11px] text-info font-semibold truncate">
            Makeup: {formatDate(data.makeupDate)} {data.makeupTime && `(${data.makeupTime})`}
          </span>
          <button
            type="button"
            onClick={() => onMakeupClick(student._id)}
            aria-label="Edit makeup schedule"
            className="text-[11px] text-info font-bold ios-pressable"
          >
            ✎
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <input
          type="text"
          placeholder="Classwork"
          aria-label={`${student.username} classwork`}
          className="ios-input py-2 text-[13px]"
          value={data.classwork || ''}
          onChange={(event) => onChange('classwork', event.target.value)}
        />
        <input
          type="text"
          placeholder="Homework"
          aria-label={`${student.username} homework`}
          className="ios-input py-2 text-[13px]"
          value={data.homework || ''}
          onChange={(event) => onChange('homework', event.target.value)}
        />
        {(data.status === 'absent' || data.status === 'makeup' || data.reason) && (
          <input
            type="text"
            placeholder="Reason / note…"
            aria-label={`${student.username} reason or note`}
            className="ios-input py-2 text-[13px] border-warning bg-warning/10"
            value={data.reason || ''}
            onChange={(event) => onChange('reason', event.target.value)}
          />
        )}
        {!data.status && !data.reason && (
          <button
            type="button"
            onClick={() => onChange('reason', ' ')}
            className="w-full py-1.5 rounded-lg border border-dashed border-base-content/20 text-[12px] text-base-content/50 ios-pressable"
          >
            + Add note
          </button>
        )}
      </div>
    </IOSCard>
  );
}

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const admin = user?.isAdmin === true;

  const [tab, setTab] = useState('daily');
  const [students, setStudents] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyLoaded, setDailyLoaded] = useState(false);
  const [pageError, setPageError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getBDTDate());
  const [attendanceForm, setAttendanceForm] = useState({});
  const [makeupRecords, setMakeupRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [othersOpen, setOthersOpen] = useState(false);
  const [month, setMonth] = useState(() => Number(getBDTDate().slice(5, 7)) - 1);
  const [year, setYear] = useState(() => Number(getBDTDate().slice(0, 4)));
  const [reportData, setReportData] = useState([]);
  const [historySheet, setHistorySheet] = useState(null);
  const [makeupModal, setMakeupModal] = useState({ open: false, studentId: null, date: '', time: '' });

  useEffect(() => {
    if (authLoading || !admin) return undefined;
    const controller = new AbortController();
    const loadLists = async () => {
      try {
        const [studentResponse, slotResponse] = await Promise.all([
          fetch(`${API_BASE}/students/admin/students`, { signal: controller.signal }),
          fetch(`${API_BASE}/timeslots`, { signal: controller.signal }),
        ]);
        const [studentData, slotData] = await Promise.all([
          readResponse(studentResponse),
          readResponse(slotResponse),
        ]);
        if (!Array.isArray(studentData.students) || !Array.isArray(slotData.slots)) {
          throw new Error('Student or timeslot data is not in the expected format');
        }
        setStudents(studentData.students);
        setTimeSlots(slotData.slots);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Loading attendance lists failed:', error);
        setPageError('শিক্ষার্থী বা সময়ের তালিকা লোড করা যায়নি।');
      }
    };
    loadLists();
    return () => controller.abort();
  }, [admin, authLoading]);

  useEffect(() => {
    if (!admin || tab !== 'daily' || !selectedDate) return undefined;
    const controller = new AbortController();
    const loadDaily = async () => {
      setLoading(true);
      setDailyLoaded(false);
      setAttendanceForm({});
      setMakeupRecords([]);
      setPageError('');
      try {
        const response = await fetch(
          `${API_BASE}/attendance/daily?date=${encodeURIComponent(selectedDate)}`,
          { signal: controller.signal }
        );
        const data = await readResponse(response);
        const records = data.records || [];
        const form = {};
        records.forEach((record) => {
          form[String(record.studentId)] = {
            status: record.status,
            reason: record.reason,
            classwork: record.classwork,
            homework: record.homework,
            makeupDate: record.makeupDate,
            makeupTime: record.makeupTime,
          };
        });
        setAttendanceForm(form);
        setMakeupRecords(data.makeupRecords || []);
        setDailyLoaded(true);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Loading daily attendance failed:', error);
        setPageError('এই দিনের উপস্থিতির তথ্য লোড করা যায়নি।');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadDaily();
    return () => controller.abort();
  }, [admin, tab, selectedDate]);

  useEffect(() => {
    if (!admin || tab !== 'report') return undefined;
    const controller = new AbortController();
    const loadReport = async () => {
      setLoading(true);
      setPageError('');
      try {
        const response = await fetch(
          `${API_BASE}/attendance/report?month=${month}&year=${year}`,
          { signal: controller.signal }
        );
        const data = await readResponse(response);
        if (!Array.isArray(data.report)) throw new Error('Attendance report is not an array');
        setReportData(data.report);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Loading attendance report failed:', error);
        setPageError('মাসিক রিপোর্ট লোড করা যায়নি।');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadReport();
    return () => controller.abort();
  }, [admin, tab, month, year]);

  const dayName = useMemo(() => {
    if (!selectedDate) return '';
    const date = new Date(`${selectedDate}T12:00:00+06:00`);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Dhaka' }).format(date);
  }, [selectedDate]);

  const { scheduled, others } = useMemo(() => {
    const active = students.filter(
      (student) => student.status !== 'inactive' && (student.studentType === 'private' || !student.studentType)
    );
    const scheduledStudents = active
      .filter((student) => student.schedule?.includes(dayName))
      .sort((a, b) => parseTimeForSort(a.routine?.[dayName]) - parseTimeForSort(b.routine?.[dayName]));
    const otherStudents = active.filter(
      (student) => !student.schedule?.includes(dayName)
        && String(student.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { scheduled: scheduledStudents, others: otherStudents };
  }, [students, dayName, searchTerm]);

  const stats = useMemo(() => {
    const values = Object.values(attendanceForm);
    return {
      present: values.filter((value) => value.status === 'present').length,
      makeup: values.filter((value) => value.status === 'makeup').length,
      absent: values.filter((value) => value.status === 'absent').length,
    };
  }, [attendanceForm]);

  const enrichedMakeup = useMemo(
    () => makeupRecords.map((record) => {
      const student = students.find((item) => String(item._id) === String(record.studentId));
      return { ...record, studentName: student?.username || 'Unknown' };
    }),
    [makeupRecords, students]
  );

  const updateField = (studentId, field, value) => {
    setAttendanceForm((previous) => ({
      ...previous,
      [studentId]: { ...(previous[studentId] || {}), [field]: value },
    }));
  };

  const handleMakeupClick = (studentId) => {
    const current = attendanceForm[studentId] || {};
    setMakeupModal({
      open: true,
      studentId,
      date: current.makeupDate ? getBDTDate(new Date(current.makeupDate)) : '',
      time: current.makeupTime || '',
    });
  };

  const handleMakeupConfirm = () => {
    if (!makeupModal.date) {
      window.alert('Please select a makeup date');
      return;
    }
    setAttendanceForm((previous) => ({
      ...previous,
      [makeupModal.studentId]: {
        ...(previous[makeupModal.studentId] || {}),
        status: 'makeup',
        makeupDate: makeupModal.date,
        makeupTime: makeupModal.time,
      },
    }));
    setMakeupModal({ open: false, studentId: null, date: '', time: '' });
  };

  const handleSave = async () => {
    if (!dailyLoaded || loading) return;
    setLoading(true);
    setPageError('');
    try {
      const response = await fetch(`${API_BASE}/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          students: Object.entries(attendanceForm).map(([studentId, data]) => ({
            studentId,
            status: data.status,
            reason: data.reason,
            classwork: data.classwork,
            homework: data.homework,
            makeupDate: data.makeupDate || null,
            makeupTime: data.makeupTime || '',
          })),
          classwork: '',
          homework: '',
        }),
      });
      await readResponse(response);
      window.alert('Attendance saved!');
    } catch (error) {
      console.error('Saving attendance failed:', error);
      window.alert(`Error saving attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center py-16"><IOSSpinner size="lg" /></div>;
  }
  if (!user || !admin) return null;

  return (
    <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <div className="mb-4">
          <h1 className="ios-title mb-3">Attendance</h1>
          <IOSSegmented
            options={[{ value: 'daily', label: 'Daily' }, { value: 'report', label: 'Report' }]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {pageError && (
          <div role="alert" className="mb-3 rounded-xl bg-error/10 p-3 text-sm text-error">
            {pageError}
          </div>
        )}

        {tab === 'daily' && (
          <>
            <IOSCard className="p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="ios-input py-2 font-mono text-[15px] flex-1"
                />
                <span className="text-sm font-bold text-base-content/70 whitespace-nowrap">
                  {BN_DAYS[dayName] || dayName}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Present', value: stats.present, color: '#34c759' },
                  { label: 'Makeup', value: stats.makeup, color: '#5ac8fa' },
                  { label: 'Absent', value: stats.absent, color: '#ff3b30' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-2.5 text-center" style={{ background: `${stat.color}15` }}>
                    <p className="text-xl font-bold" style={{ color: stat.color }}>{bn(stat.value)}</p>
                    <p className="text-[10px] font-semibold text-base-content/60 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <IOSButton
                onClick={handleSave}
                fullWidth
                loading={loading}
                disabled={loading || !dailyLoaded}
              >
                Save Attendance
              </IOSButton>
            </IOSCard>

            {loading && <div className="flex justify-center py-6"><IOSSpinner /></div>}

            {!loading && enrichedMakeup.length > 0 && (
              <div className="mb-3">
                <h2 className="ios-headline px-1 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-info/20 text-info text-xs flex items-center justify-center font-bold">
                    {bn(enrichedMakeup.length)}
                  </span>
                  Makeup Today
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {enrichedMakeup.map((record, index) => (
                    <IOSCard key={`${record.studentId}-${record.date}-${index}`} className="p-3 border-l-4 border-info">
                      <p className="font-bold text-sm">{record.studentName}</p>
                      <p className="text-[11px] text-base-content/60 mt-0.5">
                        Original: {formatDate(record.date)}
                        {record.makeupTime && ` · ${record.makeupTime}`}
                      </p>
                    </IOSCard>
                  ))}
                </div>
              </div>
            )}

            {!loading && (
              <>
                <div className="mb-3">
                  <h2 className="ios-headline px-1 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                      {bn(scheduled.length)}
                    </span>
                    Scheduled Today
                  </h2>
                  {scheduled.length === 0 ? (
                    <IOSCard className="p-6 text-center">
                      <p className="text-sm text-base-content/50">No students scheduled today</p>
                    </IOSCard>
                  ) : scheduled.map((student) => (
                    <StudentCard
                      key={student._id}
                      student={student}
                      data={attendanceForm[student._id]}
                      onChange={(field, value) => updateField(student._id, field, value)}
                      onMakeupClick={handleMakeupClick}
                    />
                  ))}
                </div>

                <IOSCard className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOthersOpen((open) => !open)}
                    aria-expanded={othersOpen}
                    className="w-full flex items-center justify-between p-3.5 ios-pressable"
                  >
                    <span className="font-semibold text-sm text-base-content/80">
                      Other Students ({bn(others.length)})
                    </span>
                    <span
                      className="text-base-content/40 text-sm transition-transform"
                      style={{ transform: othersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </button>
                  {othersOpen && (
                    <div className="p-3 border-t border-base-content/10 ios-fade">
                      <input
                        type="text"
                        placeholder="Search student…"
                        aria-label="Search students"
                        className="ios-input py-2 text-[13px] mb-2.5"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                      {others.length === 0 ? (
                        <p className="text-center text-xs text-base-content/40 py-4">No students found</p>
                      ) : others.map((student) => (
                        <StudentCard
                          key={student._id}
                          student={student}
                          data={attendanceForm[student._id]}
                          onChange={(field, value) => updateField(student._id, field, value)}
                          onMakeupClick={handleMakeupClick}
                        />
                      ))}
                    </div>
                  )}
                </IOSCard>
              </>
            )}
          </>
        )}

        {tab === 'report' && (
          <>
            <IOSCard className="p-3 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="ios-input appearance-none text-[14px]"
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  aria-label="Report month"
                >
                  {MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
                </select>
                <select
                  className="ios-input appearance-none text-[14px]"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  aria-label="Report year"
                >
                  {Array.from({ length: 5 }, (_, index) => year - 2 + index)
                    .map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </IOSCard>

            {loading && <div className="flex justify-center py-10"><IOSSpinner size="lg" /></div>}
            {!loading && reportData.length === 0 && (
              <IOSCard className="p-8 text-center">
                <p className="text-sm text-base-content/50">No records for this month</p>
              </IOSCard>
            )}
            {!loading && reportData.length > 0 && (
              <IOSCard className="divide-y divide-base-content/10 overflow-hidden">
                {reportData.map((item, index) => (
                  <button
                    type="button"
                    key={item.student?._id || index}
                    onClick={() => setHistorySheet({ student: item.student, history: item.history })}
                    className="w-full flex items-center gap-3 p-3.5 text-left ios-pressable hover:bg-base-content/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.student?.username || 'Unknown'}</p>
                      <p className="text-[11px] text-base-content/40 mt-0.5">
                        P {bn(item.totalPresent)} · M {bn(item.totalMakeup)} · A {bn(item.totalAbsent)}
                      </p>
                      <p className="text-[11px] text-base-content/60 mt-0.5">
                        Attended: {bn(item.totalAttended)} / {bn(item.expectedClasses)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${item.extraClasses >= 0 ? 'text-primary' : 'text-error'}`}>
                        {item.extraClasses > 0 ? `+${bn(item.extraClasses)}` : bn(item.extraClasses)}
                      </p>
                      <p className="text-[10px] text-base-content/40">Extra</p>
                    </div>
                  </button>
                ))}
              </IOSCard>
            )}
          </>
        )}
      </div>

      <IOSSheet
        open={Boolean(historySheet)}
        onClose={() => setHistorySheet(null)}
        title={historySheet?.student?.username || 'History'}
        maxHeight="88vh"
      >
        <div className="p-4">
          {historySheet?.history?.length ? (
            <IOSCard className="divide-y divide-base-content/10 overflow-hidden">
              {historySheet.history.map((record, index) => (
                <div key={`${record.date}-${index}`} className="flex items-center gap-2 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-mono">{formatDate(record.date)}</p>
                    {record.status === 'makeup' && record.makeupDate && (
                      <p className="text-[10px] text-info">→ {formatDate(record.makeupDate)}</p>
                    )}
                    {record.reason && <p className="text-[11px] text-base-content/50 truncate">{record.reason}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    record.status === 'present' ? 'bg-success/15 text-success'
                      : record.status === 'makeup' ? 'bg-info/15 text-info'
                        : record.status === 'absent' ? 'bg-error/15 text-error'
                          : 'bg-base-content/10 text-base-content/60'
                  }`}>
                    {record.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(getBDTDate(new Date(record.date)));
                      setTab('daily');
                      setHistorySheet(null);
                    }}
                    className="text-[11px] text-primary font-semibold ios-pressable"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </IOSCard>
          ) : <p className="text-center text-sm text-base-content/50 py-6">No records</p>}
        </div>
      </IOSSheet>

      <IOSSheet
        open={makeupModal.open}
        onClose={() => setMakeupModal({ open: false, studentId: null, date: '', time: '' })}
        title="Schedule Makeup"
      >
        <div className="p-4 space-y-3">
          <div>
            <label htmlFor="makeup-date" className="block text-[12px] font-semibold text-base-content/60 uppercase mb-1.5 px-1">
              Date
            </label>
            <input
              id="makeup-date"
              type="date"
              className="ios-input"
              value={makeupModal.date}
              onChange={(event) => setMakeupModal((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="makeup-time" className="block text-[12px] font-semibold text-base-content/60 uppercase mb-1.5 px-1">
              Time Slot
            </label>
            <select
              id="makeup-time"
              className="ios-input appearance-none"
              value={makeupModal.time}
              onChange={(event) => setMakeupModal((current) => ({ ...current, time: event.target.value }))}
            >
              <option value="">Select</option>
              {timeSlots.map((slot) => <option key={slot._id} value={slot.label}>{slot.label}</option>)}
            </select>
          </div>
          <IOSButton onClick={handleMakeupConfirm} fullWidth size="lg">
            Confirm Makeup
          </IOSButton>
        </div>
      </IOSSheet>
    </div>
  );
}
