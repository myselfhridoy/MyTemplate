import { useEffect, useMemo, useState } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import CQCard from '../Components/CQCard/CQCard';
import CQWithAnswer from '../Components/CQWithAnswer/CQWithAnswer';
import IOSButton from '../Components/ios/iOSButton';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';

const PAGE_SIZE = 15;
const CQMAPPING_URL = 'https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/cqmapping.json';

const COGNITIVE_TYPES = ['জ্ঞানমূলক', 'অনুধাবন', 'প্রয়োগ', 'উচ্চতর দক্ষতা'];
const COGNITIVE_MAP = {
  জ্ঞানমূলক: 'Knowledge-based',
  অনুধাবন: 'Understanding',
  প্রয়োগ: 'Application',
  প্রয়োগ: 'Application',
  'উচ্চতর দক্ষতা': 'Higher-order skills',
};
const BOARD_PRIORITY = ['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'দিনাজপুর', 'ময়মনসিংহ'];

const bn = (number) => String(number).split('').map((digit) => '০১২৩৪৫৬৭৮৯'[digit] ?? digit).join('');
const bn2en = (value) => (value || '').replace(/[০-৯]/g, (digit) => '০১২৩৪৫৬৭৮৯'.indexOf(digit));

const extractYear = (item) => {
  const candidates = [
    item?.উদ্দীপক?.title,
    item?.source,
    ...(Array.isArray(item?.প্রশ্নাবলী) ? item.প্রশ্নাবলী.map((question) => question?.source) : []),
  ];
  for (const candidate of candidates) {
    const match = bn2en(String(candidate || '').trim()).match(/(?:19|20)\d{2}/);
    if (match) return Number.parseInt(match[0], 10);
  }
  return 0;
};

const extractBoard = (item) => {
  const candidates = [item?.source, item?.উদ্দীপক?.title].map((value) => String(value || '').trim());
  for (const candidate of candidates) {
    const board = BOARD_PRIORITY.find((name) => candidate.startsWith(name));
    if (board) return board;
  }
  return '';
};

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ios-pressable transition-all ${
        active ? 'bg-primary text-white shadow-sm' : 'bg-base-200 text-base-content/70'
      }`}
    >
      {children}
    </button>
  );
}

function getSubject(item) {
  return item['বিষয়'] || item['বিষয়'];
}

export default function CreativeCQPage() {
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [cqData, setCqData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [viewType, setViewType] = useState('all');
  const [cognitiveType, setCognitiveType] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [source, setSource] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMapping = async () => {
      setMappingLoading(true);
      setError('');
      try {
        const response = await fetch(CQMAPPING_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Mapping request failed (${response.status})`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Mapping response is not an array');
        setMapping(data);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        console.error('Loading CQ mapping failed:', requestError);
        setError('Mapping: ' + (requestError.message || 'Unknown error'));
      } finally {
        if (!controller.signal.aborted) setMappingLoading(false);
      }
    };
    fetchMapping();
    return () => controller.abort();
  }, []);

  const classes = useMemo(
    () => Array.from(new Set(mapping.map((item) => item['শ্রেণি']).filter(Boolean))),
    [mapping]
  );
  const subjects = useMemo(
    () => (selectedClass
      ? Array.from(new Set(mapping
        .filter((item) => item['শ্রেণি'] === selectedClass)
        .map(getSubject)
        .filter(Boolean)))
      : []),
    [mapping, selectedClass]
  );
  const chapters = useMemo(() => {
    if (!selectedClass || !selectedSubject) return [];
    const found = mapping.find(
      (item) => item['শ্রেণি'] === selectedClass && getSubject(item) === selectedSubject
    );
    return Object.keys(found?.['অধ্যায়'] || found?.['অধ্যায়'] || {});
  }, [mapping, selectedClass, selectedSubject]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTopic('');
    if (!selectedClass || !selectedSubject || !selectedChapter) {
      setCqData([]);
      setLoading(false);
      return undefined;
    }

    const found = mapping.find(
      (item) => item['শ্রেণি'] === selectedClass && getSubject(item) === selectedSubject
    );
    const chapterMapping = found?.['অধ্যায়'] || found?.['অধ্যায়'] || {};
    const url = chapterMapping[selectedChapter];
    if (!url) {
      setCqData([]);
      setLoading(false);
      setError('এই অধ্যায়ের জন্য প্রশ্ন পাওয়া যায়নি।');
      return undefined;
    }

    const controller = new AbortController();
    const fetchChapter = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`CQ request failed (${response.status})`);
        const data = await response.json();
        setCqData(Array.isArray(data) ? data : [data]);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        console.error('Loading creative questions failed:', requestError);
        setError('CQ: ' + (requestError.message || 'Unknown error'));
        setCqData([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchChapter();
    return () => controller.abort();
  }, [mapping, selectedClass, selectedSubject, selectedChapter]);

  const boards = useMemo(
    () => Array.from(new Set(cqData.map((item) => item.source).filter(Boolean))),
    [cqData]
  );
  const topics = useMemo(() => {
    if (!selectedChapter || !cognitiveType) return [];
    const expectedType = COGNITIVE_MAP[cognitiveType];
    return Array.from(new Set(cqData.flatMap((item) => (
      Array.isArray(item.প্রশ্নাবলী)
        ? item.প্রশ্নাবলী
          .filter((question) => question.chapter === selectedChapter && question.ধরন === expectedType)
          .map((question) => question.topic)
          .filter(Boolean)
        : []
    ))));
  }, [cqData, selectedChapter, cognitiveType]);

  const filteredCards = useMemo(() => {
    const filtered = cqData.filter((item) => !source || item.source === source);
    const sorted = [...filtered].sort((a, b) => {
      const yearDifference = extractYear(b) - extractYear(a);
      if (yearDifference !== 0) return yearDifference;
      const boardA = BOARD_PRIORITY.indexOf(extractBoard(a));
      const boardB = BOARD_PRIORITY.indexOf(extractBoard(b));
      const orderA = boardA === -1 ? BOARD_PRIORITY.length : boardA;
      const orderB = boardB === -1 ? BOARD_PRIORITY.length : boardB;
      return orderA - orderB;
    });

    return sorted.map((item) => {
      const questions = Array.isArray(item.প্রশ্নাবলী) ? item.প্রশ্নাবলী : [];
      let filteredQuestions = cognitiveType
        ? questions.filter((question) => (
          question.chapter === selectedChapter && question.ধরন === COGNITIVE_MAP[cognitiveType]
        ))
        : questions;
      if (cognitiveType && selectedTopic) {
        filteredQuestions = filteredQuestions.filter((question) => question.topic === selectedTopic);
      }
      return filteredQuestions.length ? { ...item, প্রশ্নাবলী: filteredQuestions } : null;
    }).filter(Boolean);
  }, [cqData, source, cognitiveType, selectedChapter, selectedTopic]);

  const totalPages = Math.ceil(filteredCards.length / PAGE_SIZE);
  const paginatedCards = useMemo(
    () => filteredCards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredCards, currentPage]
  );
  const contextText = [selectedClass, selectedSubject, selectedChapter].filter(Boolean).join(' / ');
  const activeFilterCount = [
    cognitiveType,
    selectedTopic,
    source,
    viewType !== 'all' ? 'question' : '',
  ].filter(Boolean).length;

  return (
    <MathJaxContext config={{
      loader: { load: ['input/tex', 'output/chtml'] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
    }}>
      <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="mb-4">
            <h1 className="ios-title mb-1">প্রশ্ন ব্যাংক</h1>
            <p className="ios-caption">{contextText || 'শ্রেণি বাছাই করুন'}</p>
          </div>

          <div className="ios-card p-3 mb-3">
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedSubject('');
                  setSelectedChapter('');
                  setCqData([]);
                  setCurrentPage(1);
                }}
                className="ios-input appearance-none text-[15px]"
                aria-label="শ্রেণি"
              >
                <option value="">শ্রেণি</option>
                {classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
              <select
                value={selectedSubject}
                onChange={(event) => {
                  setSelectedSubject(event.target.value);
                  setSelectedChapter('');
                  setCqData([]);
                  setCurrentPage(1);
                }}
                disabled={!selectedClass}
                className="ios-input appearance-none text-[15px] disabled:opacity-50"
                aria-label="বিষয়"
              >
                <option value="">বিষয়</option>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <select
                value={selectedChapter}
                onChange={(event) => {
                  setSelectedChapter(event.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedSubject}
                className="ios-input appearance-none text-[15px] disabled:opacity-50 col-span-2"
                aria-label="অধ্যায়"
              >
                <option value="">অধ্যায়</option>
                {chapters.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}
              </select>
            </div>

            {selectedChapter && (
              <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-1">
                <FilterChip
                  active={!cognitiveType}
                  onClick={() => {
                    setCognitiveType('');
                    setSelectedTopic('');
                    setCurrentPage(1);
                  }}
                >
                  সব
                </FilterChip>
                {COGNITIVE_TYPES.map((type) => (
                  <FilterChip
                    key={type}
                    active={cognitiveType === type}
                    onClick={() => {
                      setCognitiveType(type);
                      setSelectedTopic('');
                      setCurrentPage(1);
                    }}
                  >
                    {type}
                  </FilterChip>
                ))}
              </div>
            )}

            {selectedChapter && (
              <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                className="mt-3 w-full py-2 rounded-xl bg-base-200 text-base-content/70 text-[13px] font-semibold ios-pressable flex items-center justify-center gap-1.5"
              >
                ⚙️ ফিল্টার
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {mappingLoading && <div className="flex justify-center py-6"><IOSSpinner /></div>}
          {loading && <div className="flex justify-center py-10"><IOSSpinner size="lg" /></div>}
          {error && <div role="alert" className="ios-card p-4 text-center text-error text-sm">{error}</div>}

          {!mappingLoading && !loading && !error && !selectedClass && (
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
          {!loading && !error && selectedSubject && !selectedChapter && (
            <div className="ios-card p-8 text-center">
              <div className="text-4xl mb-2">🔖</div>
              <p className="ios-subhead">অধ্যায় বাছাই করুন</p>
            </div>
          )}

          {selectedChapter && !loading && !error && (
            <>
              {filteredCards.length > 0 && (
                <p className="text-xs text-base-content/50 mb-2 px-1">মোট: {bn(filteredCards.length)} টি</p>
              )}
              {paginatedCards.length === 0 ? (
                <div className="ios-card p-6 text-center text-base-content/50 text-sm">কোনো কার্ড পাওয়া যায়নি</div>
              ) : paginatedCards.map((item, index) => {
                const globalIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                const cardData = { ...item, index: globalIndex };
                const showUddipak = !cognitiveType || !['জ্ঞানমূলক', 'অনুধাবন'].includes(cognitiveType);
                const showSource = ['জ্ঞানমূলক', 'অনুধাবন'].includes(cognitiveType);
                return (
                  <div key={item.id || `${item.source}-${globalIndex}`}>
                    {viewType === 'all'
                      ? <CQWithAnswer data={cardData} showUddipak={showUddipak} showSource={showSource} />
                      : <CQCard data={cardData} showUddipak={showUddipak} showSource={showSource} />}
                  </div>
                );
              })}

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
            </>
          )}
        </div>

        <IOSSheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title="ফিল্টার">
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">View Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'all', label: 'প্রশ্ন ও উত্তর' },
                  { value: 'question', label: 'শুধু প্রশ্ন' },
                ].map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => {
                      setViewType(option.value);
                      setCurrentPage(1);
                    }}
                    aria-pressed={viewType === option.value}
                    className={`py-2.5 rounded-xl text-sm font-semibold ios-pressable transition-all ${
                      viewType === option.value ? 'bg-primary text-white' : 'bg-base-200 text-base-content/70'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {boards.length > 0 && (
              <div>
                <label htmlFor="cq-source" className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">
                  সোর্স
                </label>
                <select
                  id="cq-source"
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="ios-input appearance-none"
                >
                  <option value="">সব</option>
                  {boards.map((board) => <option key={board} value={board}>{board}</option>)}
                </select>
              </div>
            )}

            {topics.length > 0 && (
              <div>
                <label htmlFor="cq-topic" className="text-xs font-semibold text-base-content/60 uppercase mb-2 block">
                  টপিক
                </label>
                <select
                  id="cq-topic"
                  value={selectedTopic}
                  onChange={(event) => {
                    setSelectedTopic(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="ios-input appearance-none"
                >
                  <option value="">সব</option>
                  {topics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                </select>
              </div>
            )}

            <IOSButton onClick={() => setFilterSheetOpen(false)} fullWidth size="lg">
              Apply
            </IOSButton>
          </div>
        </IOSSheet>
      </div>
    </MathJaxContext>
  );
}
