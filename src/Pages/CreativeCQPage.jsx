
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
  const pageSize = 15; // প্রতি পেজে ১৫টা CQ কার্ড
  const [currentPage, setCurrentPage] = useState(1);
  const [cognitiveType, setCognitiveType] = useState('');
  const [cqData, setCqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [source, setSource] = useState('');
  const [viewType, setViewType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://corsproxy.io/?https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/HSC/BCQ/P01.json',
          {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCqData(Array.isArray(data) ? data : [data]);
      } catch (err) {
        setError(err?.message || 'Unknown error');
        setCqData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Unique subjects
  const subjects = Array.from(new Set(cqData.map(item => item.subject || item.chapter).filter(Boolean)));
  // Chapters for selected subject
  const chapters = Array.from(new Set(
    cqData
      .filter(item => (selectedSubject ? (item.subject || item.chapter) === selectedSubject : true))
      .map(item => item.chapter)
      .filter(Boolean)
  ));
  // Boards (sources)
  const boards = Array.from(new Set(cqData.map(item => item.source).filter(Boolean)));

  // Filtered CQ: Default-সব প্রশ্ন, ধরন সিলেক্ট করলে শুধু সেই ধরন, টপিকও চাইলে ওই টপিকের ওই ধরনের প্রশ্ন
  const [selectedTopic, setSelectedTopic] = useState('');
  // টপিক অপশন: chapter ও cognitiveType দুটোই সিলেক্ট থাকলে শুধু ওই ধরনের প্রশ্নের টপিক দেখাবে
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

  const filtered = cqData.filter(item => {
    return (
      (!selectedSubject || (item.subject || item.chapter) === selectedSubject) &&
      (!!selectedChapter && item.chapter === selectedChapter) &&
      (!source || item.source === source)
    );
  });

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    }}>
      <div className="container mx-auto p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h2 className="text-xl font-bold mb-4">
          {cognitiveType ? cognitiveType : 'সৃজনশীল প্রশ্ন'}
        </h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <select className="select select-bordered" value={viewType} onChange={e => setViewType(e.target.value)}>
            <option value="all">প্রশ্ন ও উত্তর</option>
            <option value="question">শুধু প্রশ্ন</option>
          </select>
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
        {loading && <div className="text-center py-8">Loading...</div>}
        {error && <div className="text-center py-8 text-error">Error: {error}</div>}
        {/* Step 1: Show subjects as cards */}
        {!selectedSubject && !loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((subj, idx) => (
              <div key={idx} className="card bg-gray-200 text-gray-800 shadow hover:bg-blue-500 cursor-pointer" onClick={() => setSelectedSubject(subj)}>
                <div className="card-body text-center">
                  <span className="font-bold text-lg">{subj}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Step 2: Show chapters for selected subject */}
        {selectedSubject && !selectedChapter && (
          <div>
            <button className="btn btn-sm mb-4" onClick={() => setSelectedSubject('')}>← সাবজেক্টে ফিরে যান</button>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {chapters.map((ch, idx) => (
                <div key={idx} className="card bg-gray-200 text-gray-800 shadow hover:bg-blue-500 cursor-pointer" onClick={() => setSelectedChapter(ch)}>
                  <div className="card-body text-center">
                    <span className="font-bold text-lg">{ch}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Step 3: Show CQ for selected chapter */}
        {selectedSubject && selectedChapter && (
          <div>
            <button className="btn btn-sm mb-4" onClick={() => setSelectedChapter('')}>← অধ্যায়ে ফিরে যান</button>
            <div className="space-y-6">
              {(() => {
                if (filtered.length === 0) {
                  return <div className="text-center py-8">No CQ found</div>;
                }
                // কার্ডগুলো সাল অনুযায়ী descending (নতুন বছর আগে) sort
                // বাংলা year extraction helper
                const bn2en = s => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
                // বোর্ড অর্ডার
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
                // কার্ড ফিল্টার, sort, তারপর প্রশ্ন ফিল্টার, তারপর pagination
                let filteredCards = filtered;
                if (cognitiveType && selectedChapter) {
                  filteredCards = filtered.filter(item => item.chapter === selectedChapter);
                }
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
                // Pagination: প্রশ্নের ধরন/চাপ্টার ফিল্টার করার পর কার্ডে paginate
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
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          className={`btn btn-xs ${currentPage === i + 1 ? 'btn-primary' : ''}`}
                          onClick={() => setCurrentPage(i + 1)}
                        >{i + 1}</button>
                      ))}
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
