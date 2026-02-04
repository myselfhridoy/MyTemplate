import React, { useState, useEffect } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import MathRenderer from '../Components/MathRenderer/MathRenderer';

// Bengali number utility
function getBengaliNum(num) {
  return String(num)
    .split('')
    .map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d)
    .join('');
}

// GitHub repo info
const GITHUB_REPO = 'myselfhridoy/NCTB-Board-CQ';
const GITHUB_BRANCH = 'main';

async function fetchFromGitHub(path) {
  // Use our backend proxy to securely fetch from private GitHub repo
  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? 'http://localhost:3000' : '';
  const url = `${baseUrl}/api/github-proxy?path=${encodeURIComponent(path)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function getImageUrl(imagePath, subject, paper) {
  // Images are stored in HSC/{subject}{paper}/BCQ/images/
  // imagePath from JSON: "images/cq_AB18_fig01.jpg"
  
  // Remove "images/" prefix if present, we'll add it back in the full path
  const cleanPath = imagePath.replace('images/', '');
  const fullPath = `HSC/${subject}${paper}/BCQ/images/${cleanPath}`;
  
  // Use backend proxy for private repo images
  const isDev = import.meta.env.DEV;
  const baseUrl = isDev ? 'http://localhost:3000' : '';
  const url = `${baseUrl}/api/github-image?path=${encodeURIComponent(fullPath)}`;
  console.log('Image URL:', url);
  return url;
}

// Question card component for Board CQ
function BoardCQCard({ data, showAnswer = false, subject, paper }) {
  const { metadata, questions } = data;

  return (
    <div className="card bg-base-100 shadow-xl mb-6 border border-base-300">
      {/* Metadata Header */}
      <div className="card-body">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="badge badge-primary">{metadata.subject}</span>
          <span className="badge badge-secondary">{metadata.paper}</span>
          <span className="badge badge-accent">{metadata.source}</span>
          <span className="badge badge-info">{metadata.year}</span>
          <span className="badge">{metadata.exam_type}</span>
        </div>

        {/* Questions */}
        {questions.map((question, qIdx) => (
          <div key={qIdx} className="mb-8 p-4 bg-base-200 rounded-lg">
            {/* Stem */}
            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">
                প্রশ্ন {getBengaliNum(question.question_no)}
              </h3>
              <div className="prose max-w-none">
                <MathRenderer text={question.stem.text} />
              </div>
              {question.stem.has_image && question.stem.image_url && (
                <div className="my-4">
                  <img
                    src={getImageUrl(question.stem.image_url, subject, paper)}
                    alt={question.stem.image_description || 'Stem image'}
                    className="w-full md:max-w-md lg:max-w-lg h-auto rounded-lg shadow-md mx-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-sm text-gray-500 mt-2">
                    {question.stem.image_description}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-questions */}
            <div className="space-y-4">
              {question.sub_questions.map((subQ, sqIdx) => (
                <div key={sqIdx} className="pl-4 border-l-4 border-primary">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="badge badge-sm badge-primary">{subQ.label}</span>
                    <span className="badge badge-sm">{subQ.type}</span>
                    <span className="badge badge-sm badge-ghost">{subQ.marks} নম্বর</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    {subQ.chapter_name} → {subQ.topic_name}
                  </div>
                  
                  <div className="prose max-w-none mb-2">
                    <MathRenderer text={subQ.question_text} />
                  </div>

                  {/* Answer section (if showAnswer is true) */}
                  {showAnswer && subQ.answer && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">উত্তর:</h4>
                      
                      {subQ.answer.full_explanation && (
                        <div className="prose max-w-none mb-2">
                          <MathRenderer text={subQ.answer.full_explanation} />
                        </div>
                      )}

                      {subQ.answer.steps && subQ.answer.steps.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {subQ.answer.steps.map((step, stepIdx) => (
                            <div key={stepIdx} className="prose max-w-none">
                              <MathRenderer text={step} />
                            </div>
                          ))}
                        </div>
                      )}

                      {subQ.answer.final_answer && (
                        <div className="prose max-w-none font-semibold">
                          <MathRenderer text={subQ.answer.final_answer} />
                        </div>
                      )}

                      {subQ.answer.has_image && subQ.answer.image_url && (
                        <div className="my-2">
                          <img
                            src={getImageUrl(subQ.answer.image_url, subject, paper)}
                            alt={subQ.answer.image_description || 'Answer image'}
                            className="w-full md:max-w-md lg:max-w-lg h-auto rounded-lg shadow-md mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardCQ() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [cqData, setCqData] = useState(null);
  const [showAnswer, setShowAnswer] = useState(true);

  // Available subjects
  const subjects = [
    { value: 'P', label: 'পদার্থবিজ্ঞান', papers: ['01', '02'] },
    { value: 'HM', label: 'উচ্চতর গণিত', papers: ['01', '02'] }
  ];

  // Available options (hardcoded for now, can be made dynamic)
  const papers = [
    { value: '01', label: '১ম পত্র' },
    { value: '02', label: '২য় পত্র' }
  ];

  const boards = [
    { value: 'AB', label: 'সকল বোর্ড', hasSession: true },
    { value: 'DB', label: 'ঢাকা বোর্ড', hasSession: false },
    { value: 'RB', label: 'রাজশাহী বোর্ড', hasSession: false },
    { value: 'CB', label: 'চট্টগ্রাম বোর্ড', hasSession: false },
    { value: 'JB', label: 'যশোর বোর্ড', hasSession: false },
    { value: 'CtgB', label: 'কুমিল্লা বোর্ড', hasSession: false },
    { value: 'DinB', label: 'দিনাজপুর বোর্ড', hasSession: false },
    { value: 'SBB', label: 'সিলেট বোর্ড', hasSession: false },
    { value: 'MSB', label: 'ময়মনসিংহ বোর্ড', hasSession: false }
  ];

  const years = [
    { value: '24', label: '২০২৪' },
    { value: '23', label: '২০২৩' },
    { value: '22', label: '২০২২' },
    { value: '21', label: '২০২১' },
    { value: '20', label: '২০২০' },
    { value: '19', label: '২০১৯' },
    { value: '18', label: '২০১৮' },
    { value: '17', label: '২০১৭' }
  ];

  const sessions = [
    { value: 'S1', label: 'সেশন ১' },
    { value: 'S2', label: 'সেশন ২' }
  ];

  // Load CQ data when all filters are selected
  useEffect(() => {
    const needsSession = selectedBoard === 'AB';
    const hasAllRequired = selectedSubject && selectedPaper && selectedYear && selectedBoard && (!needsSession || selectedSession);
    
    if (hasAllRequired) {
      loadCQData();
    } else {
      setCqData(null);
    }
  }, [selectedSubject, selectedPaper, selectedYear, selectedBoard, selectedSession]);

  const loadCQData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Format: HSC/P01/BCQ/Questions/cq_AB18S1.json or HSC/HM01/BCQ/Questions/cq_DB18.json
      let filename;
      if (selectedBoard === 'AB') {
        // AB has session: cq_AB18S1.json
        filename = `cq_${selectedBoard}${selectedYear}${selectedSession}.json`;
      } else {
        // Other boards don't have session: cq_DB18.json
        filename = `cq_${selectedBoard}${selectedYear}.json`;
      }
      const path = `HSC/${selectedSubject}${selectedPaper}/BCQ/Questions/${filename}`;
      
      console.log('Fetching from path:', path);
      console.log('API URL:', `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`);
      
      const data = await fetchFromGitHub(path);
      setCqData(data);
    } catch (err) {
      console.error('Fetch error:', err);
      const filename = selectedBoard === 'AB' 
        ? `cq_${selectedBoard}${selectedYear}${selectedSession}.json`
        : `cq_${selectedBoard}${selectedYear}.json`;
      setError(`ডাটা লোড করতে ব্যর্থ: ${err.message}. ফাইল: ${filename} পাওয়া যায়নি।`);
      setCqData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { 
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      }
    }}>
      <div className="container mx-auto p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-3xl font-extrabold mb-4">
          এইচএসসি বোর্ড প্রশ্ন
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select 
            className="select select-bordered" 
            value={selectedSubject} 
            onChange={e => {
              setSelectedSubject(e.target.value);
              setSelectedPaper('');
              setCqData(null);
            }}
          >
            <option value="">বিষয় নির্বাচন করুন</option>
            {subjects.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {selectedSubject && (
            <select 
              className="select select-bordered" 
              value={selectedPaper} 
              onChange={e => setSelectedPaper(e.target.value)}
            >
              <option value="">পত্র নির্বাচন করুন</option>
              {papers.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          )}

          <select 
            className="select select-bordered" 
            value={selectedYear} 
            onChange={e => setSelectedYear(e.target.value)}
          >
            <option value="">বছর নির্বাচন করুন</option>
            {years.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>

          <select 
            className="select select-bordered" 
            value={selectedBoard} 
            onChange={e => setSelectedBoard(e.target.value)}
          >
            <option value="">বোর্ড নির্বাচন করুন</option>
            {boards.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>

          {/* Session selector - only show for AB (সকল বোর্ড) */}
          {selectedBoard === 'AB' && (
            <select 
              className="select select-bordered" 
              value={selectedSession} 
              onChange={e => setSelectedSession(e.target.value)}
            >
              <option value="">সেশন নির্বাচন করুন</option>
              {sessions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}

          {cqData && (
            <div className="form-control">
              <label className="label cursor-pointer gap-2">
                <span className="label-text">উত্তর দেখান</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={showAnswer}
                  onChange={e => setShowAnswer(e.target.checked)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-4 text-lg">লোড হচ্ছে...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-bold">{error}</div>
              <div className="text-sm mt-2">বর্তমানে শুধুমাত্র এই ফাইলটি উপলব্ধ: <code>cq_AB18S1.json</code> (সকল বোর্ড ২০১৮, সেশন ১)</div>
            </div>
          </div>
        )}

        {/* Initial state */}
        {!loading && !error && !cqData && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold mb-2">বোর্ড প্রশ্ন দেখতে ফিল্টার নির্বাচন করুন</h2>
            <p className="text-gray-600">
              বিষয়, পত্র, বছর এবং বোর্ড নির্বাচন করুন
              {selectedBoard === 'AB' && ' (সকল বোর্ডের জন্য সেশন নির্বাচন করুন)'}
            </p>
          </div>
        )}

        {/* CQ Data Display */}
        {!loading && !error && cqData && (
          <div className="space-y-6">
            <BoardCQCard 
              data={cqData} 
              showAnswer={showAnswer} 
              subject={selectedSubject} 
              paper={selectedPaper} 
            />
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}

export default BoardCQ;
