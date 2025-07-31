
import React, { useState, useEffect } from 'react';
import CQCard from '../Components/CQCard/CQCard';
import CQWithAnswer from '../Components/CQWithAnswer/CQWithAnswer';
import { MathJaxContext } from 'better-react-mathjax';

// Pagination state
// (component body-তে থাকবে)

// Cognitive types for filtering
const cognitiveTypes = ['জ্ঞানমূলক', 'অনুধাবন', 'প্রয়োগ', 'উচ্চতর দক্ষতা'];
// Bengali number utility
function getBengaliNum(num) {
  return String(num)
    .split('')
    .map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d)
    .join('');
}
// Cognitive type mapping utility
const cognitiveTypeMap = {
  'জ্ঞানমূলক': 'Knowledge-based',
  'অনুধাবন': 'Understanding',
  'প্রয়োগ': 'Application',
  'উচ্চতর দক্ষতা': 'Higher-order skills',
};


function CreativeCQPage() {
  const pageSize = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const [cognitiveType, setCognitiveType] = useState('');
  const [cqData, setCqData] = useState([]); // Loaded CQ data for selected chapter
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [source, setSource] = useState('');
  const [viewType, setViewType] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [mapping, setMapping] = useState([]); // cqmapping.json
  const [chapterUrl, setChapterUrl] = useState('');

  // Fetch mapping.json on mount
  useEffect(() => {
    const fetchMapping = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('https://corsproxy.io/?https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/cqmapping.json');
        if (!res.ok) throw new Error('Mapping fetch failed');
        const data = await res.json();
        setMapping(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Mapping fetch error: ' + (err?.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    fetchMapping();
  }, []);

  // Subjects for selected class
  const subjects = selectedClass
    ? mapping.filter(m => m['শ্রেণি'] === selectedClass).map(m => m['বিষয়'])
    : [];

  // Chapters for selected subject
  const chapters = (selectedClass && selectedSubject)
    ? Object.keys((mapping.find(m => m['শ্রেণি'] === selectedClass && m['বিষয়'] === selectedSubject)?.['অধ্যায়'] || {}))
    : [];

  // When chapter changes, fetch CQ data for that chapter
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedChapter) {
      const url = mapping.find(m => m['শ্রেণি'] === selectedClass && m['বিষয়'] === selectedSubject)?.['অধ্যায়']?.[selectedChapter];
      if (url) {
        setChapterUrl(url);
        setLoading(true);
        setError(null);
        fetch('https://corsproxy.io/?' + url, {
          headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
        })
          .then(res => {
            if (!res.ok) throw new Error('CQ fetch failed');
            return res.json();
          })
          .then(data => {
            setCqData(Array.isArray(data) ? data : [data]);
          })
          .catch(err => {
            setError('CQ fetch error: ' + (err?.message || 'Unknown error'));
            setCqData([]);
          })
          .finally(() => setLoading(false));
      } else {
        setCqData([]);
        setChapterUrl('');
      }
    } else {
      setCqData([]);
      setChapterUrl('');
    }
    setSelectedTopic('');
    setCurrentPage(1);
  }, [selectedClass, selectedSubject, selectedChapter, mapping]);

  // Boards (sources)
  const boards = Array.from(new Set(cqData.map(item => item.source).filter(Boolean)));

  // Topics for filter
  const topics = (selectedChapter && cognitiveType)
    ? Array.from(new Set(
        cqData
          .flatMap(item =>
            Array.isArray(item.প্রশ্নাবলী)
              ? item.প্রশ্নাবলী
                  .filter(q => q.chapter === selectedChapter && q.ধরন === cognitiveTypeMap[cognitiveType])
                  .map(q => q.topic)
                  .filter(Boolean)
              : []
          )
      ))
    : [];

  // Filtered CQ
  const filtered = cqData.filter(item => {
    return (
      (!source || item.source === source)
    );
  });


  // Dynamic heading logic
  let headingText = 'সৃজনশীল প্রশ্ন';
  if (!selectedClass) {
    headingText = 'শ্রেণি বাছাই করুন';
  } else if (!selectedSubject) {
    headingText = 'বিষয় বাছাই করুন';
  } else if (!selectedChapter) {
    headingText = 'অধ্যায় বাছাই করুন';
  } else if (cognitiveType) {
    headingText = cognitiveType;
  }

  // Heading with subject/chapter context
  let contextText = '';
  if (selectedClass) {
    contextText = selectedClass;
    if (selectedSubject) {
      contextText += ` / ${selectedSubject}`;
      if (selectedChapter) {
        contextText += ` / ${selectedChapter}`;
      }
    }
  }

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    }}>
      <div className="container mx-auto p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-2">
          প্রশ্ন ব্যাংক
          {contextText && (
            <span className="ml-2 text-lg font-semibold text-blue-700">[{contextText}]</span>
          )}
        </h1>
        <h2 className="text-xl font-bold mb-4">{headingText}</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Class select */}
          <select className="select select-bordered" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); setCqData([]); setCurrentPage(1); }}>
            <option value="">শ্রেণি</option>
            {Array.from(new Set(mapping.map(m => m['শ্রেণি']))).map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
          </select>
          {/* Subject select */}
          {selectedClass && (
            <select className="select select-bordered" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); setCqData([]); setCurrentPage(1); }}>
              <option value="">বিষয়</option>
              {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
            </select>
          )}
          {/* Chapter select */}
          {selectedClass && selectedSubject && (
            <select className="select select-bordered" value={selectedChapter} onChange={e => { setSelectedChapter(e.target.value); setCurrentPage(1); }}>
              <option value="">অধ্যায়</option>
              {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
            </select>
          )}
          {/* View type */}
          <select className="select select-bordered" value={viewType} onChange={e => setViewType(e.target.value)}>
            <option value="all">প্রশ্ন ও উত্তর</option>
            <option value="question">শুধু প্রশ্ন</option>
          </select>
          {/* Cognitive type */}
          <select className="select select-bordered" value={cognitiveType} onChange={e => { setCognitiveType(e.target.value); setSelectedTopic(''); }}>
            <option value="">প্রশ্নের ধরন</option>
            {cognitiveTypes.map((type, i) => <option key={i} value={type}>{type}</option>)}
          </select>
          {/* টপিক ফিল্টার: কেবল ধরন সিলেক্ট করলে দেখাবে */}
          {cognitiveType && selectedChapter && topics.length > 0 && (
            <select className="select select-bordered" value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}>
              <option value="">টপিক</option>
              {topics.map((t, i) => <option key={i} value={t}>{t}</option>)}
            </select>
          )}
          {/* সোর্স অপশন সবসময় দেখাবে */}
          <select className="select select-bordered" value={source} onChange={e => setSource(e.target.value)}>
            <option value="">সোর্স</option>
            {boards.map((b, i) => <option key={i} value={b}>{b}</option>)}
          </select>
        </div>
        {loading && <div className="text-center py-8">লোড হচ্ছে...</div>}
        {error && <div className="text-center py-8 text-error">Error: {error}</div>}
        {/* Step 1: Class/Subject/Chapter select only, then CQ render */}
        {!selectedClass && !loading && !error && (
          <div className="text-center py-8">শ্রেণি বাছাই করুন</div>
        )}
        {selectedClass && !selectedSubject && !loading && !error && (
          <div className="text-center py-8">বিষয় বাছাই করুন</div>
        )}
        {selectedClass && selectedSubject && !selectedChapter && !loading && !error && (
          <div className="text-center py-8">অধ্যায় বাছাই করুন</div>
        )}
        {/* Step 2: Show CQ for selected chapter */}
        {selectedClass && selectedSubject && selectedChapter && (
          <div>
            <button className="btn btn-sm mb-4" onClick={() => setSelectedChapter('')}>← অধ্যায়ে ফিরে যান</button>
            <div className="space-y-6">
              {(() => {
                if (loading) return null;
                if (error) return <div className="text-center py-8 text-error">Error: {error}</div>;
                if (filtered.length === 0) {
                  return <div className="text-center py-8">No CQ found</div>;
                }
                // কার্ডগুলো সাল অনুযায়ী descending (নতুন বছর আগে) sort
                const bn2en = s => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
                const boardPriority = [
                  'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'দিনাজপুর', 'ময়মনসিংহ', 'ময়মনসিংহ'
                ];
                const extractBoard = (item) => {
                  let str = (item.source || '').trim();
                  for (const board of boardPriority) {
                    if (str.startsWith(board)) return board;
                  }
                  str = (item.উদ্দীপক?.title || '').trim();
                  for (const board of boardPriority) {
                    if (str.startsWith(board)) return board;
                  }
                  return '';
                };
                const extractYear = (item) => {
                  let str = (item.উদ্দীপক?.title || '').trim();
                  let match = str.match(/(19|20)\d{2}/);
                  if (!match) match = bn2en(str).match(/(19|20)\d{2}/);
                  if (match) { return parseInt(match[0], 10); }
                  str = (item.source || '').trim();
                  match = str.match(/(19|20)\d{2}/);
                  if (!match) match = bn2en(str).match(/(19|20)\d{2}/);
                  if (match) { return parseInt(match[0], 10); }
                  if (Array.isArray(item.প্রশ্নাবলী)) {
                    for (const q of item.প্রশ্নাবলী) {
                      if (q.source) {
                        let m = q.source.trim().match(/(19|20)\d{2}/);
                        if (!m) m = bn2en(q.source.trim()).match(/(19|20)\d{2}/);
                        if (m) { return parseInt(m[0], 10); }
                      }
                    }
                  }
                  return 0;
                };
                let filteredCards = filtered;
                // কার্ড ফিল্টার ও sort
                let sorted = [...filteredCards].sort((a, b) => {
                  const yearDiff = extractYear(b) - extractYear(a);
                  if (yearDiff !== 0) return yearDiff;
                  const boardA = extractBoard(a);
                  const boardB = extractBoard(b);
                  const idxA = boardPriority.indexOf(boardA);
                  const idxB = boardPriority.indexOf(boardB);
                  return idxA - idxB;
                });
                // কার্ডের প্রশ্ন ফিল্টার (cognitiveType থাকলে)
                let cardList = sorted.map((item) => {
                  let filteredQuestions;
                  if (!cognitiveType) {
                    filteredQuestions = item.প্রশ্নাবলী;
                  } else {
                    filteredQuestions = item.প্রশ্নাবলী.filter(q => q.chapter === selectedChapter && q.ধরন === cognitiveTypeMap[cognitiveType]);
                  }
                  if (cognitiveType && selectedTopic && Array.isArray(filteredQuestions)) {
                    filteredQuestions = filteredQuestions.filter(q => q.topic === selectedTopic);
                  }
                  if (!filteredQuestions || filteredQuestions.length === 0) return null;
                  return { ...item, প্রশ্নাবলী: filteredQuestions };
                }).filter(Boolean);
                // Pagination
                const totalPages = Math.ceil(cardList.length / pageSize);
                cardList = cardList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
                let cardIdx = (currentPage - 1) * pageSize;
                const cardNodes = cardList.map((data) => {
                  cardIdx++;
                  const cardData = { ...data, index: cardIdx };
                  if (!cognitiveType) {
                    return (
                      <div key={data.id || cardIdx}>
                        {viewType === 'all' && <CQWithAnswer data={cardData} />}
                        {viewType === 'question' && <CQCard data={cardData} />}
                      </div>
                    );
                  } else {
                    const showUddipak = !(cognitiveType === 'জ্ঞানমূলক' || cognitiveType === 'অনুধাবন');
                    const showSource = (cognitiveType === 'জ্ঞানমূলক' || cognitiveType === 'অনুধাবন');
                    return (
                      <div key={data.id || cardIdx}>
                        {viewType === 'all' && <CQWithAnswer data={cardData} showUddipak={showUddipak} showSource={showSource} />}
                        {viewType === 'question' && <CQCard data={cardData} showUddipak={showUddipak} showSource={showSource} />}
                      </div>
                    );
                  }
                });
                return <>
                  {cardNodes}
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                      <button className="btn btn-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>←</button>
                      {/* Responsive pagination with ellipsis */}
                      {(() => {
                        const pageButtons = [];
                        const maxButtons = 5;
                        let start = Math.max(1, currentPage - 2);
                        let end = Math.min(totalPages, currentPage + 2);
                        if (currentPage <= 3) {
                          start = 1;
                          end = Math.min(totalPages, maxButtons);
                        } else if (currentPage >= totalPages - 2) {
                          start = Math.max(1, totalPages - maxButtons + 1);
                          end = totalPages;
                        }
                        if (start > 1) {
                          pageButtons.push(
                            <button key={1} className={`btn btn-xs ${currentPage === 1 ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(1)}>1</button>
                          );
                          if (start > 2) pageButtons.push(<span key="start-ellipsis" className="px-1">...</span>);
                        }
                        for (let i = start; i <= end; i++) {
                          if (i === 1 || i === totalPages) continue;
                          pageButtons.push(
                            <button key={i} className={`btn btn-xs ${currentPage === i ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>
                          );
                        }
                        if (end < totalPages) {
                          if (end < totalPages - 1) pageButtons.push(<span key="end-ellipsis" className="px-1">...</span>);
                          pageButtons.push(
                            <button key={totalPages} className={`btn btn-xs ${currentPage === totalPages ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                          );
                        }
                        return pageButtons;
                      })()}
                      <button className="btn btn-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>→</button>
                    </div>
                  )}
                </>;
              })()}
            </div>
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}

export default CreativeCQPage;
