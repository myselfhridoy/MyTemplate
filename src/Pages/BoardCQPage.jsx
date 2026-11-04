import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { toPng } from 'html-to-image';
import mappingData from '../Components/Mapping/Mapping.json';
import AskAIModalMongoDB from '../Components/AskAI/AskAIModalMongoDB';
import MCQCard from '../Components/MCQCard/MCQCard';
import IOSButton from '../Components/ios/iOSButton';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';

const API_BASE = 'https://geminiai-render.onrender.com/api/nctb-questions/board-questions';
const PAGE_SIZE = 15;
const bn = (number) => String(number).split('').map((digit) => '০১২৩৪৫৬৭৮৯'[digit] ?? digit).join('');
const bn2en = (value) => (value || '').replace(/[০-৯]/g, (digit) => '০১২৩৪৫৬৭৮৯'.indexOf(digit));
const extractYear = (source) => {
  const match = bn2en(source).match(/(20\d{2}|19\d{2})/);
  return match ? parseInt(match[0], 10) : 0;
};

const FILTER_OPTIONS = [
  { value: 'cq', label: 'সৃজনশীল' },
  { value: 'ka', label: 'ক (জ্ঞানমূলক)' },
  { value: 'kha', label: 'খ (অনুধাবন)' },
  { value: 'ga', label: 'গ (প্রয়োগ)' },
  { value: 'gha', label: 'ঘ (উচ্চতর দক্ষতা)' },
];

const VIEW_TYPES = [
  { value: 'all', label: 'প্রশ্ন ও উত্তর' },
  { value: 'question', label: 'শুধু প্রশ্ন' },
];

const EMPTY_ASK_AI = {
  open: false,
  questionText: '',
  stemText: '',
  imageUrl: '',
  source: '',
  marks: '',
  finalAnswer: '',
  steps: '',
};

function RenderText({ text }) {
  if (!text) return null;
  const normalized = String(text).replace(/\\n(?![a-zA-Z])/g, '\n');
  const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (/^\$\$[\s\S]+?\$\$$/.test(part)) {
          return (
            <div
              key={index}
              style={{
                overflowX: 'auto',
                margin: '8px 0',
                maxWidth: '100%',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <MathJax dynamic style={{ fontSize: '0.85em' }}>{part}</MathJax>
            </div>
          );
        }
        if (/^\$[^$]+\$$/.test(part)) {
          return (
            <span key={index} style={{ display: 'inline' }}>
              <MathJax inline dynamic>{part}</MathJax>
            </span>
          );
        }
        const lines = part.split(/\r?\n/);
        return lines.map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ));
      })}
    </span>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ios-pressable transition-all ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-base-200 text-base-content/70 hover:bg-base-content/10'
      }`}
    >
      {children}
    </button>
  );
}

export default function BoardCQPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedQtype, setSelectedQtype] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('cq');
  const [viewType, setViewType] = useState('all');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [results, setResults] = useState([]);
  const [openAnswerIdx, setOpenAnswerIdx] = useState(null);
  const [askAI, setAskAI] = useState(EMPTY_ASK_AI);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionData, setSuggestionData] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const suggestionRef = useRef(null);

  const classes = useMemo(
    () => Array.from(new Set(mappingData.map((item) => item.class))),
    []
  );
  const subjectsForClass = useMemo(
    () => (selectedClass ? mappingData.filter((item) => item.class === selectedClass) : []),
    [selectedClass]
  );
  const selectedSubjectObj = useMemo(
    () => subjectsForClass.find((item) => item.subject.code === selectedSubject),
    [subjectsForClass, selectedSubject]
  );
  const qtypes = useMemo(() => selectedSubjectObj?.qtypes || [], [selectedSubjectObj]);
  const chapters = useMemo(() => selectedSubjectObj?.chapters || [], [selectedSubjectObj]);
  const isBMCQ = selectedQtype.toUpperCase() === 'BMCQ';

  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedQtype || !selectedChapter) {
      setResults([]);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          class: selectedClass,
          subject: selectedSubject,
          qtype: selectedQtype,
          chapter: selectedChapter,
        });
        if (!isBMCQ) params.set('filter', selectedFilter);
        const response = await fetch(`${API_BASE}?${params}`);
        if (!response.ok) throw new Error('ডাটা লোড ব্যর্থ');
        const data = await response.json();
        if (cancelled) return;
        setResults(Array.isArray(data.results) ? data.results : []);
        setSelectedSource('');
        setSelectedTopic('');
        setCurrentPage(1);
      } catch (requestError) {
        if (!cancelled) {
          console.error('Unable to fetch board questions:', requestError);
          setError(requestError.message || 'Unknown error');
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchQuestions();
    return () => { cancelled = true; };
  }, [selectedClass, selectedSubject, selectedQtype, selectedChapter, selectedFilter, isBMCQ]);

  const sources = useMemo(
    () => Array.from(new Set(results.map((item) => item.source).filter(Boolean))).sort((a, b) => {
      const yearA = extractYear(a);
      const yearB = extractYear(b);
      if (yearB !== yearA) return yearB - yearA;
      return a.localeCompare(b, 'bn');
    }),
    [results]
  );

  const topics = useMemo(() => {
    const topicMap = new Map();
    results.forEach((item) => {
      if (isBMCQ) {
        if (item.data?.topic_name && !topicMap.has(item.data.topic_name)) {
          topicMap.set(item.data.topic_name, item.data.topic_code || '');
        }
      } else {
        const subQuestions = item.sub_questions || (item.sub_question ? [item.sub_question] : []);
        subQuestions.forEach((subQuestion) => {
          if (
            subQuestion.chapter_no === parseInt(selectedChapter, 10)
            && subQuestion.topic_name
            && !topicMap.has(subQuestion.topic_name)
          ) {
            topicMap.set(subQuestion.topic_name, subQuestion.topic_code || '');
          }
        });
      }
    });

    return Array.from(topicMap.entries())
      .sort((a, b) => {
        const codeA = (a[1] || '').match(/T-(\d+)/i);
        const codeB = (b[1] || '').match(/T-(\d+)/i);
        if (codeA && codeB) return parseInt(codeA[1], 10) - parseInt(codeB[1], 10);
        if (codeA) return -1;
        if (codeB) return 1;
        return a[0].localeCompare(b[0], 'bn');
      })
      .map(([name]) => name);
  }, [results, isBMCQ, selectedChapter]);

  const getItemTopic = (item) => {
    if (isBMCQ && item.data) {
      return { code: item.data.topic_code || '', name: item.data.topic_name || '' };
    }
    if (item.sub_question) {
      return { code: item.sub_question.topic_code || '', name: item.sub_question.topic_name || '' };
    }
    if (item.sub_questions?.length) {
      const subQuestion = item.sub_questions.find(
        (question) => question.chapter_no === parseInt(selectedChapter, 10)
          && ['গ', 'ঘ'].includes(question.label)
      ) || item.sub_questions.find(
        (question) => question.chapter_no === parseInt(selectedChapter, 10)
      ) || item.sub_questions[0];
      return { code: subQuestion.topic_code || '', name: subQuestion.topic_name || '' };
    }
    return { code: '', name: '' };
  };

  const extractTopicNum = (code) => {
    const match = (code || '').match(/T-(\d+)/i);
    return match ? parseInt(match[1], 10) : 9999;
  };

  const filteredResults = useMemo(() => {
    const filtered = results.filter((item) => {
      if (selectedSource && item.source !== selectedSource) return false;
      if (selectedTopic) {
        if (isBMCQ) {
          if (!item.data || item.data.topic_name !== selectedTopic) return false;
        } else if (item.sub_questions) {
          if (!item.sub_questions.some((question) => question.topic_name === selectedTopic)) return false;
        } else if (item.sub_question?.topic_name !== selectedTopic) {
          return false;
        }
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (selectedFilter === 'cq') {
        const yearA = extractYear(a.source || '');
        const yearB = extractYear(b.source || '');
        if (yearB !== yearA) return yearB - yearA;
        return (a.source || '').localeCompare(b.source || '', 'bn');
      }
      const topicA = extractTopicNum(getItemTopic(a).code);
      const topicB = extractTopicNum(getItemTopic(b).code);
      if (topicA !== topicB) return topicA - topicB;
      const yearA = extractYear(a.source || '');
      const yearB = extractYear(b.source || '');
      if (yearB !== yearA) return yearB - yearA;
      return (a.source || '').localeCompare(b.source || '', 'bn');
    });
    // getItemTopic reads selected chapter and BMCQ state from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, selectedSource, selectedTopic, selectedFilter, isBMCQ, selectedChapter]);

  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const groupedByTopic = useMemo(() => {
    const groups = [];
    const topicGroupMap = new Map();
    paginatedResults.forEach((item, index) => {
      const topic = getItemTopic(item);
      const key = topic.name || 'অন্যান্য';
      if (!topicGroupMap.has(key)) {
        topicGroupMap.set(key, groups.length);
        groups.push({ code: topic.code, name: key, items: [] });
      }
      groups[topicGroupMap.get(key)].items.push({ item, idx: index });
    });
    return groups;
    // getItemTopic reads selected chapter and BMCQ state from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedResults, selectedChapter, isBMCQ]);

  const contextText = useMemo(() => {
    let context = selectedClass;
    if (selectedSubject && selectedSubjectObj) {
      context += ` / ${selectedSubjectObj.subject.name}`;
      if (selectedQtype) {
        const questionType = qtypes.find((item) => item.code === selectedQtype);
        context += ` / ${questionType ? questionType.name : selectedQtype}`;
      }
      if (selectedChapter) {
        const chapter = chapters.find((item) => item.id === parseInt(selectedChapter, 10));
        context += ` / ${chapter ? chapter.title : `অধ্যায় ${bn(selectedChapter)}`}`;
      }
    }
    return context;
  }, [selectedClass, selectedSubject, selectedQtype, selectedChapter, selectedSubjectObj, qtypes, chapters]);

  const shortenSource = (source) => {
    const boardMap = [
      ['ঢাকা বোর্ড', 'DB'],
      ['রাজশাহী বোর্ড', 'RB'],
      ['কুমিল্লা বোর্ড', 'CB'],
      ['চট্টগ্রাম বোর্ড', 'CtgB'],
      ['সিলেট বোর্ড', 'SB'],
      ['বরিশাল বোর্ড', 'BB'],
      ['যশোর বোর্ড', 'JB'],
      ['দিনাজপুর বোর্ড', 'DinB'],
      ['ময়মনসিংহ বোর্ড', 'MSB'],
      ['সম্মিলিত বোর্ড', 'AB'],
    ];
    let shortened = source;
    for (const [board, code] of boardMap) {
      if (shortened.includes(board)) {
        shortened = shortened.replace(board, code);
        break;
      }
    }
    shortened = shortened
      .replace(/\(সেট\s*[০0]?[১1]\)/, '(S1)')
      .replace(/\(সেট\s*[০0]?[২2]\)/, '(S2)');
    const year = bn2en(shortened).match(/(20\d{2}|19\d{2})/);
    if (year) shortened = shortened.replace(/[০-৯]{4}|\d{4}/, `'${year[0].slice(-2)}`);
    return shortened.replace(/\s+/g, ' ').trim();
  };

  const generateSuggestion = async () => {
    if (!selectedClass || !selectedSubject || !selectedQtype || !selectedChapter) return;
    setSuggestionLoading(true);
    try {
      const params = new URLSearchParams({
        class: selectedClass,
        subject: selectedSubject,
        qtype: selectedQtype,
        chapter: selectedChapter,
        filter: 'cq',
      });
      const response = await fetch(`${API_BASE}?${params}`);
      if (!response.ok) throw new Error('ডাটা লোড ব্যর্থ');
      const data = await response.json();
      const cqResults = Array.isArray(data.results) ? data.results : [];
      const topicAnalysis = new Map();

      cqResults.forEach((item) => {
        (item.sub_questions || []).forEach((subQuestion) => {
          if (subQuestion.chapter_no !== parseInt(selectedChapter, 10)) return;
          if (!['গ', 'ঘ'].includes(subQuestion.label)) return;
          const topicKey = subQuestion.topic_name || 'অন্যান্য';
          if (!topicAnalysis.has(topicKey)) {
            topicAnalysis.set(topicKey, {
              code: subQuestion.topic_code || '',
              name: topicKey,
              ga: 0,
              gha: 0,
              boardMap: new Map(),
            });
          }
          const entry = topicAnalysis.get(topicKey);
          if (subQuestion.label === 'গ') entry.ga += 1;
          if (subQuestion.label === 'ঘ') entry.gha += 1;
          const source = item.source || '';
          if (source) {
            if (!entry.boardMap.has(source)) entry.boardMap.set(source, new Set());
            entry.boardMap.get(source).add(subQuestion.label);
          }
        });
      });

      let analysis = Array.from(topicAnalysis.values())
        .map((topic) => ({
          code: topic.code,
          name: topic.name,
          ga: topic.ga,
          gha: topic.gha,
          total: topic.ga + topic.gha,
          boards: Array.from(topic.boardMap.entries())
            .sort(([sourceA], [sourceB]) => extractYear(sourceB) - extractYear(sourceA))
            .map(([source, labels]) => `${shortenSource(source)}(${Array.from(labels).join(',')})`),
        }))
        .sort((a, b) => {
          const codeA = (a.code || '').match(/T-(\d+)/i);
          const codeB = (b.code || '').match(/T-(\d+)/i);
          if (codeA && codeB) return parseInt(codeA[1], 10) - parseInt(codeB[1], 10);
          return b.total - a.total;
        });

      const maxTotal = Math.max(...analysis.map((topic) => topic.total), 1);
      analysis = analysis.map((topic) => ({
        ...topic,
        importance: topic.total >= maxTotal * 0.35 ? '***' : topic.total >= maxTotal * 0.1 ? '**' : '*',
      }));
      setSuggestionData(analysis);
      setSuggestionOpen(true);
    } catch (requestError) {
      console.error('Suggestion generation failed:', requestError);
      setError(requestError.message || 'সাজেশন তৈরি করা যায়নি।');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const downloadSuggestion = async () => {
    if (!suggestionRef.current) return;
    setDownloadingPng(true);
    const element = suggestionRef.current;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      element.style.width = '1200px';
      element.style.maxWidth = '1200px';
      await new Promise((resolve) => setTimeout(resolve, 100));
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });
      const chapter = chapters.find((item) => item.id === parseInt(selectedChapter, 10));
      const link = document.createElement('a');
      link.download = `সাজেশন-${selectedChapter}-${chapter?.title || ''}.png`;
      link.href = dataUrl;
      link.click();
    } catch (downloadError) {
      console.error('Suggestion download failed:', downloadError);
      window.alert('ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      setDownloadingPng(false);
    }
  };

  const openAskAI = (data) => setAskAI({ ...EMPTY_ASK_AI, ...data, open: true });

  const renderCQCard = (item, index) => {
    const globalIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
    return (
      <div key={`${item._id || item.question_no || 'cq'}-${index}`} className="ios-card p-4 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-bold text-[15px] whitespace-nowrap">
            {bn(globalIndex)}। {item.source || ''}
          </h3>
          <span className="text-[11px] font-semibold text-base-content/60 px-2 py-0.5 rounded-full bg-base-content/10 whitespace-nowrap">
            প্রশ্ন: {item.question_no}
          </span>
          <button
            type="button"
            onClick={() => {
              const allQuestions = (item.sub_questions || [])
                .map((subQuestion) => `${subQuestion.label}। ${subQuestion.question_text}${subQuestion.marks ? ` [${subQuestion.marks} নম্বর]` : ''}`)
                .join('\n');
              const answers = (item.sub_questions || [])
                .filter((subQuestion) => subQuestion.answer?.final_answer)
                .map((subQuestion) => `${subQuestion.label}। ${subQuestion.answer.final_answer}`)
                .join('\n');
              const steps = (item.sub_questions || [])
                .filter((subQuestion) => subQuestion.answer?.steps?.length)
                .map((subQuestion) => `${subQuestion.label}। ${subQuestion.answer.steps.join(' → ')}`)
                .join('\n');
              openAskAI({
                questionText: allQuestions,
                stemText: item.stem?.text || '',
                imageUrl: (item.stem?.has_image && item.stem?.image_url) || '',
                source: item.source || '',
                finalAnswer: answers,
                steps,
              });
            }}
            className="ml-auto px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-bold ios-pressable"
          >
            🤖 Ask AI
          </button>
        </div>

        {item.stem && (
          <div className="border-b border-base-content/10 pb-3 mb-3">
            {item.stem.text && <div className="text-sm"><RenderText text={item.stem.text} /></div>}
            {item.stem.has_image && item.stem.image_url && (
              <div className="flex justify-center mt-2">
                <img
                  src={item.stem.image_url}
                  alt="উদ্দীপকের ছবি"
                  className="rounded-lg max-w-xs h-auto"
                  style={{ maxHeight: 180, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        )}

        {item.sub_questions && (
          <div className="space-y-2">
            {item.sub_questions.map((subQuestion, subIndex) => {
              const answerKey = `${index}-${subIndex}`;
              const hasAnswer = subQuestion.answer?.full_explanation;
              return (
                <div key={`${subQuestion.label}-${subIndex}`} className="border-l-2 border-primary/40 pl-3">
                  <span className="font-bold mr-1.5">{subQuestion.label}।</span>
                  <span className="text-sm"><RenderText text={subQuestion.question_text} /></span>
                  {subQuestion.marks && (
                    <span className="text-[11px] text-base-content/40 ml-1.5">[{subQuestion.marks} নম্বর]</span>
                  )}
                  <button
                    type="button"
                    onClick={() => openAskAI({
                      questionText: subQuestion.question_text,
                      stemText: item.stem?.text || '',
                      imageUrl: (item.stem?.has_image && item.stem?.image_url) || '',
                      source: item.source || '',
                      marks: subQuestion.marks || '',
                      finalAnswer: subQuestion.answer?.final_answer || '',
                      steps: subQuestion.answer?.steps?.length ? subQuestion.answer.steps.join(' → ') : '',
                    })}
                    aria-label={`${subQuestion.label} অংশের জন্য AI-কে জিজ্ঞাসা করুন`}
                    className="ml-1.5 text-accent text-[11px] font-semibold ios-pressable"
                  >
                    🤖
                  </button>
                  {viewType === 'all' && hasAnswer && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => setOpenAnswerIdx(openAnswerIdx === answerKey ? null : answerKey)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ios-pressable ${
                          openAnswerIdx === answerKey ? 'bg-success/20 text-success' : 'bg-success/10 text-success'
                        }`}
                      >
                        {openAnswerIdx === answerKey ? 'উত্তর লুকান' : 'উত্তর দেখুন'}
                      </button>
                      {openAnswerIdx === answerKey && (
                        <div className="mt-2 p-3 bg-base-200 rounded-lg text-sm whitespace-pre-line">
                          <span className="font-bold text-success text-xs block mb-1">উত্তর:</span>
                          <RenderText text={subQuestion.answer.full_explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSingleQuestion = (item, index) => {
    const globalIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
    const showStem = ['ga', 'gha'].includes(selectedFilter);
    return (
      <div key={`${item._id || item.question_no || 'question'}-${index}`} className="ios-card p-4 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-bold text-[15px] whitespace-nowrap">
            {bn(globalIndex)}। {item.source || ''}
          </h3>
          <span className="text-[11px] font-semibold text-base-content/60 px-2 py-0.5 rounded-full bg-base-content/10 whitespace-nowrap">
            প্রশ্ন: {item.question_no}
          </span>
          <button
            type="button"
            onClick={() => openAskAI({
              questionText: item.sub_question?.question_text || '',
              stemText: item.stem?.text || '',
              imageUrl: (item.stem?.has_image && item.stem?.image_url) || '',
              source: item.source || '',
              marks: item.sub_question?.marks || '',
              finalAnswer: item.sub_question?.answer?.final_answer || '',
              steps: item.sub_question?.answer?.steps?.length ? item.sub_question.answer.steps.join(' → ') : '',
            })}
            className="ml-auto px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-bold ios-pressable"
          >
            🤖 Ask AI
          </button>
        </div>

        {showStem && item.stem && (
          <div className="border-b border-base-content/10 pb-3 mb-3">
            {item.stem.text && <div className="text-sm"><RenderText text={item.stem.text} /></div>}
            {item.stem.has_image && item.stem.image_url && (
              <div className="flex justify-center mt-2">
                <img
                  src={item.stem.image_url}
                  alt="উদ্দীপকের ছবি"
                  className="rounded-lg max-w-xs h-auto"
                  style={{ maxHeight: 180, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        )}

        {item.sub_question && (() => {
          const answer = item.sub_question.answer;
          const hasAnswer = answer?.full_explanation || answer?.final_answer;
          return (
            <div className="border-l-2 border-primary/40 pl-3">
              <span className="font-bold mr-1.5">{item.sub_question.label}।</span>
              <span className="text-sm"><RenderText text={item.sub_question.question_text} /></span>
              {item.sub_question.marks && (
                <span className="text-[11px] text-base-content/40 ml-1.5">[{item.sub_question.marks} নম্বর]</span>
              )}
              {viewType === 'all' && hasAnswer && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setOpenAnswerIdx(openAnswerIdx === index ? null : index)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ios-pressable ${
                      openAnswerIdx === index ? 'bg-success/20 text-success' : 'bg-success/10 text-success'
                    }`}
                  >
                    {openAnswerIdx === index ? 'উত্তর লুকান' : 'উত্তর দেখুন'}
                  </button>
                  {openAnswerIdx === index && (
                    <div className="mt-2 p-3 bg-base-200 rounded-lg text-sm whitespace-pre-line">
                      <span className="font-bold text-success text-xs block mb-1">উত্তর:</span>
                      <RenderText text={answer.full_explanation || answer.final_answer} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const activeFilterCount = [
    selectedSource,
    selectedTopic,
    selectedFilter !== 'cq' ? 'x' : '',
    viewType !== 'all' ? 'x' : '',
  ].filter(Boolean).length;

  const mathJaxConfig = {
    loader: { load: ['input/tex', 'output/chtml', '[tex]/ams', '[tex]/newcommand', '[tex]/textmacros'] },
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      packages: { '[+]': ['ams', 'newcommand'] },
    },
    chtml: { mtextInheritFont: true, matchFontHeight: false },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
      <style>{`
        mjx-container mjx-utext, mjx-container mjx-mtext,
        mjx-container [data-mjx-texclass="ORD"] mjx-mtext,
        .MathJax mjx-utext, .MathJax mjx-mtext {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif !important;
        }
      `}</style>

      <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="mb-4">
            <h1 className="ios-title mb-1">প্রশ্নব্যাংক</h1>
            <p className="ios-caption">{contextText || 'শ্রেণি বাছাই করুন'}</p>
          </div>

          <div className="ios-card p-3 mb-3">
            <div className="grid grid-cols-2 gap-2.5">
              <select
                aria-label="শ্রেণি"
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedSubject('');
                  setSelectedQtype('');
                  setSelectedChapter('');
                  setResults([]);
                  setCurrentPage(1);
                }}
                className="ios-input appearance-none text-[15px]"
              >
                <option value="">শ্রেণি</option>
                {classes.map((className, index) => (
                  <option key={`${className}-${index}`} value={className}>{className}</option>
                ))}
              </select>

              <select
                aria-label="বিষয়"
                value={selectedSubject}
                onChange={(event) => {
                  setSelectedSubject(event.target.value);
                  setSelectedQtype('');
                  setSelectedChapter('');
                  setResults([]);
                  setCurrentPage(1);
                }}
                disabled={!selectedClass}
                className="ios-input appearance-none text-[15px] disabled:opacity-50"
              >
                <option value="">বিষয়</option>
                {subjectsForClass.map((item, index) => (
                  <option key={`${item.subject.code}-${index}`} value={item.subject.code}>
                    {item.subject.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="প্রশ্নের ধরন"
                value={selectedQtype}
                onChange={(event) => {
                  setSelectedQtype(event.target.value);
                  setSelectedChapter('');
                  setResults([]);
                  setCurrentPage(1);
                }}
                disabled={!selectedSubject}
                className="ios-input appearance-none text-[15px] disabled:opacity-50"
              >
                <option value="">ধরন</option>
                {qtypes.map((item, index) => (
                  <option key={`${item.code}-${index}`} value={item.code}>{item.name}</option>
                ))}
              </select>

              <select
                aria-label="অধ্যায়"
                value={selectedChapter}
                onChange={(event) => {
                  setSelectedChapter(event.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedQtype}
                className="ios-input appearance-none text-[15px] disabled:opacity-50"
              >
                <option value="">অধ্যায়</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    অধ্যায় {bn(chapter.id)}: {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedChapter && !isBMCQ && (
              <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
                {FILTER_OPTIONS.map((filter) => (
                  <FilterChip
                    key={filter.value}
                    active={selectedFilter === filter.value}
                    onClick={() => {
                      setSelectedFilter(filter.value);
                      setCurrentPage(1);
                    }}
                  >
                    {filter.label}
                  </FilterChip>
                ))}
              </div>
            )}

            {selectedChapter && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className="flex-1 py-2 rounded-xl bg-base-200 text-base-content/70 text-[13px] font-semibold ios-pressable flex items-center justify-center gap-1.5"
                >
                  ⚙️ ফিল্টার
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                {!isBMCQ && (
                  <button
                    type="button"
                    onClick={generateSuggestion}
                    disabled={suggestionLoading}
                    className="flex-1 py-2 rounded-xl bg-info/10 text-info text-[13px] font-semibold ios-pressable flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {suggestionLoading ? React.createElement(IOSSpinner, { size: 'sm' }) : '📊'} সাজেশন
                  </button>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-10">{React.createElement(IOSSpinner, { size: 'lg' })}</div>
          )}
          {error && <div role="alert" className="ios-card p-4 text-center text-error text-sm">{error}</div>}

          {!loading && !error && !selectedClass && (
            <div className="ios-card p-8 text-center">
              <div className="text-4xl mb-2">📚</div>
              <p className="ios-subhead">শ্রেণি বাছাই করুন</p>
            </div>
          )}
          {!loading && !error && selectedClass && !selectedSubject && (
            <div className="ios-card p-8 text-center">
              <div className="text-4xl mb-2">📖</div>
              <p className="ios-subhead">বিষয় বাছাই করুন</p>
            </div>
          )}
          {!loading && !error && selectedSubject && !selectedQtype && (
            <div className="ios-card p-8 text-center">
              <div className="text-4xl mb-2">📝</div>
              <p className="ios-subhead">প্রশ্নের ধরন বাছাই করুন</p>
            </div>
          )}
          {!loading && !error && selectedQtype && !selectedChapter && (
            <div className="ios-card p-8 text-center">
              <div className="text-4xl mb-2">🔖</div>
              <p className="ios-subhead">অধ্যায় বাছাই করুন</p>
            </div>
          )}

          {selectedChapter && !loading && !error && (
            <div>
              {results.length > 0 && (
                <p className="text-xs text-base-content/50 mb-2 px-1">
                  মোট: {bn(filteredResults.length)} টি প্রশ্ন
                </p>
              )}
              {paginatedResults.length === 0 && (
                <div className="ios-card p-6 text-center text-base-content/50 text-sm">
                  কোনো প্রশ্ন পাওয়া যায়নি
                </div>
              )}

              {isBMCQ
                ? (() => {
                  let lastStem = null;
                  let lastStemText = null;
                  return paginatedResults.map((item, index) => {
                    const sharedStem = item.data?.shared_stem;
                    const showStem = Boolean(sharedStem?.text && sharedStem.text !== lastStemText);
                    if (sharedStem?.text) {
                      lastStem = sharedStem;
                      lastStemText = sharedStem.text;
                    }
                    return (
                      <MCQCard
                        key={`${item._id || item.question_no || 'mcq'}-${index}`}
                        item={item}
                        idx={index}
                        currentPage={currentPage}
                        pageSize={PAGE_SIZE}
                        viewType={viewType}
                        openAnswerIdx={openAnswerIdx}
                        setOpenAnswerIdx={setOpenAnswerIdx}
                        setAskAI={setAskAI}
                        renderText={(text) => <RenderText text={text} />}
                        getBengaliNum={bn}
                        fallbackStem={lastStem}
                        showStem={showStem}
                      />
                    );
                  });
                })()
                : selectedFilter === 'cq'
                  ? paginatedResults.map((item, index) => renderCQCard(item, index))
                  : groupedByTopic.map((group, groupIndex) => (
                    <div key={`${group.code}-${group.name}-${groupIndex}`}>
                      <div className="sticky top-14 z-10 bg-base-200/95 backdrop-blur rounded-lg px-3 py-1.5 mb-2 mt-3 border-l-4 border-primary">
                        <span className="text-[13px] font-bold text-primary">
                          {group.code ? `${group.code}: ` : ''}{group.name}
                        </span>
                        <span className="text-[11px] text-base-content/40 ml-2">
                          ({bn(group.items.length)} টি)
                        </span>
                      </div>
                      {group.items.map(({ item, idx }) => renderSingleQuestion(item, idx))}
                    </div>
                  ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-6 mb-4">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="আগের পৃষ্ঠা"
                className="w-9 h-9 rounded-xl bg-base-100 text-sm font-semibold disabled:opacity-30 ios-pressable"
              >
                ←
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-bold">
                {bn(currentPage)} / {bn(totalPages)}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                aria-label="পরের পৃষ্ঠা"
                className="w-9 h-9 rounded-xl bg-base-100 text-sm font-semibold disabled:opacity-30 ios-pressable"
              >
                →
              </button>
            </div>
          )}
        </div>

        {React.createElement(
          IOSSheet,
          { open: filterSheetOpen, onClose: () => setFilterSheetOpen(false), title: 'ফিল্টার' },
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">
                View Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VIEW_TYPES.map((view) => (
                  <button
                    key={view.value}
                    type="button"
                    onClick={() => {
                      setViewType(view.value);
                      setCurrentPage(1);
                    }}
                    className={`py-2.5 rounded-xl text-sm font-semibold ios-pressable transition-all ${
                      viewType === view.value ? 'bg-primary text-white' : 'bg-base-200 text-base-content/70'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>

            {sources.length > 0 && (
              <div>
                <label htmlFor="board-source" className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">
                  সোর্স
                </label>
                <select
                  id="board-source"
                  value={selectedSource}
                  onChange={(event) => {
                    setSelectedSource(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="ios-input appearance-none"
                >
                  <option value="">সব</option>
                  {sources.map((source, index) => (
                    <option key={`${source}-${index}`} value={source}>{source}</option>
                  ))}
                </select>
              </div>
            )}

            {topics.length > 0 && (
              <div>
                <label htmlFor="board-topic" className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">
                  টপিক
                </label>
                <select
                  id="board-topic"
                  value={selectedTopic}
                  onChange={(event) => {
                    setSelectedTopic(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="ios-input appearance-none"
                >
                  <option value="">সব</option>
                  {topics.map((topic, index) => (
                    <option key={`${topic}-${index}`} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            )}

            {React.createElement(
              IOSButton,
              { onClick: () => setFilterSheetOpen(false), fullWidth: true, size: 'lg' },
              'Apply'
            )}
          </div>
        )}

        {React.createElement(
          IOSSheet,
          {
            open: suggestionOpen,
            onClose: () => setSuggestionOpen(false),
            title: 'সৃজনশীল সাজেশন',
            maxHeight: '92vh',
          },
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={downloadSuggestion}
                disabled={downloadingPng}
                className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold ios-pressable disabled:opacity-50"
              >
                {downloadingPng ? '⏳ তৈরি হচ্ছে…' : '📥 PNG ডাউনলোড'}
              </button>
            </div>

            <div
              ref={suggestionRef}
              className="bg-white text-slate-800 rounded-lg p-4"
              style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            >
              <p className="text-xs font-bold text-slate-500">অধ্যায় {bn(selectedChapter)}</p>
              <h2 className="text-xl font-black text-blue-600 mb-1">
                {chapters.find((item) => item.id === parseInt(selectedChapter, 10))?.title || ''}
              </h2>
              <p className="text-[11px] text-slate-400 mb-3">বোর্ড সৃজনশীল বিশ্লেষণ</p>
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-600 p-1.5 w-12 text-center">গুরুত্ব</th>
                    <th className="border border-slate-600 p-1.5 text-left">টপিক</th>
                    <th className="border border-slate-600 p-1.5 w-8 text-center">গ</th>
                    <th className="border border-slate-600 p-1.5 w-8 text-center">ঘ</th>
                    <th className="border border-slate-600 p-1.5 text-left">বোর্ড</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestionData.map((topic, index) => (
                    <tr key={`${topic.code}-${topic.name}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td
                        className="border border-slate-200 p-1.5 text-center font-bold text-base"
                        style={{
                          color: topic.importance === '***'
                            ? '#dc2626'
                            : topic.importance === '**' ? '#ea580c' : '#65a30d',
                        }}
                      >
                        {topic.importance}
                      </td>
                      <td className="border border-slate-200 p-1.5 font-semibold text-slate-800">{topic.name}</td>
                      <td className="border border-slate-200 p-1.5 text-center font-bold text-purple-600">{topic.ga}</td>
                      <td className="border border-slate-200 p-1.5 text-center font-bold text-cyan-600">{topic.gha}</td>
                      <td className="border border-slate-200 p-1.5 text-[10px] text-slate-500">
                        {topic.boards.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-3 mt-3 text-[10px] text-slate-400">
                <span><span className="text-red-600 font-bold">***</span> অতি গুরুত্বপূর্ণ</span>
                <span><span className="text-orange-600 font-bold">**</span> গুরুত্বপূর্ণ</span>
                <span><span className="text-lime-600 font-bold">*</span> সাধারণ</span>
              </div>
            </div>
          </div>
        )}

        <AskAIModalMongoDB
          isOpen={askAI.open}
          onClose={() => setAskAI(EMPTY_ASK_AI)}
          questionText={askAI.questionText}
          stemText={askAI.stemText}
          imageUrl={askAI.imageUrl}
          source={askAI.source}
          marks={askAI.marks}
          finalAnswer={askAI.finalAnswer}
          steps={askAI.steps}
          className={selectedClass || ''}
          subjectName={selectedSubjectObj?.subject?.name || ''}
          chapterName={chapters.find((item) => item.id === parseInt(selectedChapter, 10))?.title || ''}
        />
      </div>
    </MathJaxContext>
  );
}
