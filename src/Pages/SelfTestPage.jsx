// ...existing code...
import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import sha256 from 'js-sha256';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { Routes, Route, Navigate } from 'react-router-dom';
import SelfTestCreateForm from './SelfTestCreateForm';
import ExamStartForm from './ExamStartForm';
import SelfTestRegister from './SelfTestRegister';
import IOSButton from '../Components/ios/iOSButton';
import IOSCard from '../Components/ios/iOSCard';
import IOSInput from '../Components/ios/iOSInput';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';

function SelfTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
    } catch { /* Restore defaults when persisted exam data is invalid. */ }
    return initial;
  };
  const initialState = getInitialState();
  const [selfTestExamId, setSelfTestExamId] = useState(initialState.selfTestExamId);
  const [questions, setQuestions] = useState(initialState.questions);
  const [answers, setAnswers] = useState(initialState.answers);
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
      return Math.max(0, Math.floor((end - (Date.now() - initialState.client_server_offset)) / 1000));
    }
    return 0;
  });

  const handleLogout = () => {
    setAccessToken('');
    setLoginStatus('');
    localStorage.removeItem('daricomma_access_token');
    localStorage.removeItem('daricomma_exam_state');
    setToast('লগআউট সফল!');
    setTimeout(() => setToast(''), 2000);
    navigate('/selftest/login');
  };

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
      } catch { /* Keep the current answers if persisted state cannot be read. */ }
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
      } catch { /* The in-memory answer remains usable if storage is unavailable. */ }
      return updated;
    });
  };

  // Memoized Questions rendering (no ul for options, lean rendering)
  const MemoizedQuestions = memo(({ questions, answers, handleSelectOption, result, isDisabled, answerDetails }) => (
    <ol className="space-y-3">
      {questions.map((q) => {
        // answerDetails: { [q.id]: { mcq_solution_index, answer_text, explanation_text } }
        const detail = answerDetails ? answerDetails[q.id] : null;
        const correctIdx = detail?.mcq_solution_index;
        const userIdx = answers[q.id];
        const isResult = !!result && correctIdx !== undefined;
        return (
          <li key={q.id} className="ios-card list-none p-3">
            <div className="mb-2 text-sm font-semibold text-base-content">
              {(q.question_text?.blocks?.[0]?.text)
                ? <MathJax>{q.question_text.blocks[0].text}</MathJax>
                : 'প্রশ্ন'}
            </div>
            {(q.option || []).map((opt, i) => {
              let optClass = 'border-base-content/15';
              let icon = null;
              if (isResult) {
                if (i === correctIdx && userIdx === i) {
                  optClass = 'border-success bg-success/10';
                  icon = <span className="ml-1 text-success">✔️</span>;
                } else if (i === correctIdx) {
                  optClass = 'border-success bg-success/10';
                  icon = <span className="ml-1 text-success">✔️</span>;
                } else if (userIdx === i) {
                  optClass = 'border-error bg-error/10';
                  icon = <span className="ml-1 text-error">❌</span>;
                }
              } else if (userIdx === i) {
                optClass = 'border-primary bg-primary/5';
              }
              return (
                <div key={i} className={`mb-1.5 rounded-lg border px-2.5 py-2 ${optClass}`}>
                  <label className="flex w-full cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={i}
                      checked={answers[q.id] === i}
                      disabled={isDisabled}
                      onChange={() => handleSelectOption(q.id, i)}
                    />
                    <span className="flex-1 text-[13px] text-base-content">
                      {typeof opt === 'string' && opt
                        ? <MathJax>{opt}</MathJax>
                        : (opt?.blocks?.[0]?.text
                            ? <MathJax>{opt.blocks[0].text}</MathJax>
                            : null)}
                    </span>
                    {icon}
                  </label>
                </div>
              );
            })}
            {/* Skipped label */}
            {isResult && userIdx === undefined && (
              <div className="mt-1 text-[11px] font-semibold text-warning">স্কিপ করেছেন</div>
            )}
            {/* উত্তর (answer_text) আলাদা করে দেখান */}
            {detail?.answer_text?.blocks?.[0]?.text && (
              <div className="mt-2 break-words whitespace-pre-line text-[11px] font-semibold text-success">
                উত্তর: <span className="break-words">
                  {detail.answer_text.blocks[0].text
                    ? <MathJax>{detail.answer_text.blocks[0].text}</MathJax>
                    : null}
                </span>
              </div>
            )}
            {/* ব্যাখ্যা (explanation_text) */}
            {detail?.explanation_text?.blocks?.[0]?.text && (
              <div className="mt-1 break-words whitespace-pre-line text-[11px] text-info">
                ব্যাখ্যা: <span className="break-words">
                  {detail.explanation_text.blocks[0].text
                    ? <MathJax>{detail.explanation_text.blocks[0].text}</MathJax>
                    : null}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  ));
  const [mobile, setMobile] = useState('01xxxxxxxx');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('daricomma_access_token') || '');
  const [loginStatus, setLoginStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [selfTestId, setSelfTestId] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [result, setResult] = useState(null);
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

  // Step 2: Create self-test exam
  const handleCreateExam = async (examName = 'টেস্ট') => {
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
        body: JSON.stringify({ self_test_id: selfTestId, name: examName || 'টেস্ট' })
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
    // The timer transition and ref guard control this effect; the submit handler is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } catch { /* Completed exam questions are optional if the API lookup fails. */ }
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
  const [deleteExamModal, setDeleteExamModal] = useState(null);

  const handleDeleteExam = async (examId) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.daricomma.com/v1/self-test/self-test-exam/${examId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setAllExams(prev => ({
          ...prev,
          completed: prev.completed.filter(e => e.id !== examId)
        }));
        setToast('পরীক্ষা ডিলেট হয়েছে');
        setTimeout(() => setToast(''), 2000);
      } else {
        setToast('ডিলেট হয়নি: ' + (data.message || 'Unknown error'));
        setTimeout(() => setToast(''), 2000);
      }
    } catch (err) {
      setToast('ডিলেট ত্রুটি: ' + err.message);
      setTimeout(() => setToast(''), 2000);
    } finally {
      setLoading(false);
      setDeleteExamModal(null);
    }
  };

  const RunningHeader = () => (
    <div className="no-print fixed left-0 right-0 top-14 z-30 px-3">
      <div className="ios-glass mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-base-content/10 px-3 py-2 shadow-lg">
        <span className="font-mono text-lg font-bold tabular-nums text-primary">
          ⏱ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleGoHome}
          className="ios-pressable rounded-lg bg-base-200 px-3 py-1.5 text-[12px] font-semibold"
        >
          হোম
        </button>
        <button
          type="button"
          onClick={() => handleSubmitExam(false)}
          disabled={loading || timeLeft === 0}
          className="ios-pressable rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          সাবমিট
        </button>
      </div>
    </div>
  );

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    }}>
      <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <div className="mx-auto max-w-2xl px-3 pt-4 sm:px-4">
        {location.pathname !== '/selftest/running' && (
          <div className="no-print mb-4 flex items-center justify-between">
            <div>
              <h1 className="ios-title mb-1">Self Test</h1>
              <p className="ios-caption">নিজেকে যাচাই করুন</p>
            </div>
            {accessToken && (
              <IOSButton onClick={handleLogout} variant="danger" size="sm">
                লগআউট
              </IOSButton>
            )}
          </div>
        )}
        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <IOSCard className="flex flex-col items-center gap-3 p-6">
              <IOSSpinner size="lg" />
              <p className="text-sm font-semibold">লোড হচ্ছে…</p>
            </IOSCard>
          </div>
        )}
        {/* Optionally add contextText/headingText if needed, like CreativeCQPage */}
        {toast && (
          <div className="ios-pop fixed left-1/2 top-20 z-[999] -translate-x-1/2">
            <div className="rounded-full bg-success px-4 py-2 text-sm font-semibold text-white shadow-2xl">{toast}</div>
          </div>
        )}
        <Routes>
          <Route path="register" element={<SelfTestRegister />} />
          <Route path="login" element={
            <>
              <IOSCard className="mb-3 p-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <IOSInput
                    label="মোবাইল নম্বর"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="01xxxxxxxx"
                    required
                  />
                  <IOSInput
                    label="পাসওয়ার্ড"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <IOSButton type="submit" loading={loading} fullWidth size="lg">
                    লগইন করুন
                  </IOSButton>
                  {loginStatus && <p className="text-center text-sm text-info">{loginStatus}</p>}
                </form>
              </IOSCard>
              <div className="text-center text-sm text-base-content/60">
                নতুন একাউন্ট?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/selftest/register')}
                  className="ios-pressable font-semibold text-primary"
                >
                  রেজিস্ট্রেশন করুন
                </button>
              </div>
            </>
          } />
          <Route index element={accessToken ? (
            <div className="space-y-4">
              <SelfTestCreateForm accessToken={accessToken} onSuccess={(id) => { setSelfTestId(id); navigate('/selftest/create-exam'); }} />
              <IOSButton
                onClick={() => setShowAllExams(true)}
                disabled={loading}
                variant="secondary"
                fullWidth
                className="mt-3"
              >
                সকল পরীক্ষা দেখুন
              </IOSButton>
              {testStatus && <p className="mt-2 text-center text-sm text-info">{testStatus}</p>}
              {/* All Exams Modal */}
              <IOSSheet
                open={showAllExams}
                onClose={() => { setShowAllExams(false); setLoading(false); }}
                title="সকল পরীক্ষা"
                maxHeight="92vh"
              >
                  <div className="space-y-4 p-4">
                    <IOSButton onClick={fetchAllExams} variant="secondary" fullWidth size="sm">
                      🔄 রিফ্রেশ করুন
                    </IOSButton>
                    {allExamsLoading && <div className="flex justify-center py-6"><IOSSpinner size="lg" /></div>}
                    {allExamsError && <p className="text-center text-sm text-error">{allExamsError}</p>}
                    <div className="space-y-4">
                      <div>
                      <div className="mb-2 text-xs font-bold uppercase text-base-content/50">চলমান পরীক্ষা</div>
                      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {allExams.running.length === 0 && <div className="col-span-full py-2 text-sm text-base-content/40">কোনো চলমান পরীক্ষা নেই</div>}
                        {allExams.running.map(exam => (
                          <IOSCard key={exam.id} className="flex flex-col justify-between border-l-4 border-warning p-3">
                            <div className="flex flex-col gap-1">
                              <div className="truncate text-base font-semibold text-base-content">{exam.name || 'Exam'}</div>
                              <div className="mb-1 truncate text-xs text-base-content/60">{exam.subject_names?.join(', ')}</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                className="ios-pressable w-full rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning"
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
                          </IOSCard>
                        ))}
                      </div>
                      </div>
                      <div>
                      <div className="mb-2 text-xs font-bold uppercase text-base-content/50">সমাপ্ত পরীক্ষা</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {allExams.completed.length === 0 && <div className="col-span-full py-2 text-sm text-base-content/40">কোনো সমাপ্ত পরীক্ষা নেই</div>}
                        {allExams.completed.map(exam => (
                          <IOSCard key={exam.id} className="flex flex-col justify-between border-l-4 border-success p-3">
                            <div className="flex flex-col gap-1">
                              <div className="truncate text-base font-semibold text-base-content">{exam.name || 'Exam'}
                                {(
                                  (typeof exam.score === 'number' && typeof exam.total_score === 'number') ||
                                  (exam.score && typeof exam.score.score === 'number' && typeof exam.score.total_score === 'number')
                                ) && (
                                  <span className="ml-2 text-xs font-semibold text-success">
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
                              <div className="mb-1 truncate text-xs text-base-content/60">{exam.subject_names?.join(', ')}</div>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                              <button
                                className="ios-pressable w-full rounded-lg bg-info/10 px-2 py-1.5 text-[11px] font-bold text-info"
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
                                className="ios-pressable w-full rounded-lg bg-success/10 px-2 py-1.5 text-[11px] font-bold text-success"
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
                              <button
                                className="ios-pressable w-full rounded-lg bg-error/10 px-2 py-1.5 text-[11px] font-bold text-error"
                                onClick={() => setDeleteExamModal({ id: exam.id, name: exam.name })}
                              >ডিলেট</button>
                            </div>
                            </IOSCard>
                        ))}
                      </div>
                    </div>
                  </div>
                  </div>
              </IOSSheet>
            </div>
          ) : <Navigate to="/selftest/login" replace />} />
          <Route path="create-exam" element={accessToken ? (
            <ExamStartForm
              loading={loading}
              onStart={handleCreateExam}
              selfTestId={selfTestId}
              testStatus={testStatus}
            />
          ) : <Navigate to="/selftest/login" replace />} />
          <Route path="start-exam" element={accessToken ? (
            <div className="space-y-3">
              <IOSButton onClick={handleStartExam} loading={loading} fullWidth size="lg">
                ৩. প্রশ্ন লোড করুন
              </IOSButton>
              {testStatus && <p className="text-center text-sm text-info">{testStatus}</p>}
              {/* Show timer and submit if questions are loaded (for running exam started but not navigated yet) */}
              {questions.length > 0 && (
                <>
                  <RunningHeader />
                  <div className="mt-16 space-y-3">
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
              <RunningHeader />
              <div className="mt-20 space-y-3">
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
            <IOSCard className="mt-4 border border-success/20 bg-success/5 p-3 sm:p-4">
              <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <span className="text-lg font-bold text-base-content">রেজাল্ট</span>
                <IOSButton size="sm" variant="danger" fullWidth className="sm:w-auto" onClick={handleGoHome}>হোমে যান</IOSButton>
              </div>
              {result ? (
                <div className="mb-4">
                  <div className="font-semibold text-base-content">সঠিক: {result.score ?? '--'} / {result.total_score ?? '--'}</div>
                  <div className="text-sm text-base-content/70">ভুল: {result.wrong ?? '--'} | স্কিপ: {result.skipped ?? '--'}</div>
                  {result.subjectWiseScores && result.subjectWiseScores.length > 0 && (
                    <div className="mt-2">
                      <div className="font-semibold text-base-content">বিষয়ভিত্তিক স্কোর:</div>
                      <ul className="ml-6 list-disc text-sm text-base-content/80">
                        {result.subjectWiseScores.map(sub => (
                          <li key={sub.id}>{sub.name}: {sub.score} / {sub.total_score} (ভুল: {sub.wrong}, স্কিপ: {sub.skipped})</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4 text-sm text-info">রেজাল্ট লোড হচ্ছে...</div>
              )}
              <div className="mt-4 sm:mt-6">
                <div className="mb-2 font-semibold text-base-content">উত্তর ও ব্যাখ্যা</div>
                <div className="overflow-x-auto">
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
            </IOSCard>
          ) : <Navigate to="/selftest" replace />} />
        </Routes>
        {/* Delete confirmation modal */}
        {deleteExamModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
            <IOSCard className="w-full max-w-sm p-5 text-center">
              <div className="mb-2 text-4xl">⚠️</div>
              <p className="ios-headline mb-1">ডিলেট কনফার্মেশন</p>
              <p className="mb-5 text-sm text-base-content/60">
                আপনি কি নিশ্চিতভাবে <span className="font-bold text-error">{deleteExamModal.name || 'এই পরীক্ষা'}</span> ডিলেট করতে চান?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <IOSButton onClick={() => setDeleteExamModal(null)} variant="secondary" fullWidth>
                  বাতিল
                </IOSButton>
                <IOSButton onClick={() => handleDeleteExam(deleteExamModal.id)} variant="danger" fullWidth>
                  ডিলেট
                </IOSButton>
              </div>
            </IOSCard>
          </div>
        )}
        </div>
      </div>

    </MathJaxContext>
  );
}

export default SelfTestPage;
