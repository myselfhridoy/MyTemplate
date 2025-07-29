import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import sha256 from 'js-sha256';
import { MathJaxContext, MathJax } from 'better-react-mathjax';

import { Routes, Route, Navigate } from 'react-router-dom';

function SelfTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // ...existing code...


  // Restore state from localStorage if available (for running exam)
  const getInitialState = () => {
    let initial = {
      step: (!localStorage.getItem('daricomma_access_token')) ? 'login' : 'createSelfTest',
      selfTestExamId: '',
      questions: [],
      answers: {},
      client_server_offset: 0,
      staring_time: null,
      ending_time: null
    };
    try {
      const examState = JSON.parse(localStorage.getItem('daricomma_exam_state'));
      if (examState && examState.step && examState.selfTestExamId && Array.isArray(examState.questions)) {
        let offset = examState.client_server_offset || 0;
        initial = {
          step: examState.step,
          selfTestExamId: examState.selfTestExamId,
          questions: examState.questions,
          answers: examState.answers || {},
          client_server_offset: offset,
          staring_time: examState.staring_time || null,
          ending_time: examState.ending_time || null
        };
      }
    } catch {}
    return initial;
  };
  const initialState = getInitialState();
  const [selfTestExamId, setSelfTestExamId] = useState(initialState.selfTestExamId);
  const [questions, setQuestions] = useState(initialState.questions);
  const [answers, setAnswers] = useState(initialState.answers);
  // Remove step state, use route instead
  const [staringTime, setStaringTime] = useState(initialState.staring_time);
  const [endingTime, setEndingTime] = useState(initialState.ending_time);
  const [clientServerOffset, setClientServerOffset] = useState(initialState.client_server_offset);
  // Always calculate initial timeLeft from staringTime/endingTime/clientServerOffset if present
  const [timeLeft, setTimeLeft] = useState(() => {
    if (
      initialState.questions.length > 0 &&
      initialState.staring_time && initialState.ending_time && typeof initialState.client_server_offset === 'number'
    ) {
      const end = new Date(initialState.ending_time).getTime();
      const left = Math.max(0, Math.floor((end - (Date.now() - initialState.client_server_offset)) / 1000));
      return left;
    }
    return null;
  });

  // Always recalculate timeLeft from staringTime/endingTime/clientServerOffset on mount/refresh if present
  useEffect(() => {
    if (
      questions.length > 0 &&
      staringTime && endingTime && typeof clientServerOffset === 'number'
    ) {
      // Restore answers from localStorage if present
      try {
        const examState = JSON.parse(localStorage.getItem('daricomma_exam_state'));
        if (examState && examState.answers && typeof examState.answers === 'object') {
          setAnswers(examState.answers);
        }
      } catch {}
      // Always recalculate timeLeft from staringTime/endingTime and clientServerOffset
      const end = new Date(endingTime).getTime();
      const left = Math.max(0, Math.floor((end - (Date.now() - clientServerOffset)) / 1000));
      setTimeLeft(left);
    }
  }, [questions.length, staringTime, endingTime, clientServerOffset]);

  // Persist running exam state to localStorage on change
  useEffect(() => {
    if (location.pathname === '/selftest/running' && selfTestExamId && questions.length > 0) {
      const examState = {
        step: 'showQuestions',
        selfTestExamId,
        questions,
        answers,
        client_server_offset: clientServerOffset,
        staring_time: staringTime,
        ending_time: endingTime
      };
      localStorage.setItem('daricomma_exam_state', JSON.stringify(examState));
    }
  }, [location.pathname, selfTestExamId, questions, answers, clientServerOffset, staringTime, endingTime]);

  // অপশন সিলেক্ট আরও ইনস্ট্যান্ট ও ইউজার-ফ্রেন্ডলি
  const handleSelectOption = (qid, idx) => {
    // Prevent selecting if time is up
    if (timeLeft === 0) {
      setToast('সময় শেষ! আর উত্তর দেয়া যাবে না।');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    setAnswers(a => {
      if (a[qid] === idx) return a;
      const updated = { ...a, [qid]: idx };
      // Persist answers to localStorage if exam is ongoing
      try {
        const examState = JSON.parse(localStorage.getItem('daricomma_exam_state'));
        if (examState) {
          examState.answers = updated;
          localStorage.setItem('daricomma_exam_state', JSON.stringify(examState));
        }
      } catch {}
      return updated;
    });
  };

  // Memoized Questions rendering (no ul for options, lean rendering)
  const MemoizedQuestions = memo(({ questions, answers, handleSelectOption, result, isDisabled, answerDetails }) => (
    <ol className="list-decimal ml-6 space-y-4">
      {questions.map((q, idx) => {
        // answerDetails: { [q.id]: { mcq_solution_index, answer_text, explanation_text } }
        const detail = answerDetails ? answerDetails[q.id] : null;
        const correctIdx = detail?.mcq_solution_index;
        const userIdx = answers[q.id];
        const isResult = !!result && correctIdx !== undefined;
        return (
          <li key={q.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
            <div className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              <MathJax>{q.question_text?.blocks?.[0]?.text || 'প্রশ্ন'}</MathJax>
            </div>
            {(q.option || []).map((opt, i) => {
              let optClass = '';
              let icon = null;
              if (isResult) {
                if (i === correctIdx && userIdx === i) {
                  optClass = 'bg-green-100 dark:bg-green-900 font-bold';
                  icon = <span className="ml-1 text-green-600 dark:text-green-300">✔️</span>;
                } else if (i === correctIdx) {
                  optClass = 'bg-green-100 dark:bg-green-900 font-bold';
                  icon = <span className="ml-1 text-green-600 dark:text-green-300">✔️</span>;
                } else if (userIdx === i) {
                  optClass = 'bg-red-100 dark:bg-red-900';
                  icon = <span className="ml-1 text-red-600 dark:text-red-300">❌</span>;
                }
              }
              return (
                <div key={i} className={`mb-1 rounded px-2 py-1 ${optClass} flex items-center gap-2`}>
                  <label className="flex items-center gap-2 cursor-pointer w-full">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={i}
                      checked={answers[q.id] === i}
                      disabled={isDisabled}
                      onChange={() => handleSelectOption(q.id, i)}
                    />
                    <span className="text-gray-900 dark:text-gray-100"><MathJax>{typeof opt === 'string' ? opt : (opt.blocks?.[0]?.text || '')}</MathJax></span>
                    {icon}
                  </label>
                </div>
              );
            })}
            {/* Skipped label */}
            {isResult && userIdx === undefined && (
              <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1 font-semibold">স্কিপ করেছেন</div>
            )}
            {/* উত্তর (answer_text) আলাদা করে দেখান */}
            {detail?.answer_text?.blocks?.[0]?.text && (
              <div className="text-green-700 dark:text-green-300 text-xs mt-2 font-semibold">উত্তর: <MathJax>{detail.answer_text.blocks[0].text}</MathJax></div>
            )}
            {/* ব্যাখ্যা (explanation_text) */}
            {detail?.explanation_text?.blocks?.[0]?.text && (
              <div className="text-blue-700 dark:text-blue-300 text-xs mt-1">ব্যাখ্যা: <MathJax>{detail.explanation_text.blocks[0].text}</MathJax></div>
            )}
          </li>
        );
      })}
    </ol>
  ));
  const [mobile, setMobile] = useState('01965334276');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('daricomma_access_token') || '');
  const [loginStatus, setLoginStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selfTestId, setSelfTestId] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [result, setResult] = useState(null);
  const [timer, setTimer] = useState(null);
  const [toast, setToast] = useState('');
  const timerRef = useRef();
  // For all exams modal/section
  const [showAllExams, setShowAllExams] = useState(false);
  const [allExams, setAllExams] = useState({ completed: [], running: [] });
  const [allExamsLoading, setAllExamsLoading] = useState(false);
  const [allExamsError, setAllExamsError] = useState('');

  // Save accessToken to localStorage when set
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('daricomma_access_token', accessToken);
    } else {
      localStorage.removeItem('daricomma_access_token');
    }
  }, [accessToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginStatus('');
    try {
      // Hash the password before sending
      const hashedPassword = sha256(password);
      const res = await fetch('https://api.daricomma.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password: hashedPassword })
      });
      const data = await res.json();
      if (data.status === 'success' && data.access_token) {
        setAccessToken(data.access_token);
        setLoginStatus('Login successful!');
        setToast('লগইন সফল!');
        setTimeout(() => setToast(''), 2000);
        navigate('/selftest');
      } else {
        setAccessToken('');
        setLoginStatus('Login failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setLoginStatus('Login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Create self-test
  const handleCreateSelfTest = async () => {
    setTestStatus('');
    setQuestions([]);
    setSelfTestExamId('');
    setLoading(true);
    try {
      const res = await fetch('https://api.daricomma.com/v1/self-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          "exam_type": "self_test",
          "exam_class": "HSC",
          "exam_group": "HSC - বিজ্ঞান",
          "exam_standard": "Board Exam",
          "question_type": "MCQ",
          "number_of_question": 25,
          "exam_time": 25,
          "penalty_per_wrong": 0,
          "every_question_mark": 1,
          "chapter_ids": ["cf42bafd-8d8f-49d2-8db4-c2de5e50321e"],
          "subject_names": ["HSC - পদার্থ বিজ্ঞান ১ম পত্র"]
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.self_test_id) {
        setSelfTestId(data.data.self_test_id);
        navigate('/selftest/create-exam');
      } else {
        setTestStatus('Failed to create self test: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setTestStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create self-test exam
  const handleCreateExam = async () => {
    setTestStatus('');
    setQuestions([]);
    setLoading(true);
    try {
      const res = await fetch('https://api.daricomma.com/v1/self-test/exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ self_test_id: selfTestId, name: 'টেস্ট' })
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.self_test_exam_id) {
        setSelfTestExamId(data.data.self_test_exam_id);
        navigate('/selftest/start-exam');
      } else {
        setTestStatus('Failed to create self test exam: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setTestStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Start exam and fetch questions
  const handleStartExam = async () => {
    setTestStatus('');
    setLoading(true);
    try {
      const clientNow = Date.now();
      const res = await fetch(`https://api.daricomma.com/v1/self-test/start-exam/${selfTestExamId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.questions) {
        setQuestions(data.data.questions);
        setTestStatus('Questions loaded!');
        setAnswers({});
        setToast('প্রশ্ন লোড হয়েছে!');
        setTimeout(() => setToast(''), 2000);
        navigate('/selftest/running');
        // Use staring_time and ending_time from API
        const { staring_time, ending_time } = data.data;
        if (staring_time && ending_time) {
          setStaringTime(staring_time);
          setEndingTime(ending_time);
          // Calculate client-server offset
          const serverStart = new Date(staring_time).getTime();
          const offset = clientNow - serverStart;
          setClientServerOffset(offset);
          const end = new Date(ending_time).getTime();
          const left = Math.max(0, Math.floor((end - (Date.now() - offset)) / 1000));
          setTimeLeft(left);
        } else {
          setStaringTime(null);
          setEndingTime(null);
          setClientServerOffset(0);
          setTimeLeft(25 * 60); // fallback
        }
      } else {
        setTestStatus('Failed to load questions: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setTestStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  // Timer interval management: always start timer if step==='showQuestions' and timeLeft>0
  useEffect(() => {
    if (location.pathname === '/selftest/running' && questions.length > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (endingTime && typeof clientServerOffset === 'number') {
          const end = new Date(endingTime).getTime();
          const left = Math.max(0, Math.floor((end - (Date.now() - clientServerOffset)) / 1000));
          setTimeLeft(left);
        } else {
          setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [location.pathname, questions.length, endingTime, clientServerOffset]);

  // Only auto-submit if timer transitions to 0 due to timer tick (not on mount/refresh)
  const autoSubmitTriggeredRef = useRef(false);
  const timerHasTickedRef = useRef(false);
  useEffect(() => {
    if (location.pathname === '/selftest/running' && questions.length > 0) {
      if (timeLeft > 0) {
        autoSubmitTriggeredRef.current = false;
        timerHasTickedRef.current = true;
      }
      if (timeLeft === 0 && !submitStatus && !autoSubmitTriggeredRef.current) {
        // Only auto-submit if timer has ticked since mount (i.e., not on initial mount/refresh)
        if (timerHasTickedRef.current) {
          autoSubmitTriggeredRef.current = true;
          handleSubmitExam(true);
        }
      }
    }
  }, [timeLeft, location.pathname, questions.length, submitStatus]);

  // Step 4: Submit exam (all skipped/null by default)
  const handleSubmitExam = async (auto = false) => {
    // Prevent manual submit if time is up
    if (!auto && timeLeft === 0) {
      setToast('সময় শেষ! সাবমিট করা যাবে না।');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    setSubmitStatus('');
    setResult(null);
    setLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const submitData = questions.map(q => ({
        question_id: q.id,
        mcq_option: answers[q.id] !== undefined ? answers[q.id] : null
      }));
      const res = await fetch(`https://api.daricomma.com/v1/self-test/submit-exam/${selfTestExamId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ submitData })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSubmitStatus(auto ? 'সময় শেষ! অটো সাবমিট হয়েছে।' : 'Exam submitted!');
        setTimeLeft(null);
        setToast('সাবমিট সফল!');
        setTimeout(() => setToast(''), 2000);
        navigate('/selftest/result');
        // Fetch result and answers immediately after submit
        handleFetchResult();
      } else {
        setSubmitStatus('Failed to submit exam: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setSubmitStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Fetch result and answers
  const [answerDetails, setAnswerDetails] = useState({});
  // answersForResult: user's answers for result view (from submitData in answer API)
  const [answersForResult, setAnswersForResult] = useState({});
  const handleFetchResult = async (examId) => {
    const id = examId || selfTestExamId;
    if (!id) {
      setToast('পরীক্ষার আইডি পাওয়া যায়নি!');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Fetch result
      const res = await fetch(`https://api.daricomma.com/v1/self-test/result/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setResult(data.data);
        setToast('রেজাল্ট লোড হয়েছে!');
        setTimeout(() => setToast(''), 2000);
        // Fetch answers
        const ansRes = await fetch(`https://api.daricomma.com/v1/self-test/answer/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const ansData = await ansRes.json();
        if (ansData.status === 'success' && ansData.data?.questions) {
          // Map: { [q.id]: { mcq_solution_index, answer_text, explanation_text } }
          const map = {};
          for (const q of ansData.data.questions) {
            map[q.id] = {
              mcq_solution_index: q.mcq_solution_index,
              answer_text: q.answer_text,
              explanation_text: q.explanation_text
            };
          }
          setAnswerDetails(map);
          // Also set answersForResult from submitData (user's answers)
          if (Array.isArray(ansData.data.submitData)) {
            const ansMap = {};
            for (const s of ansData.data.submitData) {
              ansMap[s.question_id] = s.mcq_option;
            }
            setAnswersForResult(ansMap);
          } else {
            setAnswersForResult({});
          }
        }
      } else {
        setSubmitStatus('Failed to fetch result: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setSubmitStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Timer display helper
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // হোমে যান/লগআউট বাটন হ্যান্ডলার
  // হোমে যান বাটন হ্যান্ডলার (লগআউট নয়, শুধু পরীক্ষার স্টেট রিসেট)
  const handleGoHome = () => {
    // localStorage.removeItem('daricomma_exam_state'); // স্টেট মুছবেন না
    setSelfTestExamId('');
    setQuestions([]);
    setAnswers({});
    // Do NOT clear timeLeft, staringTime, endingTime, or clientServerOffset here!
    // setTimeLeft(null);
    // setStaringTime(null);
    // setEndingTime(null);
    // setClientServerOffset(0);
    navigate('/selftest');
    setResult(null);
    setSubmitStatus('');
    setTestStatus('');
    setAnswerDetails({});
    setSelfTestId('');
    setShowAllExams(false);
    setAllExams({ completed: [], running: [] });
    setAllExamsLoading(false);
    setAllExamsError('');
    setToast('হোমে ফিরে গেছেন');
    setTimeout(() => setToast(''), 1500);
  };

  // Fetch all exams when modal opens
  const fetchAllExams = React.useCallback(async () => {
    setAllExamsLoading(true);
    setAllExamsError('');
    try {
      const res = await fetch('https://api.daricomma.com/v1/self-test/all-self-test-exam', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setAllExams({
          completed: data.data.completedExams || [],
          running: data.data.runningExams || []
        });
      } else {
        setAllExamsError('ডেটা লোড হয়নি: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      setAllExamsError('ত্রুটি: ' + err.message);
    } finally {
      setAllExamsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (showAllExams) {
      fetchAllExams();
    }
    // eslint-disable-next-line
  }, [showAllExams, fetchAllExams]);

  // Helper: For running exams, fetch questions from API. For completed exams, fetch from /answer API.
  const fetchQuestionsForExam = async (examId, isCompleted = false) => {
    if (!examId) return [];
    if (isCompleted) {
      // For completed exams, get questions from /answer API
      try {
        const ansRes = await fetch(`https://api.daricomma.com/v1/self-test/answer/${examId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const ansData = await ansRes.json();
        if (ansData.status === 'success' && Array.isArray(ansData.data?.questions)) {
          return ansData.data.questions;
        }
      } catch {}
      return [];
    } else {
      // For running exams, you may fetch from localStorage or API if needed (not used for completed)
      return [];
    }
  };

  // In the All Exams Modal, update the button handlers:
  // Replace the onClick for running exams:
  // setSelfTestExamId(exam.id);
  // setQuestions(exam.questions || []);
  // setAnswers(exam.answers || {});
  // setStaringTime(exam.staring_time || null);
  // setEndingTime(exam.ending_time || null);
  // setClientServerOffset(exam.client_server_offset || 0);
  // setShowAllExams(false);
  // navigate('/selftest/running');

  // With this:
  // onClick={async () => {
  //   setSelfTestExamId(exam.id);
  //   setStaringTime(exam.staring_time || null);
  //   setEndingTime(exam.ending_time || null);
  //   setClientServerOffset(exam.client_server_offset || 0);
  //   setShowAllExams(false);
  //   const qs = await fetchQuestionsForExam(exam.id);
  //   setQuestions(qs);
  //   setAnswers({});
  //   navigate('/selftest/running');
  // }}

  // For completed exams, update both button handlers:
  // onClick={async () => {
  //   setSelfTestExamId(exam.id);
  //   setShowAllExams(false);
  //   setAnswerDetails({});
  //   setResult(null);
  //   const qs = await fetchQuestionsForExam(exam.id);
  //   setQuestions(qs);
  //   setAnswers({});
  //   navigate('/selftest/result');
  // }}
  // and
  // onClick={async () => {
  //   setSelfTestExamId(exam.id);
  //   setShowAllExams(false);
  //   const qs = await fetchQuestionsForExam(exam.id);
  //   setQuestions(qs);
  //   setAnswers({});
  //   // Fetch result and answers before navigating
  //   await handleFetchResult(exam.id);
  //   navigate('/selftest/result');
  // }}
  // ...existing code...
  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    }}>
      <div className="container mx-auto p-4 max-w-5xl bg-white dark:bg-gray-900 min-h-screen" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-12 w-12 text-blue-600 dark:text-blue-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <div className="text-lg text-blue-700 dark:text-blue-200 font-semibold">লোড হচ্ছে...</div>
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">সেলফ টেস্ট (দাঁড়িকমা)</h1>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow z-50 animate-bounce">{toast}</div>
        )}
        <Routes>
          <Route path="login" element={
            <form onSubmit={handleLogin} className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block mb-1 text-gray-900 dark:text-gray-100">মোবাইল নম্বর</label>
                <input className="input input-bordered w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={mobile} onChange={e => setMobile(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1 text-gray-900 dark:text-gray-100">পাসওয়ার্ড</label>
                <input className="input input-bordered w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button className="btn btn-primary w-full dark:bg-blue-700 dark:text-white dark:border-blue-700" type="submit" disabled={loading}>{loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}</button>
              {loginStatus && <div className="mt-4 text-center text-blue-700 dark:text-blue-300">{loginStatus}</div>}
            </form>
          } />
          <Route index element={accessToken ? (
            <div className="mt-8 space-y-4">
              <button className="btn btn-success w-full dark:bg-green-700 dark:text-white dark:border-green-700" onClick={handleCreateSelfTest} disabled={loading}>১. নতুন সেলফ টেস্ট শুরু করুন</button>
              <button className="btn btn-outline w-full dark:bg-gray-800 dark:text-white dark:border-gray-700" onClick={() => { setLoading(true); setShowAllExams(true); }} disabled={loading}>সকল পরীক্ষা দেখুন</button>
              {testStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{testStatus}</div>}
              {/* All Exams Modal */}
              {showAllExams && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full relative max-h-[90vh] overflow-y-auto" style={{maxWidth:'100vw', minWidth:'0'}}>
                    <button className="absolute top-2 right-2 text-xl" onClick={() => {
                      setShowAllExams(false);
                      setTimeout(() => setLoading(false), 0);
                    }}>&times;</button>
                    <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">সকল পরীক্ষা</h2>
                    <button className="btn btn-sm btn-info mb-2" onClick={fetchAllExams}>রিফ্রেশ করুন</button>
                    {allExamsLoading && <div>লোড হচ্ছে...</div>}
                    {allExamsError && <div className="text-red-500">{allExamsError}</div>}
                    <div className="mt-2 px-2 md:px-8 lg:px-16 xl:px-32 2xl:px-48">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">চলমান পরীক্ষা</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 mb-4">
                        {allExams.running.length === 0 && <div className="text-gray-500 col-span-full">কোনো চলমান পরীক্ষা নেই</div>}
                        {allExams.running.map(exam => (
                          <div
                            key={exam.id}
                            className="transition-all duration-200 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 flex flex-col justify-between shadow-md hover:shadow-lg hover:border-yellow-400 dark:hover:border-yellow-400 cursor-pointer min-h-[120px] sm:min-h-[140px] md:min-h-[160px]"
                          >
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-base md:text-lg truncate">{exam.name || 'Exam'}</div>
                              <div className="block text-xs font-normal text-gray-700 dark:text-gray-300 truncate mb-1">{exam.subject_names?.join(', ')}</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                className="btn btn-xs btn-warning w-full"
                                onClick={async () => {
                                setLoading(true);
                                try {
                                  const clientNow = Date.now();
                                  const res = await fetch(`https://api.daricomma.com/v1/self-test/start-exam/${exam.id}`, {
                                    method: 'GET',
                                    headers: { 'Authorization': `Bearer ${accessToken}` }
                                  });
                                  const data = await res.json();
                                  if (data.status === 'success' && data.data?.questions) {
                                    setSelfTestExamId(exam.id);
                                    setShowAllExams(false);
                                    setAnswers({});
                                    setQuestions(data.data.questions);
                                    // Use staring_time and ending_time from API
                                    const { staring_time, ending_time } = data.data;
                                    if (staring_time && ending_time) {
                                      setStaringTime(staring_time);
                                      setEndingTime(ending_time);
                                      // Calculate client-server offset
                                      const serverStart = new Date(staring_time).getTime();
                                      const offset = clientNow - serverStart;
                                      setClientServerOffset(offset);
                                      const end = new Date(ending_time).getTime();
                                      const left = Math.max(0, Math.floor((end - (Date.now() - offset)) / 1000));
                                      setTimeLeft(left);
                                    } else {
                                      setStaringTime(null);
                                      setEndingTime(null);
                                      setClientServerOffset(0);
                                      setTimeLeft(25 * 60);
                                    }
                                    navigate('/selftest/running');
                                  } else {
                                    setToast('পরীক্ষা লোড হয়নি: ' + (data.message || 'Unknown error'));
                                    setTimeout(() => setToast(''), 2000);
                                  }
                                } catch (err) {
                                  setToast('ত্রুটি: ' + err.message);
                                  setTimeout(() => setToast(''), 2000);
                                } finally {
                                  setLoading(false);
                                }
                              }}>পরীক্ষা চালিয়ে যান</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">সমাপ্ত পরীক্ষা</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
                        {allExams.completed.length === 0 && <div className="text-gray-500 col-span-full">কোনো সমাপ্ত পরীক্ষা নেই</div>}
                        {allExams.completed.map(exam => (
                          <div
                            key={exam.id}
                            className="transition-all duration-200 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-xl p-4 flex flex-col justify-between shadow-md hover:shadow-lg hover:border-green-400 dark:hover:border-green-400 cursor-pointer min-h-[120px] sm:min-h-[140px] md:min-h-[160px]"
                          >
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-base md:text-lg truncate">{exam.name || 'Exam'}
                                {(
                                  (typeof exam.score === 'number' && typeof exam.total_score === 'number') ||
                                  (exam.score && typeof exam.score.score === 'number' && typeof exam.score.total_score === 'number')
                                ) && (
                                  <span className="ml-2 text-xs text-green-700 dark:text-green-300 font-semibold">
                                    স্কোর: {
                                      typeof exam.score === 'number'
                                        ? exam.score
                                        : exam.score?.score
                                    } / {
                                      typeof exam.total_score === 'number'
                                        ? exam.total_score
                                        : exam.score?.total_score
                                    }
                                  </span>
                                )}
                              </div>
                              <div className="block text-xs font-normal text-gray-700 dark:text-gray-300 truncate mb-1">{exam.subject_names?.join(', ')}</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                className="btn btn-xs btn-info w-full"
                                onClick={async () => {
                                setSelfTestExamId(exam.id);
                                setShowAllExams(false);
                                setAnswerDetails({});
                                setResult(null);
                                setQuestions([]);
                                setAnswers({});
                                // For completed exams, get questions from /answer API
                                const qs = await fetchQuestionsForExam(exam.id, true);
                                setQuestions(qs);
                                await handleFetchResult(exam.id);
                                navigate('/selftest/result');
                              }}>রেজাল্ট</button>
                              <button
                                className="btn btn-xs btn-success w-full"
                                onClick={async () => {
                                setSelfTestExamId(exam.id);
                                setShowAllExams(false);
                                setAnswerDetails({});
                                setResult(null);
                                setQuestions([]);
                                setAnswers({});
                                // For completed exams, get questions from /answer API
                                const qs = await fetchQuestionsForExam(exam.id, true);
                                setQuestions(qs);
                                await handleFetchResult(exam.id);
                                navigate('/selftest/result');
                              }}>উত্তর দেখুন</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : <Navigate to="/selftest/login" replace />} />
          <Route path="create-exam" element={accessToken ? (
            <div className="mt-8 space-y-4">
              <button className="btn btn-info w-full dark:bg-blue-700 dark:text-white dark:border-blue-700" onClick={handleCreateExam} disabled={loading || !selfTestId}>২. এক্সাম তৈরি করুন</button>
              {testStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{testStatus}</div>}
            </div>
          ) : <Navigate to="/selftest/login" replace />} />
          <Route path="start-exam" element={accessToken ? (
            <div className="mt-8 space-y-4">
              <button className="btn btn-warning w-full dark:bg-yellow-700 dark:text-white dark:border-yellow-700" onClick={handleStartExam} disabled={loading}>৩. প্রশ্ন লোড করুন</button>
              {testStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{testStatus}</div>}
              {/* Show timer and submit if questions are loaded (for running exam started but not navigated yet) */}
              {questions.length > 0 && (
                <>
                  <div className="fixed top-0 left-0 w-full z-40 flex justify-center pointer-events-none">
                    <div className="flex items-center gap-4 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow px-4 py-2 rounded-b-lg mt-0 max-w-2xl mx-auto w-full pointer-events-auto">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">সময় বাকি: {timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
                      <button className="btn btn-sm btn-error ml-auto" onClick={handleGoHome}>হোমে যান</button>
                      <button
                        className="btn btn-primary dark:bg-blue-700 dark:text-white dark:border-blue-700 ml-2"
                        onClick={() => handleSubmitExam(false)}
                        disabled={loading || timeLeft === 0}
                      >
                        সাবমিট করুন
                      </button>
                    </div>
                  </div>
                  <div className="mt-8 pt-20 space-y-4"> {/* Padding for floating bar */}
                    <MemoizedQuestions
                      questions={questions}
                      answers={answers}
                      handleSelectOption={handleSelectOption}
                      result={null}
                      isDisabled={timeLeft === 0}
                      answerDetails={{}}
                    />
                    {submitStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{submitStatus}</div>}
                  </div>
                </>
              )}
            </div>
          ) : <Navigate to="/selftest/login" replace />} />
          <Route path="running" element={accessToken && questions.length > 0 ? (
            <>
              {/* Floating timer and submit button at the top, always visible */}
              <div className="fixed top-0 left-0 w-full z-50 flex justify-center pointer-events-none">
                <div className="flex items-center justify-between gap-4 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow px-4 py-2 rounded-b-lg mt-0 max-w-2xl mx-auto w-full pointer-events-auto">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">সময় বাকি: {timeLeft !== null ? formatTime(timeLeft) : '--:--'}</span>
                  <div className="flex gap-2 ml-auto">
                    <button className="btn btn-sm btn-error" onClick={handleGoHome}>হোমে যান</button>
                    <button
                      className="btn btn-primary dark:bg-blue-700 dark:text-white dark:border-blue-700"
                      onClick={() => handleSubmitExam(false)}
                      disabled={loading || timeLeft === 0}
                    >
                      সাবমিট করুন
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-20 space-y-4"> {/* Padding for floating bar */}
                <MemoizedQuestions
                  questions={questions}
                  answers={answers}
                  handleSelectOption={handleSelectOption}
                  result={null}
                  isDisabled={timeLeft === 0}
                  answerDetails={{}}
                />
                {submitStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{submitStatus}</div>}
              </div>
            </>
          ) : <Navigate to="/selftest" replace />} />
          <Route path="result" element={accessToken && questions.length > 0 ? (
            <div className="mt-8 bg-green-50 dark:bg-green-950 p-4 rounded shadow border border-green-200 dark:border-green-900">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">রেজাল্ট</span>
                <button className="btn btn-sm btn-error" onClick={handleGoHome}>হোমে যান</button>
              </div>
              {result ? (
                <div className="mb-4">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">সঠিক: {result.score ?? '--'} / {result.total_score ?? '--'}</div>
                  <div className="text-gray-700 dark:text-gray-200 text-sm">ভুল: {result.wrong ?? '--'} | স্কিপ: {result.skipped ?? '--'}</div>
                  {result.subjectWiseScores && result.subjectWiseScores.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">বিষয়ভিত্তিক স্কোর:</div>
                      <ul className="list-disc ml-6">
                        {result.subjectWiseScores.map(sub => (
                          <li key={sub.id}>{sub.name}: {sub.score} / {sub.total_score} (ভুল: {sub.wrong}, স্কিপ: {sub.skipped})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4 text-blue-700 dark:text-blue-300">রেজাল্ট লোড হচ্ছে...</div>
              )}
              <div className="mt-6">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">উত্তর ও ব্যাখ্যা</div>
                <MemoizedQuestions
                  questions={questions}
                  answers={answersForResult}
                  handleSelectOption={() => {}}
                  result={result}
                  isDisabled={true}
                  answerDetails={answerDetails}
                />
              </div>
            </div>
          ) : <Navigate to="/selftest" replace />} />
        </Routes>
      </div>
    </MathJaxContext>
  );
}

export default SelfTestPage;
