import React, { useState, useEffect, useRef } from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import mappingData from '../Components/Mapping/Mapping.json';
import AskAIModal from '../Components/AskAI/AskAIModal';
import { toPng } from 'html-to-image';

const API_BASE = 'https://geminiai-render.onrender.com/api/nctb-questions/board-questions';

// Bengali number utility
function getBengaliNum(num) {
  return String(num).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');
}

// Filter options
const filterOptions = [
  { value: 'cq', label: 'সৃজনশীল (পূর্ণ)' },
  { value: 'ka', label: 'ক (জ্ঞানমূলক)' },
  { value: 'kha', label: 'খ (অনুধাবন)' },
  { value: 'ga', label: 'গ (প্রয়োগ)' },
  { value: 'gha', label: 'ঘ (উচ্চতর দক্ষতা)' },
];

function BoardCQPage() {
  const pageSize = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedQtype, setSelectedQtype] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('cq');
  const [viewType, setViewType] = useState('all');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Data
  const [results, setResults] = useState([]);
  const [openAnswerIdx, setOpenAnswerIdx] = useState(null);

  // Ask AI modal state
  const [askAI, setAskAI] = useState({ open: false, questionText: '', stemText: '', imageUrl: '', source: '' });

  // Suggestion modal state
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionData, setSuggestionData] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const suggestionRef = useRef(null);

  // Derived from Mapping.json
  const classes = Array.from(new Set(mappingData.map(m => m.class)));

  const subjectsForClass = selectedClass
    ? mappingData.filter(m => m.class === selectedClass)
    : [];

  const selectedSubjectObj = subjectsForClass.find(m => m.subject.code === selectedSubject);

  const qtypes = selectedSubjectObj ? (selectedSubjectObj.qtypes || []) : [];
  const chapters = selectedSubjectObj ? selectedSubjectObj.chapters : [];

  // =============================================
  // Fetch board questions from API
  // =============================================
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedQtype || !selectedChapter) {
      setResults([]);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          class: selectedClass,
          subject: selectedSubject,
          qtype: selectedQtype,
          chapter: selectedChapter,
          filter: selectedFilter,
        });
        const res = await fetch(`${API_BASE}?${params}`);
        if (!res.ok) throw new Error('ডাটা লোড ব্যর্থ');
        const data = await res.json();
        setResults(data.results || []);
        setSelectedSource('');
        setSelectedTopic('');
        setCurrentPage(1);
      } catch (err) {
        setError(err?.message || 'Unknown error');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedClass, selectedSubject, selectedQtype, selectedChapter, selectedFilter]);

  // Derived: unique sources from results (latest year first)
  // Helper: extract year from source string (supports both Bengali & English digits)
  const extractYear = (str) => {
    const bn2en = s => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
    const converted = bn2en(str);
    const match = converted.match(/(20\d{2}|19\d{2})/);
    return match ? parseInt(match[0]) : 0;
  };

  const sources = Array.from(new Set(results.map(r => r.source).filter(Boolean)))
    .sort((a, b) => {
      const yearA = extractYear(a);
      const yearB = extractYear(b);
      if (yearB !== yearA) return yearB - yearA;
      return a.localeCompare(b, 'bn');
    });

  // Derived: unique topics from results (only for selected chapter), sorted by topic_code
  const topicMap = new Map();
  results.forEach(r => {
    const sqs = r.sub_questions || (r.sub_question ? [r.sub_question] : []);
    sqs.forEach(sq => {
      if (sq.chapter_no === parseInt(selectedChapter) && sq.topic_name && !topicMap.has(sq.topic_name)) {
        topicMap.set(sq.topic_name, sq.topic_code || '');
      }
    });
  });
  const topics = Array.from(topicMap.entries())
    .sort((a, b) => {
      const codeA = (a[1] || '').match(/T-(\d+)/i);
      const codeB = (b[1] || '').match(/T-(\d+)/i);
      if (codeA && codeB) return parseInt(codeA[1]) - parseInt(codeB[1]);
      if (codeA) return -1;
      if (codeB) return 1;
      return a[0].localeCompare(b[0], 'bn');
    })
    .map(([name]) => name);

  // Helper: get topic info from an item
  const getItemTopic = (item) => {
    if (item.sub_question) return { code: item.sub_question.topic_code || '', name: item.sub_question.topic_name || '' };
    // For CQ filter: topic comes from গ/ঘ sub_question matching the chapter
    if (item.sub_questions && item.sub_questions.length > 0) {
      const chapterSq = item.sub_questions.find(sq =>
        sq.chapter_no === parseInt(selectedChapter) && ['গ', 'ঘ'].includes(sq.label)
      ) || item.sub_questions.find(sq => sq.chapter_no === parseInt(selectedChapter)) || item.sub_questions[0];
      return { code: chapterSq.topic_code || '', name: chapterSq.topic_name || '' };
    }
    return { code: '', name: '' };
  };

  const extractTopicNum = (code) => {
    const m = (code || '').match(/T-(\d+)/i);
    return m ? parseInt(m[1]) : 9999;
  };

  // Client-side filtered results (sorted by topic_code asc, then source year desc)
  const filteredResults = results.filter(r => {
    if (selectedSource && r.source !== selectedSource) return false;
    if (selectedTopic) {
      if (r.sub_questions) {
        if (!r.sub_questions.some(sq => sq.topic_name === selectedTopic)) return false;
      } else if (r.sub_question) {
        if (r.sub_question.topic_name !== selectedTopic) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    // Primary: topic code ascending (T-01 -> T-N)
    const tA = extractTopicNum(getItemTopic(a).code);
    const tB = extractTopicNum(getItemTopic(b).code);
    if (tA !== tB) return tA - tB;
    // Secondary: source year descending
    const yearA = extractYear(a.source || '');
    const yearB = extractYear(b.source || '');
    if (yearB !== yearA) return yearB - yearA;
    return (a.source || '').localeCompare(b.source || '', 'bn');
  });

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / pageSize);
  const paginatedResults = filteredResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Group paginated results by topic for section headings
  const groupedByTopic = [];
  const topicGroupMap = new Map();
  paginatedResults.forEach((item, idx) => {
    const t = getItemTopic(item);
    const key = t.name || 'অন্যান্য';
    if (!topicGroupMap.has(key)) {
      topicGroupMap.set(key, groupedByTopic.length);
      groupedByTopic.push({ code: t.code, name: key, items: [] });
    }
    groupedByTopic[topicGroupMap.get(key)].items.push({ item, idx });
  });

  // =============================================
  // MathJax render helper
  // =============================================
  const renderText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (/^\$[^$]+\$$/.test(part)) {
            return (
              <span key={i} style={{ display: 'inline' }}>
                <MathJax inline dynamic>{part}</MathJax>
              </span>
            );
          }
          const lines = part.split(/\r?\n/);
          return lines.map((line, idx) => (
            <span key={`${i}-${idx}`}>
              {line}
              {idx < lines.length - 1 ? <br /> : null}
            </span>
          ));
        })}
      </span>
    );
  };

  // =============================================
  // Dynamic heading
  // =============================================
  let headingText = 'বোর্ড প্রশ্ন';
  if (!selectedClass) headingText = 'শ্রেণি বাছাই করুন';
  else if (!selectedSubject) headingText = 'বিষয় বাছাই করুন';
  else if (!selectedQtype) headingText = 'প্রশ্নের ধরন বাছাই করুন';
  else if (!selectedChapter) headingText = 'অধ্যায় বাছাই করুন';

  let contextText = '';
  if (selectedClass) {
    contextText = selectedClass;
    if (selectedSubject && selectedSubjectObj) {
      contextText += ` / ${selectedSubjectObj.subject.name}`;
      if (selectedQtype) {
        const qt = qtypes.find(q => q.code === selectedQtype);
        contextText += ` / ${qt ? qt.name : selectedQtype}`;
      }
      if (selectedChapter) {
        const ch = chapters.find(c => c.id === parseInt(selectedChapter));
        contextText += ` / ${ch ? ch.title : 'অধ্যায় ' + getBengaliNum(selectedChapter)}`;
      }
    }
  }

  // =============================================
  // Render a single result card
  // =============================================
  const renderCard = (item, idx) => {
    const globalIdx = (currentPage - 1) * pageSize + idx + 1;

    // filter=cq → Full CQ: stem + all sub_questions (ক,খ,গ,ঘ)
    if (selectedFilter === 'cq') {
      return (
        <div key={idx} className="card bg-base-100 shadow-xl my-4 overflow-x-auto">
          <div className="card-body p-4 sm:p-6" style={{ wordBreak: 'break-word' }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="card-title text-lg font-bold whitespace-nowrap">
                {getBengaliNum(globalIdx)}। {item.source || ''}
              </h2>
              <span className="badge badge-sm badge-outline whitespace-nowrap">প্রশ্ন নং: {item.question_no}</span>
              <button
                className="btn btn-xs btn-accent sm:ml-auto"
                onClick={() => {
                  const allQ = (item.sub_questions || []).map(sq => `${sq.label}। ${sq.question_text}`).join('\n');
                  setAskAI({ open: true, questionText: allQ, stemText: item.stem?.text || '', imageUrl: (item.stem?.has_image && item.stem?.image_url) || '', source: item.source || '' });
                }}
              >
                🤖 Ask AI
              </button>
            </div>
            {/* Stem / উদ্দীপক */}
            {item.stem && (
              <div className="border-b pb-3 mb-3">
                {item.stem.text && <div className="text-base">{renderText(item.stem.text)}</div>}
                {item.stem.has_image && item.stem.image_url && (
                  <div className="flex justify-center mt-2">
                    <img
                      src={item.stem.image_url}
                      alt="stem"
                      className="rounded-lg max-w-xs h-auto"
                      style={{ maxHeight: '180px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            )}
            {/* Sub questions */}
            {item.sub_questions && (
              <div className="space-y-2">
                {item.sub_questions.map((sq, si) => {
                  const answerKey = `${idx}-${si}`;
                  const hasAnswer = sq.answer && (sq.answer.full_explanation || sq.answer.final_answer);
                  return (
                    <div key={si} className="border-l-4 border-primary pl-4">
                      <span className="font-bold mr-2">{sq.label}।</span>
                      {renderText(sq.question_text)}
                      {sq.marks && (
                        <span className="text-xs text-gray-400 ml-2">[{sq.marks} নম্বর]</span>
                      )}
                      <button
                        className="btn btn-xs btn-ghost btn-accent ml-2"
                        onClick={() => setAskAI({ open: true, questionText: sq.question_text, stemText: item.stem?.text || '', imageUrl: (item.stem?.has_image && item.stem?.image_url) || '', source: item.source || '' })}
                      >
                        🤖 AI
                      </button>
                      {viewType === 'all' && hasAnswer && (
                        <div className="mt-2">
                          <button
                            className="btn btn-sm btn-outline btn-success mb-2"
                            onClick={() => setOpenAnswerIdx(openAnswerIdx === answerKey ? null : answerKey)}
                          >
                            {openAnswerIdx === answerKey ? 'উত্তর লুকান' : 'উত্তর দেখুন'}
                          </button>
                          {openAnswerIdx === answerKey && (
                            <div className="p-3 bg-gray-50 rounded border border-gray-200" style={{ whiteSpace: 'pre-line' }}>
                              <span className="font-semibold text-success">উত্তর:</span>
                              <div className="mt-1 text-gray-700">
                                {renderText(sq.answer.full_explanation || sq.answer.final_answer)}
                              </div>
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
        </div>
      );
    }

    // filter=ka/kha/ga/gha → single sub_question
    const showStem = ['ga', 'gha'].includes(selectedFilter);
    return (
      <div key={idx} className="card bg-base-100 shadow-xl my-4 overflow-x-auto">
        <div className="card-body p-4 sm:p-6" style={{ wordBreak: 'break-word' }}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="card-title text-lg font-bold whitespace-nowrap">
              {getBengaliNum(globalIdx)}। {item.source || ''}
            </h2>
            <span className="badge badge-sm badge-outline whitespace-nowrap">প্রশ্ন নং: {item.question_no}</span>
            <button
              className="btn btn-xs btn-accent sm:ml-auto"
              onClick={() => setAskAI({ open: true, questionText: item.sub_question?.question_text || '', stemText: item.stem?.text || '', imageUrl: (item.stem?.has_image && item.stem?.image_url) || '', source: item.source || '' })}
            >
              🤖 Ask AI
            </button>
          </div>
          {/* Stem শুধু গ/ঘ তে দেখাবে */}
          {showStem && item.stem && (
            <div className="border-b pb-3 mb-3">
              {item.stem.text && <div className="text-base">{renderText(item.stem.text)}</div>}
              {item.stem.has_image && item.stem.image_url && (
                <div className="flex justify-center mt-2">
                  <img
                    src={item.stem.image_url}
                    alt="stem"
                    className="rounded-lg max-w-xs h-auto"
                    style={{ maxHeight: '180px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          )}
          {/* Single sub question */}
          {item.sub_question && (() => {
            const hasAnswer = item.sub_question.answer && (item.sub_question.answer.full_explanation || item.sub_question.answer.final_answer);
            return (
              <div className="border-l-4 border-primary pl-4">
                <span className="font-bold mr-2">{item.sub_question.label}।</span>
                {renderText(item.sub_question.question_text)}
                {item.sub_question.marks && (
                  <span className="text-xs text-gray-400 ml-2">[{item.sub_question.marks} নম্বর]</span>
                )}
                {viewType === 'all' && hasAnswer && (
                  <div className="mt-2">
                    <button
                      className="btn btn-sm btn-outline btn-success mb-2"
                      onClick={() => setOpenAnswerIdx(openAnswerIdx === idx ? null : idx)}
                    >
                      {openAnswerIdx === idx ? 'উত্তর লুকান' : 'উত্তর দেখুন'}
                    </button>
                    {openAnswerIdx === idx && (
                      <div className="p-3 bg-gray-50 rounded border border-gray-200" style={{ whiteSpace: 'pre-line' }}>
                        <span className="font-semibold text-success">উত্তর:</span>
                        <div className="mt-1 text-gray-700">
                          {renderText(item.sub_question.answer.full_explanation || item.sub_question.answer.final_answer)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  // =============================================
  // Suggestion analysis & download
  // =============================================
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
      const res = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) throw new Error('ডাটা লোড ব্যর্থ');
      const data = await res.json();
      const cqResults = data.results || [];

      const topicAnalysis = new Map();
      cqResults.forEach(item => {
        const sqs = item.sub_questions || [];
        sqs.forEach(sq => {
          if (sq.chapter_no !== parseInt(selectedChapter)) return;
          if (!['গ', 'ঘ'].includes(sq.label)) return;
          const topicKey = sq.topic_name || 'অন্যান্য';
          if (!topicAnalysis.has(topicKey)) {
            topicAnalysis.set(topicKey, {
              code: sq.topic_code || '',
              name: topicKey,
              ga: 0,
              gha: 0,
              boardMap: new Map(),
            });
          }
          const entry = topicAnalysis.get(topicKey);
          if (sq.label === 'গ') entry.ga++;
          if (sq.label === 'ঘ') entry.gha++;
          const source = item.source || '';
          if (source) {
            if (!entry.boardMap.has(source)) entry.boardMap.set(source, new Set());
            entry.boardMap.get(source).add(sq.label);
          }
        });
      });

      let analysisArray = Array.from(topicAnalysis.values())
        .map(t => ({
          code: t.code,
          name: t.name,
          ga: t.ga,
          gha: t.gha,
          total: t.ga + t.gha,
          boards: Array.from(t.boardMap.entries())
            .sort(([aS], [bS]) => extractYear(bS) - extractYear(aS))
            .map(([source, labels]) => `${source}(${Array.from(labels).join(',')})`),
        }))
        .sort((a, b) => {
          const codeA = (a.code || '').match(/T-(\d+)/i);
          const codeB = (b.code || '').match(/T-(\d+)/i);
          if (codeA && codeB) return parseInt(codeA[1]) - parseInt(codeB[1]);
          return b.total - a.total;
        });

      const maxTotal = Math.max(...analysisArray.map(t => t.total), 1);
      analysisArray = analysisArray.map(t => ({
        ...t,
        importance: t.total >= maxTotal * 0.35 ? '***' : t.total >= maxTotal * 0.1 ? '**' : '*',
      }));

      setSuggestionData(analysisArray);
      setShowSuggestion(true);
    } catch (err) {
      console.error('Suggestion generation failed:', err);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const downloadSuggestion = async () => {
    if (!suggestionRef.current) return;
    setDownloadingPng(true);
    try {
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await toPng(suggestionRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      const ch = chapters.find(c => c.id === parseInt(selectedChapter));
      const chName = ch ? ch.title : selectedChapter;
      link.download = `সাজেশন-অধ্যায়-${selectedChapter}-${chName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setDownloadingPng(false);
    }
  };

  // =============================================
  // JSX
  // =============================================
  return (
    <MathJaxContext
      config={{
        loader: { load: ['input/tex', 'output/chtml'] },
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      }}
    >
      <div className="container mx-auto p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-2">
          বোর্ড প্রশ্ন ব্যাংক
          {contextText && (
            <span className="ml-2 text-lg font-semibold text-blue-700">[{contextText}]</span>
          )}
        </h1>
        <h2 className="text-xl font-bold mb-4">{headingText}</h2>

        {/* ============ Filters ============ */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* শ্রেণি */}
          <select
            className="select select-bordered"
            value={selectedClass}
            onChange={e => {
              setSelectedClass(e.target.value);
              setSelectedSubject('');
              setSelectedQtype('');
              setSelectedChapter('');
              setResults([]);
              setCurrentPage(1);
            }}
          >
            <option value="">শ্রেণি</option>
            {classes.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          {/* বিষয় */}
          {selectedClass && (
            <select
              className="select select-bordered"
              value={selectedSubject}
              onChange={e => {
                setSelectedSubject(e.target.value);
                setSelectedQtype('');
                setSelectedChapter('');
                setResults([]);
                setCurrentPage(1);
              }}
            >
              <option value="">বিষয়</option>
              {subjectsForClass.map((m, i) => (
                <option key={i} value={m.subject.code}>{m.subject.name}</option>
              ))}
            </select>
          )}

          {/* প্রশ্নের ধরন (qtype) */}
          {selectedClass && selectedSubject && (
            <select
              className="select select-bordered"
              value={selectedQtype}
              onChange={e => {
                setSelectedQtype(e.target.value);
                setSelectedChapter('');
                setResults([]);
                setCurrentPage(1);
              }}
            >
              <option value="">প্রশ্নের ধরন</option>
              {qtypes.map((q, i) => (
                <option key={i} value={q.code}>{q.name}</option>
              ))}
            </select>
          )}

          {/* অধ্যায় */}
          {selectedClass && selectedSubject && selectedQtype && (
            <select
              className="select select-bordered"
              value={selectedChapter}
              onChange={e => {
                setSelectedChapter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">অধ্যায়</option>
              {chapters.map(ch => (
                <option key={ch.id} value={ch.id}>অধ্যায় {getBengaliNum(ch.id)}: {ch.title}</option>
              ))}
            </select>
          )}

          {/* ভিউ টাইপ */}
          <select
            className="select select-bordered"
            value={viewType}
            onChange={e => setViewType(e.target.value)}
          >
            <option value="all">প্রশ্ন ও উত্তর</option>
            <option value="question">শুধু প্রশ্ন</option>
          </select>

          {/* ফিল্টার (cq / ka / kha / ga / gha) */}
          {selectedClass && selectedSubject && selectedChapter && (
            <select
              className="select select-bordered"
              value={selectedFilter}
              onChange={e => {
                setSelectedFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {filterOptions.map((f, i) => (
                <option key={i} value={f.value}>{f.label}</option>
              ))}
            </select>
          )}

          {/* সোর্স */}
          {results.length > 0 && sources.length > 0 && (
            <select
              className="select select-bordered"
              value={selectedSource}
              onChange={e => { setSelectedSource(e.target.value); setCurrentPage(1); }}
            >
              <option value="">সোর্স</option>
              {sources.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          )}

          {/* টপিক */}
          {results.length > 0 && topics.length > 0 && (
            <select
              className="select select-bordered"
              value={selectedTopic}
              onChange={e => { setSelectedTopic(e.target.value); setCurrentPage(1); }}
            >
              <option value="">টপিক</option>
              {topics.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {/* ============ Status Messages ============ */}
        {(loading) && <div className="text-center py-8">লোড হচ্ছে...</div>}
        {error && <div className="text-center py-8 text-error">Error: {error}</div>}

        {!selectedClass && !loading && !error && (
          <div className="text-center py-8">শ্রেণি বাছাই করুন</div>
        )}
        {selectedClass && !selectedSubject && !loading && !error && (
          <div className="text-center py-8">বিষয় বাছাই করুন</div>
        )}
        {selectedClass && selectedSubject && !selectedQtype && !loading && !error && (
          <div className="text-center py-8">প্রশ্নের ধরন বাছাই করুন</div>
        )}
        {selectedClass && selectedSubject && selectedQtype && !selectedChapter && !loading && !error && (
          <div className="text-center py-8">অধ্যায় বাছাই করুন</div>
        )}

        {/* ============ Results ============ */}
        {selectedChapter && !loading && !error && (
          <div>
            {results.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-sm text-gray-500">
                  মোট: {getBengaliNum(filteredResults.length)} টি প্রশ্ন পাওয়া গেছে
                </span>
                <button
                  className="btn btn-sm btn-outline btn-info gap-1"
                  onClick={generateSuggestion}
                  disabled={suggestionLoading}
                >
                  {suggestionLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    '📊'
                  )}
                  সাজেশন দেখুন
                </button>
              </div>
            )}

            <div className="space-y-4">
              {paginatedResults.length === 0 && (
                <div className="text-center py-8">কোনো প্রশ্ন পাওয়া যায়নি</div>
              )}
              {groupedByTopic.map((group, gi) => (
                <div key={gi}>
                  <div className="sticky top-16 z-10 bg-base-200 dark:bg-base-300 rounded-lg px-4 py-2 mb-3 mt-4 shadow-sm border-l-4 border-primary">
                    <span className="font-bold text-primary text-sm">{group.code ? `${group.code}: ` : ''}{group.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({getBengaliNum(group.items.length)} টি)</span>
                  </div>
                  {group.items.map(({ item, idx }) => renderCard(item, idx))}
                </div>
              ))}
            </div>

            {/* ============ Pagination ============ */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  className="btn btn-xs"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >←</button>
                {(() => {
                  const btns = [];
                  const maxV = 5;
                  let start = Math.max(1, currentPage - Math.floor(maxV / 2));
                  let end = Math.min(totalPages, start + maxV - 1);
                  if (end - start + 1 < maxV) start = Math.max(1, end - maxV + 1);

                  if (start > 1) {
                    btns.push(
                      <button key={1} className={`btn btn-xs ${currentPage === 1 ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(1)}>
                        {getBengaliNum(1)}
                      </button>
                    );
                    if (start > 2) btns.push(<span key="se" className="px-1">...</span>);
                  }
                  for (let i = start; i <= end; i++) {
                    btns.push(
                      <button key={i} className={`btn btn-xs ${currentPage === i ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(i)}>
                        {getBengaliNum(i)}
                      </button>
                    );
                  }
                  if (end < totalPages) {
                    if (end < totalPages - 1) btns.push(<span key="ee" className="px-1">...</span>);
                    btns.push(
                      <button key={totalPages} className={`btn btn-xs ${currentPage === totalPages ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(totalPages)}>
                        {getBengaliNum(totalPages)}
                      </button>
                    );
                  }
                  return btns;
                })()}
                <button
                  className="btn btn-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >→</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      {showSuggestion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', maxWidth: '960px', width: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <button
              style={{ position: 'absolute', right: '12px', top: '12px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}
              onClick={() => setShowSuggestion(false)}
            >✕</button>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', gap: '8px' }}>
              <button
                style={{ padding: '6px 16px', backgroundColor: downloadingPng ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: downloadingPng ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600 }}
                onClick={downloadSuggestion}
                disabled={downloadingPng}
              >
                {downloadingPng ? '⏳ তৈরি হচ্ছে...' : '📥 ডাউনলোড PNG'}
              </button>
            </div>

            <div ref={suggestionRef} style={{ padding: '24px', backgroundColor: '#fff', fontFamily: 'Hind Siliguri, sans-serif', color: '#1e293b' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#475569', margin: 0 }}>
                  অধ্যায় {getBengaliNum(selectedChapter)}
                </p>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#2563eb', margin: '4px 0' }}>
                  {chapters.find(c => c.id === parseInt(selectedChapter))?.title || ''}
                </h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                  বোর্ড সৃজনশীল বিশ্লেষণ ও সাজেশন
                </p>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#fff' }}>
                    <th style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'center', width: '60px' }}>গুরুত্ব</th>
                    <th style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'left' }}>টপিক</th>
                    <th style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'center', width: '40px' }}>গ</th>
                    <th style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'center', width: '40px' }}>ঘ</th>
                    <th style={{ border: '1px solid #334155', padding: '8px 6px', textAlign: 'left' }}>বোর্ডসমূহ</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestionData.map((t, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{
                        border: '1px solid #e2e8f0', padding: '8px 6px', textAlign: 'center',
                        fontWeight: 700, fontSize: '16px',
                        color: t.importance === '***' ? '#dc2626' : t.importance === '**' ? '#ea580c' : '#65a30d',
                      }}>{t.importance}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '8px 6px', fontWeight: 600, color: '#1e3a5f' }}>{t.name}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{t.ga}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#0891b2' }}>{t.gha}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: '8px 6px', fontSize: '11px', lineHeight: '1.5', color: '#475569' }}>
                        {t.boards.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '16px' }}>
                <span><span style={{ color: '#dc2626', fontWeight: 700 }}>***</span> = অতি গুরুত্বপূর্ণ</span>
                <span><span style={{ color: '#ea580c', fontWeight: 700 }}>**</span> = গুরুত্বপূর্ণ</span>
                <span><span style={{ color: '#65a30d', fontWeight: 700 }}>*</span> = সাধারণ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI Modal */}
      <AskAIModal
        isOpen={askAI.open}
        onClose={() => setAskAI({ open: false, questionText: '', stemText: '', imageUrl: '', source: '' })}
        questionText={askAI.questionText}
        stemText={askAI.stemText}
        imageUrl={askAI.imageUrl}
        source={askAI.source}
      />
    </MathJaxContext>
  );
}

export default BoardCQPage;
