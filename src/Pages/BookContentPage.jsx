import { useEffect, useMemo, useState } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import IOSCard from '../Components/ios/iOSCard';
import IOSSpinner from '../Components/ios/iOSSpinner';

const BOOK_MAPPING_URL =
  'https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json';

const bn = (number) => String(number).split('').map((digit) => '০১২৩৪৫৬৭৮৯'[digit] ?? digit).join('');

function cleanChapterHtml(html) {
  let cleaned = html.replace(/<!--([\s\S]*?)-->/g, '');
  cleaned = cleaned
    .replace(/class="card-body[^"]*"/g, 'class="bg-base-100 rounded-box p-5 sm:p-8 mb-6"')
    .replace(/class="row"/g, 'class="flex flex-wrap -mx-2"')
    .replace(/class="col-md-12"/g, 'class="w-full px-2"')
    .replace(/class="fs-5[^"]*"/g, 'class="text-lg"')
    .replace(/class="description-div[^"]*"/g, 'class="mb-9"');
  cleaned = cleaned
    .replace(/<h1(.*?)>([\s\S]*?)<\/h1>/g, '<h1$1 class="text-3xl font-extrabold text-primary underline underline-offset-4 mb-4 mt-8" >$2</h1>')
    .replace(/<h2(.*?)>([\s\S]*?)<\/h2>/g, '<h2$1 class="text-2xl font-bold text-red-400 underline underline-offset-4 mb-3 mt-6" >$2</h2>')
    .replace(/<h3(.*?)>([\s\S]*?)<\/h3>/g, '<h3$1 class="text-xl font-bold text-blue-600 underline underline-offset-4 mb-2 mt-4" >$2</h3>')
    .replace(/<h4(.*?)>([\s\S]*?)<\/h4>/g, '<h4$1 class="text-lg font-semibold text-blue-500 underline underline-offset-4 mb-2 mt-3" >$2</h4>')
    .replace(/<h5(.*?)>([\s\S]*?)<\/h5>/g, '<h5$1 class="text-base font-semibold text-blue-400 underline underline-offset-4 mb-1 mt-2" >$2</h5>')
    .replace(/<h6(.*?)>([\s\S]*?)<\/h6>/g, '<h6$1 class="text-sm font-semibold text-blue-300 underline underline-offset-4 mb-1 mt-1" >$2</h6>')
    .replace(/<p(.*?)>([\s\S]*?)<\/p>/g, '<p$1 class="text-base text-gray-800 dark:text-gray-200 mb-3" >$2</p>');
  return cleaned;
}

function splitIntoBlocks(cleanedHtml) {
  const matches = [];
  const regex = /<div[^>]*>[\s\S]*?<\/div>/gi;
  let match;
  while ((match = regex.exec(cleanedHtml)) !== null) matches.push(match[0]);
  return matches.length > 0 ? matches : [cleanedHtml];
}

function getSubject(item) {
  return item['বিষয়'] ?? item['বিষয়'];
}

function getChapters(item) {
  return item['অধ্যায়'] ?? item['অধ্যায়'] ?? {};
}

export default function BookContentPage() {
  const [mapping, setMapping] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [divBlocks, setDivBlocks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState(null);
  const loading = mappingLoading || chapterLoading;

  useEffect(() => {
    const controller = new AbortController();
    const fetchMapping = async () => {
      try {
        const response = await fetch(BOOK_MAPPING_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Mapping response is not a list');
        setMapping(data);
        setError(null);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          console.error('Book mapping fetch failed:', fetchError);
          setError(`Mapping: ${fetchError.message || 'Unknown error'}`);
        }
      } finally {
        if (!controller.signal.aborted) setMappingLoading(false);
      }
    };
    fetchMapping();
    return () => controller.abort();
  }, []);

  const classes = useMemo(
    () => Array.from(new Set(mapping.map((item) => item['শ্রেণি']).filter(Boolean))),
    [mapping],
  );
  const subjects = useMemo(
    () => (selectedClass
      ? mapping.filter((item) => item['শ্রেণি'] === selectedClass).map(getSubject).filter(Boolean)
      : []),
    [mapping, selectedClass],
  );
  const chapters = useMemo(() => {
    if (!selectedClass || !selectedSubject) return [];
    const found = mapping.find(
      (item) => item['শ্রেণি'] === selectedClass && getSubject(item) === selectedSubject,
    );
    return Object.keys(getChapters(found || {}));
  }, [mapping, selectedClass, selectedSubject]);

  useEffect(() => {
    if (!selectedClass || !selectedSubject || !selectedChapter) {
      setDivBlocks([]);
      setCurrentPage(1);
      setChapterLoading(false);
      return undefined;
    }

    const found = mapping.find(
      (item) => item['শ্রেণি'] === selectedClass && getSubject(item) === selectedSubject,
    );
    const url = getChapters(found || {})[selectedChapter];
    if (!url) {
      setDivBlocks([]);
      setCurrentPage(1);
      setChapterLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const fetchChapter = async () => {
      setChapterLoading(true);
      setError(null);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        if (controller.signal.aborted) return;
        setDivBlocks(splitIntoBlocks(cleanChapterHtml(html)));
        setCurrentPage(1);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          console.error('Book chapter fetch failed:', fetchError);
          setError(`Content: ${fetchError.message || 'Unknown error'}`);
          setDivBlocks([]);
        }
      } finally {
        if (!controller.signal.aborted) setChapterLoading(false);
      }
    };
    fetchChapter();
    return () => controller.abort();
  }, [selectedClass, selectedSubject, selectedChapter, mapping]);

  const contextText = useMemo(() => {
    let text = selectedClass;
    if (selectedSubject) text += ` / ${selectedSubject}`;
    if (selectedChapter) text += ` / ${selectedChapter}`;
    return text;
  }, [selectedClass, selectedSubject, selectedChapter]);
  const totalPages = divBlocks.length;

  return (
    <MathJaxContext
      config={{
        loader: { load: ['input/tex', 'output/chtml'] },
        tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      }}
    >
      <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="mb-4">
            <h1 className="ios-title mb-1">পাঠ্যবই</h1>
            <p className="ios-caption">{contextText || 'শ্রেণি বাছাই করুন'}</p>
          </div>

          <IOSCard className="mb-3 p-3">
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={selectedClass}
                onChange={(event) => {
                  setSelectedClass(event.target.value);
                  setSelectedSubject('');
                  setSelectedChapter('');
                  setDivBlocks([]);
                  setCurrentPage(1);
                }}
                className="ios-input appearance-none text-[15px]"
                aria-label="শ্রেণি নির্বাচন করুন"
              >
                <option value="">শ্রেণি</option>
                {classes.map((className) => <option key={className} value={className}>{className}</option>)}
              </select>
              <select
                value={selectedSubject}
                onChange={(event) => {
                  setSelectedSubject(event.target.value);
                  setSelectedChapter('');
                  setDivBlocks([]);
                  setCurrentPage(1);
                }}
                disabled={!selectedClass}
                className="ios-input appearance-none text-[15px] disabled:opacity-50"
                aria-label="বিষয় নির্বাচন করুন"
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
                className="ios-input col-span-2 appearance-none text-[15px] disabled:opacity-50"
                aria-label="অধ্যায় নির্বাচন করুন"
              >
                <option value="">অধ্যায়</option>
                {chapters.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}
              </select>
            </div>
          </IOSCard>

          {loading && <div className="flex justify-center py-10"><IOSSpinner size="lg" /></div>}
          {error && <IOSCard className="p-4 text-center text-sm text-error" role="alert">{error}</IOSCard>}

          {!loading && !error && !selectedClass && (
            <IOSCard className="p-8 text-center">
              <div className="mb-2 text-4xl" aria-hidden="true">📚</div>
              <p className="ios-subhead">শ্রেণি বাছাই করুন</p>
            </IOSCard>
          )}
          {!loading && !error && selectedClass && !selectedSubject && (
            <IOSCard className="p-8 text-center">
              <div className="mb-2 text-4xl" aria-hidden="true">📖</div>
              <p className="ios-subhead">বিষয় বাছাই করুন</p>
            </IOSCard>
          )}
          {!loading && !error && selectedSubject && !selectedChapter && (
            <IOSCard className="p-8 text-center">
              <div className="mb-2 text-4xl" aria-hidden="true">🔖</div>
              <p className="ios-subhead">অধ্যায় বাছাই করুন</p>
            </IOSCard>
          )}

          {!loading && !error && selectedChapter && divBlocks.length > 0 && (
            <IOSCard className="ios-fade p-4 sm:p-5">
              <div
                className="prose prose-lg max-w-none text-base-content"
                style={{ wordBreak: 'break-word', overflowX: 'hidden' }}
              >
                <style>{`
                  .katex-linebreak { display: block; margin-bottom: 1.25em; }
                  .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                    text-decoration: underline; text-underline-offset: 6px;
                  }
                  .prose h1, .prose h2 { text-align: center; color: #fb7185 !important; }
                  .prose, .prose p, .prose span, .prose div, .prose li, .prose td, .prose th {
                    color: var(--fallback-bc, var(--b1));
                  }
                  .prose p, .prose ul, .prose ol, .prose li { margin-bottom: 1.1em; }
                  .prose br { display: block; margin-bottom: 1.25em; }
                  .prose td br, .prose th br { display: block; margin-bottom: 1.25em !important; }
                  .dark .prose, .dark .prose p, .dark .prose span, .dark .prose div,
                  .dark .prose li, .dark .prose td, .dark .prose th {
                    color: var(--fallback-bc, var(--bc));
                  }
                  .dark .prose h1, .dark .prose h2 { color: #fb7185 !important; }
                  .dark .prose h3, .dark .prose h4, .dark .prose h5, .dark .prose h6 {
                    color: #fff !important;
                  }
                `}</style>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {divBlocks[currentPage - 1]}
                </ReactMarkdown>
              </div>

              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-base-content/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="ios-pressable h-9 w-9 rounded-xl bg-base-200 text-sm font-semibold disabled:opacity-30"
                    aria-label="আগের পৃষ্ঠা"
                  >
                    ←
                  </button>
                  <span className="rounded-xl bg-primary px-3 py-1.5 text-sm font-bold text-white" aria-live="polite">
                    {bn(currentPage)} / {bn(totalPages)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="ios-pressable h-9 w-9 rounded-xl bg-base-200 text-sm font-semibold disabled:opacity-30"
                    aria-label="পরের পৃষ্ঠা"
                  >
                    →
                  </button>
                </div>
              )}
            </IOSCard>
          )}

          {!loading && !error && selectedChapter && divBlocks.length === 0 && (
            <IOSCard className="p-8 text-center">
              <div className="mb-2 text-4xl" aria-hidden="true">📄</div>
              <p className="ios-subhead">কোনো কন্টেন্ট পাওয়া যায়নি</p>
            </IOSCard>
          )}
        </div>
      </div>
    </MathJaxContext>
  );
}
