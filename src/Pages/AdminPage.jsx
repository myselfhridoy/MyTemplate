import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import IOSButton from '../Components/ios/iOSButton';
import IOSCard from '../Components/ios/iOSCard';
import IOSInput from '../Components/ios/iOSInput';
import IOSSelect from '../Components/ios/iOSSelect';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';
import IOSSegmented from '../Components/ios/iOSSegmented';

const API = 'https://geminiai-render.onrender.com/api';
const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const BN_DAYS = { Sat: 'শনি', Sun: 'রবি', Mon: 'সোম', Tue: 'মঙ্গল', Wed: 'বুধ', Thu: 'বৃহঃ', Fri: 'শুক্র' };
const bn = (number) => String(number).split('').map((digit) => '০১২৩৪৫৬৭৮৯'[digit] ?? digit).join('');

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok || data.success !== true) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function getDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}

function StudentForm({ initial = null, timeSlots, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(() => ({
    username: initial?.username || '',
    email: initial?.email || '',
    password: '',
    userid: initial?.userid || '',
    studentType: initial?.studentType || 'private',
    status: initial?.status || 'active',
    joinDate: getDateInputValue(initial?.joinDate),
    schedule: Array.isArray(initial?.schedule)
      ? initial.schedule
      : Object.keys(initial?.routine || {}),
    routine: initial?.routine || {},
  }));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleDay = (day) => {
    setForm((current) => {
      if (current.schedule.includes(day)) {
        const routine = { ...current.routine };
        delete routine[day];
        return {
          ...current,
          schedule: current.schedule.filter((scheduledDay) => scheduledDay !== day),
          routine,
        };
      }
      return { ...current, schedule: [...current.schedule, day] };
    });
  };

  const setDayTime = (day, time) => {
    setForm((current) => ({ ...current, routine: { ...current.routine, [day]: time } }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      schedule: form.studentType === 'public' ? [] : form.schedule,
      routine: form.studentType === 'public' ? {} : form.routine,
      joinDate: form.joinDate || undefined,
    };
    if (initial?._id && !payload.password) delete payload.password;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <IOSInput
        label="Username"
        placeholder="e.g. john_doe"
        value={form.username}
        onChange={(event) => update('username', event.target.value)}
        autoComplete="username"
        required
      />
      <IOSInput
        label="Email"
        type="email"
        placeholder="john@example.com"
        value={form.email}
        onChange={(event) => update('email', event.target.value)}
        autoComplete="email"
        required
      />
      <IOSInput
        label={initial ? 'Password (leave blank to keep)' : 'Password'}
        type="password"
        placeholder={initial ? 'Leave blank to keep current password' : '••••••••'}
        value={form.password}
        onChange={(event) => update('password', event.target.value)}
        autoComplete={initial ? 'new-password' : 'new-password'}
        required={!initial}
      />

      <div className="grid grid-cols-2 gap-3">
        <IOSSelect
          label="Type"
          options={[
            { value: 'private', label: 'Private' },
            { value: 'public', label: 'Public' },
          ]}
          value={form.studentType}
          onChange={(event) => update('studentType', event.target.value)}
        />
        <IOSSelect
          label="Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={form.status}
          onChange={(event) => update('status', event.target.value)}
        />
      </div>

      <IOSInput
        label="Join Date"
        type="date"
        value={form.joinDate}
        onChange={(event) => update('joinDate', event.target.value)}
      />

      {form.studentType !== 'public' && (
        <div>
          <label className="block text-[13px] font-semibold text-base-content/60 mb-2 px-1 uppercase tracking-wide">
            Weekly Schedule
          </label>
          <div className="ios-card divide-y divide-base-content/10 overflow-hidden">
            {DAYS.map((day) => {
              const enabled = form.schedule.includes(day);
              return (
                <div key={day} className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-9 h-6 rounded-full transition-all ios-pressable flex-shrink-0 ${
                      enabled ? 'bg-primary' : 'bg-base-content/20'
                    } relative`}
                    aria-label={`Toggle ${BN_DAYS[day]}`}
                    aria-pressed={enabled}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: enabled ? '16px' : '2px' }}
                    />
                  </button>
                  <span className="text-sm font-semibold flex-1">{BN_DAYS[day]}</span>
                  {enabled && (
                    <select
                      value={form.routine[day] || ''}
                      onChange={(event) => setDayTime(day, event.target.value)}
                      className="ios-input py-1.5 text-[12px] w-32 flex-shrink-0"
                      aria-label={`${BN_DAYS[day]} time`}
                    >
                      <option value="">Time</option>
                      {timeSlots.map((slot) => (
                        <option key={slot._id} value={slot.label}>{slot.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <IOSButton type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          Cancel
        </IOSButton>
        <IOSButton type="submit" fullWidth loading={loading}>
          {initial ? 'Update' : 'Create'}
        </IOSButton>
      </div>
    </form>
  );
}

function TimeSlotSheet({ open, onClose, timeSlots, onAdd, onDelete, loading, newSlot, setNewSlot }) {
  return (
    <IOSSheet open={open} onClose={onClose} title="Time Slots">
      <div className="p-4 space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd();
          }}
        >
          <input
            type="text"
            placeholder="e.g. 5:00 PM - 6:00 PM"
            aria-label="New time slot"
            className="ios-input flex-1 min-w-0"
            value={newSlot}
            onChange={(event) => setNewSlot(event.target.value)}
          />
          <IOSButton type="submit" disabled={!newSlot.trim() || loading} loading={loading}>
            Add
          </IOSButton>
        </form>

        {timeSlots.length === 0 ? (
          <div className="text-center py-6 text-sm text-base-content/50">No time slots yet</div>
        ) : (
          <div className="ios-card divide-y divide-base-content/10 overflow-hidden">
            {timeSlots.map((slot) => (
              <div key={slot._id} className="flex items-center justify-between p-3">
                <span className="text-sm font-semibold">{slot.label}</span>
                <button
                  type="button"
                  onClick={() => onDelete(slot._id)}
                  className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center ios-pressable"
                  aria-label={`Delete ${slot.label}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </IOSSheet>
  );
}

function StudentRow({ student, onEdit, onDelete, disabled }) {
  const type = student.studentType || 'private';
  const status = student.status || 'active';
  const avatar = String(student.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neutral to-neutral-focus text-neutral-content flex items-center justify-center font-bold text-sm flex-shrink-0">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{student.username}</p>
        <p className="text-[11px] text-base-content/50 truncate font-mono">{student.email}</p>
        <div className="flex gap-1 mt-1">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            type === 'public' ? 'bg-base-content/10 text-base-content/60' : 'bg-primary/15 text-primary'
          }`}>
            {type}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            status === 'inactive' ? 'bg-error/15 text-error' : 'bg-success/15 text-success'
          }`}>
            {status}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(student)}
          disabled={disabled}
          className="w-8 h-8 rounded-lg bg-info/10 text-info text-[11px] font-bold ios-pressable disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(student)}
          disabled={disabled}
          className="w-8 h-8 rounded-lg bg-error/10 text-error text-[11px] font-bold ios-pressable disabled:opacity-50"
        >
          Del
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const admin = Boolean(user && isAdmin());

  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [newSlot, setNewSlot] = useState('');
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const fetchStudents = useCallback(async (signal) => {
    const response = await fetch(`${API}/students/admin/students`, { signal });
    const data = await readResponse(response);
    if (!Array.isArray(data.students)) throw new Error('Student response is not an array');
    setStudents(data.students);
  }, []);

  const fetchSlots = useCallback(async (signal) => {
    const response = await fetch(`${API}/timeslots`, { signal });
    const data = await readResponse(response);
    if (!Array.isArray(data.slots)) throw new Error('Time slot response is not an array');
    setTimeSlots(data.slots);
  }, []);

  const refreshStudents = async () => {
    try {
      await fetchStudents();
    } catch (error) {
      console.error('Refreshing students failed:', error);
      showToast('Student list could not be refreshed', 'error');
    }
  };

  const refreshSlots = async () => {
    try {
      await fetchSlots();
    } catch (error) {
      console.error('Refreshing time slots failed:', error);
      showToast('Time slots could not be refreshed', 'error');
    }
  };

  useEffect(() => {
    if (authLoading) return undefined;
    if (!admin) {
      navigate('/login', { replace: true });
      setInitialLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const loadAdminData = async () => {
      setInitialLoading(true);
      try {
        const results = await Promise.allSettled([
          fetchStudents(controller.signal),
          fetchSlots(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        const failures = results.filter((result) => result.status === 'rejected');
        failures.forEach((result) => console.error('Loading admin data failed:', result.reason));
        if (failures.length) showToast('Some admin data could not be loaded', 'error');
      } finally {
        if (!controller.signal.aborted) setInitialLoading(false);
      }
    };
    loadAdminData();
    return () => controller.abort();
  }, [admin, authLoading, fetchSlots, fetchStudents, navigate, showToast]);

  const handleCreate = async (payload) => {
    setLoading(true);
    try {
      const body = {
        ...payload,
        schedule: payload.schedule || [],
        routine: payload.routine || {},
        joinDate: payload.joinDate || undefined,
      };
      const response = await fetch(`${API}/students/admin/create-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await readResponse(response);
      showToast('Student created');
      setCreateOpen(false);
      await refreshStudents();
    } catch (error) {
      console.error('Creating student failed:', error);
      showToast(error.message || 'Create failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (payload) => {
    if (!editStudent?._id) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/students/admin/update-student`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editStudent._id, ...payload }),
      });
      await readResponse(response);
      showToast('Student updated');
      setEditStudent(null);
      await refreshStudents();
    } catch (error) {
      console.error('Updating student failed:', error);
      showToast(error.message || 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete student: ${student.username}?`)) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/students/admin/delete-student/${student._id}`, {
        method: 'DELETE',
      });
      await readResponse(response);
      showToast('Student deleted');
      await refreshStudents();
    } catch (error) {
      console.error('Deleting student failed:', error);
      showToast(error.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/timeslots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newSlot.trim() }),
      });
      await readResponse(response);
      showToast('Slot added');
      setNewSlot('');
      await refreshSlots();
    } catch (error) {
      console.error('Adding time slot failed:', error);
      showToast(error.message || 'Add failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this time slot?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/timeslots/${id}`, { method: 'DELETE' });
      await readResponse(response);
      showToast('Slot deleted');
      await refreshSlots();
    } catch (error) {
      console.error('Deleting time slot failed:', error);
      showToast(error.message || 'Delete failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || initialLoading) {
    return <div className="min-h-screen flex items-center justify-center"><IOSSpinner size="lg" /></div>;
  }
  if (!user || !admin) return null;

  return (
    <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="ios-title mb-1">Admin</h1>
            <p className="ios-caption">Manage students & slots</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center ios-pressable"
            aria-label="Logout"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <IOSCard className="p-3">
            <p className="text-2xl font-bold text-primary">{bn(students.length)}</p>
            <p className="text-[11px] text-base-content/50 mt-0.5 font-semibold">Total Students</p>
          </IOSCard>
          <IOSCard className="p-3">
            <p className="text-2xl font-bold text-success">
              {bn(students.filter((student) => student.status !== 'inactive').length)}
            </p>
            <p className="text-[11px] text-base-content/50 mt-0.5 font-semibold">Active</p>
          </IOSCard>
        </div>

        <IOSSegmented
          options={[
            { value: 'students', label: `Students (${bn(students.length)})` },
            { value: 'slots', label: `Slots (${bn(timeSlots.length)})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'students' && (
          <div className="mt-3">
            <div className="flex gap-2 mb-3">
              <IOSButton onClick={() => setCreateOpen(true)} fullWidth>
                + New Student
              </IOSButton>
            </div>
            {students.length === 0 ? (
              <IOSCard className="p-8 text-center">
                <div className="text-4xl mb-2">👥</div>
                <p className="ios-subhead">No students yet</p>
              </IOSCard>
            ) : (
              <IOSCard className="divide-y divide-base-content/10 overflow-hidden">
                {students.map((student) => (
                  <StudentRow
                    key={student._id}
                    student={student}
                    onEdit={setEditStudent}
                    onDelete={handleDelete}
                    disabled={loading}
                  />
                ))}
              </IOSCard>
            )}
          </div>
        )}

        {tab === 'slots' && (
          <div className="mt-3">
            <div className="flex gap-2 mb-3">
              <IOSButton onClick={() => setSlotsOpen(true)} fullWidth>
                Manage Time Slots
              </IOSButton>
            </div>
            {timeSlots.length === 0 ? (
              <IOSCard className="p-8 text-center">
                <div className="text-4xl mb-2">⏰</div>
                <p className="ios-subhead">No slots added</p>
              </IOSCard>
            ) : (
              <IOSCard className="divide-y divide-base-content/10 overflow-hidden">
                {timeSlots.map((slot) => (
                  <div key={slot._id} className="flex items-center justify-between p-3.5">
                    <span className="text-sm font-semibold">{slot.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot._id)}
                      disabled={loading}
                      className="text-[11px] text-error font-semibold ios-pressable disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </IOSCard>
            )}
          </div>
        )}
      </div>

      <IOSSheet open={createOpen} onClose={() => setCreateOpen(false)} title="New Student" maxHeight="92vh">
        <StudentForm
          key="create-student"
          timeSlots={timeSlots}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          loading={loading}
        />
      </IOSSheet>

      <IOSSheet open={Boolean(editStudent)} onClose={() => setEditStudent(null)} title="Edit Student" maxHeight="92vh">
        {editStudent && (
          <StudentForm
            key={editStudent._id}
            initial={editStudent}
            timeSlots={timeSlots}
            onSubmit={handleUpdate}
            onCancel={() => setEditStudent(null)}
            loading={loading}
          />
        )}
      </IOSSheet>

      <TimeSlotSheet
        open={slotsOpen}
        onClose={() => setSlotsOpen(false)}
        timeSlots={timeSlots}
        onAdd={handleAddSlot}
        onDelete={handleDeleteSlot}
        loading={loading}
        newSlot={newSlot}
        setNewSlot={setNewSlot}
      />

      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[999] ios-pop">
          <div className={`px-5 py-2.5 rounded-full shadow-2xl text-sm font-semibold text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
