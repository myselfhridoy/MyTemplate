import React, { useEffect, useState } from 'react';

function SelfTestCreateForm({ accessToken, onSuccess }) {
  const [fields, setFields] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch('https://api.daricomma.com/field/self-test', {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.data) {
          setFields(data.data);
        } else {
          setError('ফিল্ড লোড হয়নি');
        }
      })
      .catch(() => setError('ফিল্ড লোড হয়নি'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  // Helper: get all options for select fields
  const getOptions = (arr) => arr.map(opt => ({ value: opt.id || opt.name, label: opt.name }));

  // Handle select changes (cascading)
  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    // Reset dependent fields
    if (key === 'curriculum') setForm(f => ({ curriculum: value }));
    if (key === 'version') setForm(f => ({ ...f, version: value, class: '', group: '', subject: '', chapter: '' }));
    if (key === 'class') setForm(f => ({ ...f, class: value, group: '', subject: '', chapter: '' }));
    if (key === 'group') setForm(f => ({ ...f, group: value, subject: '', chapter: '' }));
    if (key === 'subject') setForm(f => ({ ...f, subject: value, chapter: '' }));
    if (key === 'chapter') setForm(f => ({ ...f, chapter: value }));
  };

  // Get dependent options
  let curriculums = fields?.curriculums || [];
  let versions = [];
  let classes = [];
  let groups = [];
  let subjects = [];
  let chapters = [];
  if (form.curriculum) {
    const c = curriculums.find(c => c.id === form.curriculum || c.name === form.curriculum);
    versions = c?.versions || [];
    if (form.version) {
      const v = versions.find(v => v.id === form.version || v.name === form.version);
      classes = v?.classes || [];
      if (form.class) {
        const cl = classes.find(cl => cl.id === form.class || cl.name === form.class);
        groups = cl?.groups || [];
        if (form.group) {
          const g = groups.find(g => g.id === form.group || g.name === form.group);
          subjects = g?.subjects || [];
          if (form.subject) {
            const s = subjects.find(s => s.id === form.subject || s.name === form.subject);
            chapters = s?.chapters || [];
          }
        }
      }
    }
  }

  // Other fields (from API or fallback)
  const examStandards = fields?.exam_standards || [
    { name: 'Board Exam', id: 'Board Exam' },
    { name: 'Model Test', id: 'Model Test' }
  ];
  const questionTypes = fields?.question_types || [
    { name: 'MCQ', id: 'MCQ' },
    { name: 'CQ', id: 'CQ' }
  ];
  const negativeMarks = fields?.negative_marks || [0, 0.25, 0.5, 1];
  const questionNumbers = fields?.number_of_questions || [5, 10, 15, 20, 25];
  const examTimes = fields?.exam_times || [10, 15, 20, 25, 30, 60];
  const everyQuestionMarks = fields?.every_question_marks || [1, 2, 4, 5];

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    // Validate required fields
    if (!form.class || !form.group || !form.subject || !form.chapter) {
      setError('সব ফিল্ড পূরণ করুন');
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch('https://api.daricomma.com/v1/self-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          exam_type: 'self_test',
          exam_class: classes.find(cl => cl.id === form.class)?.name || form.class,
          exam_group: groups.find(g => g.id === form.group)?.name || form.group,
          exam_standard: form.exam_standard || 'Board Exam',
          question_type: form.question_type || 'MCQ',
          number_of_question: Number(form.number_of_question) || 25,
          exam_time: Number(form.exam_time) || 25,
          penalty_per_wrong: Number(form.negative_mark) || 0,
          every_question_mark: Number(form.every_question_mark) || 1,
          chapter_ids: [form.chapter],
          subject_names: [subjects.find(s => s.id === form.subject)?.name || form.subject]
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.self_test_id) {
        onSuccess(data.data.self_test_id);
      } else {
        setError('Self-test তৈরি হয়নি: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-200 dark:border-gray-700">
      {loading && <div>লোড হচ্ছে...</div>}
      {error && <div className="text-red-500 font-semibold">{error}</div>}
      {fields && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Curriculum */}
          <div>
            <label className="block mb-1 font-medium">Curriculum</label>
            <select className="select select-bordered w-full" value={form.curriculum || ''} onChange={e => handleChange('curriculum', e.target.value)} required>
              <option value="">Select</option>
              {curriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Version */}
          <div>
            <label className="block mb-1 font-medium">Version</label>
            <select className="select select-bordered w-full" value={form.version || ''} onChange={e => handleChange('version', e.target.value)} required>
              <option value="">Select</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          {/* Class */}
          <div>
            <label className="block mb-1 font-medium">Class</label>
            <select className="select select-bordered w-full" value={form.class || ''} onChange={e => handleChange('class', e.target.value)} required>
              <option value="">Select</option>
              {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
          </div>
          {/* Group */}
          <div>
            <label className="block mb-1 font-medium">Group</label>
            <select className="select select-bordered w-full" value={form.group || ''} onChange={e => handleChange('group', e.target.value)} required>
              <option value="">Select</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {/* Subject */}
          <div>
            <label className="block mb-1 font-medium">Subject</label>
            <select className="select select-bordered w-full" value={form.subject || ''} onChange={e => handleChange('subject', e.target.value)} required>
              <option value="">Select</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {/* Chapter */}
          <div>
            <label className="block mb-1 font-medium">Chapter</label>
            <select className="select select-bordered w-full" value={form.chapter || ''} onChange={e => handleChange('chapter', e.target.value)} required>
              <option value="">Select</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
            </select>
          </div>
          {/* Exam Standard */}
          <div>
            <label className="block mb-1 font-medium">Exam Standard</label>
            <select className="select select-bordered w-full" value={form.exam_standard || ''} onChange={e => handleChange('exam_standard', e.target.value)} required>
              <option value="">Select</option>
              {examStandards.map(es => <option key={es.id} value={es.id}>{es.name}</option>)}
            </select>
          </div>
          {/* Question Type */}
          <div>
            <label className="block mb-1 font-medium">Question Type</label>
            <select className="select select-bordered w-full" value={form.question_type || ''} onChange={e => handleChange('question_type', e.target.value)} required>
              <option value="">Select</option>
              {questionTypes.map(qt => <option key={qt.id} value={qt.id}>{qt.name}</option>)}
            </select>
          </div>
          {/* Number of Questions */}
          <div>
            <label className="block mb-1 font-medium">Number of Questions</label>
            <select className="select select-bordered w-full" value={form.number_of_question || ''} onChange={e => handleChange('number_of_question', e.target.value)} required>
              <option value="">Select</option>
              {questionNumbers.map(qn => <option key={qn} value={qn}>{qn}</option>)}
            </select>
          </div>
          {/* Exam Time */}
          <div>
            <label className="block mb-1 font-medium">Exam Time (min)</label>
            <select className="select select-bordered w-full" value={form.exam_time || ''} onChange={e => handleChange('exam_time', e.target.value)} required>
              <option value="">Select</option>
              {examTimes.map(et => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>
          {/* Negative Mark */}
          <div>
            <label className="block mb-1 font-medium">Negative Mark</label>
            <select className="select select-bordered w-full" value={form.negative_mark || ''} onChange={e => handleChange('negative_mark', e.target.value)} required>
              <option value="">Select</option>
              {negativeMarks.map(nm => <option key={nm} value={nm}>{nm}</option>)}
            </select>
          </div>
          {/* Every Question Mark */}
          <div>
            <label className="block mb-1 font-medium">Every Question Mark</label>
            <select className="select select-bordered w-full" value={form.every_question_mark || ''} onChange={e => handleChange('every_question_mark', e.target.value)} required>
              <option value="">Select</option>
              {everyQuestionMarks.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>
        </div>
      )}
      <button className="btn btn-success w-full dark:bg-green-700 dark:text-white dark:border-green-700 mt-4" type="submit" disabled={submitting || loading}>{submitting ? 'সাবমিট হচ্ছে...' : '১. নতুন সেলফ টেস্ট শুরু করুন'}</button>
    </form>
  );
}

export default SelfTestCreateForm;
