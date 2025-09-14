
import React, { useEffect, useState } from "react";
import { MathJaxContext } from 'better-react-mathjax';
import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';

// KaTeXRenderer: renders $...$ and $$...$$ blocks using KaTeX
function KaTeXRenderer({ html }) {
  // Split by block math ($$...$$) and inline math ($...$)
  // This is a simple parser, not perfect for all edge cases
  if (!html) return null;
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  const inlineRegex = /\$([^$\n]+?)\$/g;
  let parts = [];
  let lastIndex = 0;
  let match;
  // Helper to split by <br> and add margin
  function splitWithBr(str, keyPrefix = '') {
    const segments = str.split(/<br\s*\/?>(?![^<]*>)/i);
    const out = [];
    segments.forEach((seg, i) => {
      if (i > 0) {
        out.push(<br key={keyPrefix + 'br' + i} className="katex-linebreak" />);
      }
      if (seg) out.push(seg);
    });
    return out;
  }
  // First, handle block math
  let blockMatches = [];
  while ((match = blockRegex.exec(html)) !== null) {
    blockMatches.push({ start: match.index, end: blockRegex.lastIndex, content: match[1] });
  }
  if (blockMatches.length === 0) {
    // No block math, just handle inline
    let idx = 0;
    let text = html;
    let m;
    while ((m = inlineRegex.exec(text)) !== null) {
      if (m.index > idx) {
        parts.push(...splitWithBr(text.slice(idx, m.index), 'inline'+m.index));
      }
      parts.push(<InlineMath key={m.index}>{m[1]}</InlineMath>);
      idx = inlineRegex.lastIndex;
    }
    if (idx < text.length) {
      parts.push(...splitWithBr(text.slice(idx), 'inlineEnd'));
    }
    return <span>{parts}</span>;
  } else {
    // There is block math, split accordingly
    let idx = 0;
    for (let i = 0; i < blockMatches.length; i++) {
      const { start, end, content } = blockMatches[i];
      if (start > idx) {
        // Handle inline math in the non-math region
        let text = html.slice(idx, start);
        let m;
        let last = 0;
        while ((m = inlineRegex.exec(text)) !== null) {
          if (m.index > last) {
            parts.push(...splitWithBr(text.slice(last, m.index), 'block'+start+'-'+m.index));
          }
          parts.push(<InlineMath key={start + m.index}>{m[1]}</InlineMath>);
          last = inlineRegex.lastIndex;
        }
        if (last < text.length) {
          parts.push(...splitWithBr(text.slice(last), 'blockEnd'+start));
        }
      }
      parts.push(<BlockMath key={start}>{content}</BlockMath>);
      idx = end;
    }
    if (idx < html.length) {
      // Handle inline math in the trailing region
      let text = html.slice(idx);
      let m;
      let last = 0;
      while ((m = inlineRegex.exec(text)) !== null) {
        if (m.index > last) {
          parts.push(...splitWithBr(text.slice(last, m.index), 'trail'+idx+'-'+m.index));
        }
        parts.push(<InlineMath key={idx + m.index}>{m[1]}</InlineMath>);
        last = inlineRegex.lastIndex;
      }
      if (last < text.length) {
        parts.push(...splitWithBr(text.slice(last), 'trailEnd'+idx));
      }
    }
    return <span>{parts}</span>;
  }
}

const BOOK_MAPPING_URL =
  "https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json";


function BookContentPage() {
  const [mapping, setMapping] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [chapterUrl, setChapterUrl] = useState("");
  const [chapterHtml, setChapterHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [divBlocks, setDivBlocks] = useState([]); // For pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(BOOK_MAPPING_URL)
      .then((res) => res.json())
      .then((data) => setMapping(Array.isArray(data) ? data : []))
      .catch((err) => setError('Mapping fetch error: ' + (err?.message || 'Unknown error')))
      .finally(() => setLoading(false));
    // Removed forced theme set to allow global/user theme persistence
  }, []);

  const subjects = selectedClass
    ? mapping.filter(m => m['শ্রেণি'] === selectedClass).map(m => m['বিষয়'])
    : [];
  const chapters = (selectedClass && selectedSubject)
    ? Object.keys((mapping.find(m => m['শ্রেণি'] === selectedClass && m['বিষয়'] === selectedSubject)?.['অধ্যায়'] || {}))
    : [];

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedChapter) {
      const url = mapping.find(m => m['শ্রেণি'] === selectedClass && m['বিষয়'] === selectedSubject)?.['অধ্যায়']?.[selectedChapter];
      if (url) {
        setChapterUrl(url);
        setLoading(true);
        setError(null);
        fetch(url)
          .then(res => res.text())
          .then(html => {
            // Remove HTML comments before rendering
            let cleanedHtml = html.replace(/<!--([\s\S]*?)-->/g, '');
            // Map Bootstrap classes to Tailwind/DaisyUI equivalents (more robust)
            cleanedHtml = cleanedHtml
              .replace(/class="card-body[^"]*"/g, 'class="bg-base-100 rounded-box p-5 sm:p-8 mb-6"')
              .replace(/class="row"/g, 'class="flex flex-wrap -mx-2"')
              .replace(/class="col-md-12"/g, 'class="w-full px-2"')
              .replace(/class="fs-5[^"]*"/g, 'class="text-lg"')
              .replace(/class="description-div[^"]*"/g, 'class="mb-9"');
            // Add Tailwind classes to headings and paragraphs
            cleanedHtml = cleanedHtml
              .replace(/<h1(.*?)>([\s\S]*?)<\/h1>/g, '<h1$1 class="text-3xl font-extrabold text-primary underline underline-offset-4 mb-4 mt-8" >$2</h1>')
              .replace(/<h2(.*?)>([\s\S]*?)<\/h2>/g, '<h2$1 class="text-2xl font-bold text-red-400 underline underline-offset-4 mb-3 mt-6" >$2</h2>')
              .replace(/<h3(.*?)>([\s\S]*?)<\/h3>/g, '<h3$1 class="text-xl font-bold text-blue-600 underline underline-offset-4 mb-2 mt-4" >$2</h3>')
              .replace(/<h4(.*?)>([\s\S]*?)<\/h4>/g, '<h4$1 class="text-lg font-semibold text-blue-500 underline underline-offset-4 mb-2 mt-3" >$2</h4>')
              .replace(/<h5(.*?)>([\s\S]*?)<\/h5>/g, '<h5$1 class="text-base font-semibold text-blue-400 underline underline-offset-4 mb-1 mt-2" >$2</h5>')
              .replace(/<h6(.*?)>([\s\S]*?)<\/h6>/g, '<h6$1 class="text-sm font-semibold text-blue-300 underline underline-offset-4 mb-1 mt-1" >$2</h6>')
              .replace(/<p(.*?)>([\s\S]*?)<\/p>/g, '<p$1 class="text-base text-gray-800 dark:text-gray-200 mb-3" >$2</p>');
            setChapterHtml(cleanedHtml);
            // Split by top-level <div ...>...</div> blocks for pagination
            // Only split if there are multiple top-level divs, else fallback to whole content
            let divMatches = [];
            const divRegex = /<div[^>]*>[\s\S]*?<\/div>/gi;
            let match;
            while ((match = divRegex.exec(cleanedHtml)) !== null) {
              divMatches.push(match[0]);
            }
            if (divMatches.length > 0) {
              setDivBlocks(divMatches);
            } else {
              setDivBlocks([cleanedHtml]);
            }
            setCurrentPage(1);
            setLoading(false);
          })
          .catch(err => {
            setError('Content fetch error: ' + (err?.message || 'Unknown error'));
            setChapterHtml("");
            setLoading(false);
          });
      } else {
        setChapterHtml("");
        setChapterUrl("");
      }
    } else {
      setChapterHtml("");
      setChapterUrl("");
    }
  }, [selectedClass, selectedSubject, selectedChapter, mapping]);

  let headingText = 'বইয়ের অধ্যায়সমূহ';
  if (!selectedClass) {
    headingText = 'শ্রেণি বাছাই করুন';
  } else if (!selectedSubject) {
    headingText = 'বিষয় বাছাই করুন';
  } else if (!selectedChapter) {
    headingText = 'অধ্যায় বাছাই করুন';
  }
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
          {headingText}
          {contextText && (
            <span className="ml-2 text-lg font-semibold text-blue-700">[{contextText}]</span>
          )}
        </h1>
        <div className="flex flex-wrap gap-4 mb-6">
          <select className="select select-bordered" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); setChapterHtml(''); }}>
            <option value="">শ্রেণি</option>
            {Array.from(new Set(mapping.map(m => m['শ্রেণি']))).map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
          </select>
          {selectedClass && (
            <select className="select select-bordered" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); setChapterHtml(''); }}>
              <option value="">বিষয়</option>
              {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
            </select>
          )}
          {selectedClass && selectedSubject && (
            <select className="select select-bordered" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)}>
              <option value="">অধ্যায়</option>
              {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
            </select>
          )}
        </div>
        {loading && <div className="text-center py-8">লোড হচ্ছে...</div>}
        {error && <div className="text-center py-8 text-error">{error}</div>}
        {/* Step 1: Class/Subject/Chapter select only, then content render */}
        {!selectedClass && !loading && !error && (
          <div className="text-center py-8">শ্রেণি বাছাই করুন</div>
        )}
        {selectedClass && !selectedSubject && !loading && !error && (
          <div className="text-center py-8">বিষয় বাছাই করুন</div>
        )}
        {selectedClass && selectedSubject && !selectedChapter && !loading && !error && (
          <div className="text-center py-8">অধ্যায় বাছাই করুন</div>
        )}
        {/* Step 2: Show content for selected chapter */}

        {selectedClass && selectedSubject && selectedChapter && !loading && !error && (
          <div className="bg-white dark:bg-base-200 rounded shadow p-2 sm:p-6 min-h-[400px] overflow-x-hidden">
            {divBlocks.length > 0 ? (
              <>
                <div
                  className="prose prose-lg max-w-none text-base-content"
                  style={{
                    fontFamily: 'Hind Siliguri, sans-serif',
                    color: 'inherit',
                    wordBreak: 'break-word',
                    overflowX: 'hidden',
                  }}
                >
                  <style>{`
                    .katex-linebreak {
                      display: block;
                      margin-bottom: 1.25em;
                    }
                    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
                      text-decoration: underline;
                      text-underline-offset: 6px;
                    }
                    .prose h1, .prose h2 {
                      text-align: center;
                    }
                    .prose h1, .prose h2 {
                      color: #fb7185 !important; /* Tailwind red-400 */
                    }
                    .prose, .prose p, .prose span, .prose div, .prose li, .prose td, .prose th {
                      color: var(--fallback-bc, var(--b1));
                    }
                    .prose p, .prose ul, .prose ol, .prose li {
                      margin-bottom: 1.1em;
                    }
                    .prose br {
                      display: block;
                      margin-bottom: 1.25em;
                    }
                    .prose td br, .prose th br {
                      display: block;
                      margin-bottom: 1.25em !important;
                    }
                    .dark .prose, .dark .prose p, .dark .prose span, .dark .prose div, .dark .prose li, .dark .prose td, .dark .prose th {
                      color: var(--fallback-bc, var(--bc));
                    }
                    .dark .prose h1, .dark .prose h3, .dark .prose h4, .dark .prose h5, .dark .prose h6 {
                      color: #fff !important;
                    }
                    .dark .prose h1, .dark .prose h2 {
                      color: #fb7185 !important;
                    }
                  `}</style>
                  {/* Render as Markdown with math/KaTeX support */}
                  <ReactMarkdown
                    children={divBlocks[currentPage - 1]}
                    remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                    rehypePlugins={[rehypeKatex]}
                  />
                </div>
                {/* Pagination controls below content */}
                {divBlocks.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-8 px-1 items-center">
                    <button className="btn btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>← আগের</button>
                    {(() => {
                      const totalPages = divBlocks.length;
                      const pageButtons = [];
                      // Always show first page
                      if (currentPage > 2) {
                        pageButtons.push(
                          <button key={1} className={`btn btn-xs ${currentPage === 1 ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(1)}>1</button>
                        );
                        if (currentPage > 3) {
                          pageButtons.push(<span key="start-ellipsis" className="px-1">...</span>);
                        }
                      }
                      // Show previous page if not first
                      if (currentPage - 1 > 1) {
                        pageButtons.push(
                          <button key={currentPage - 1} className="btn btn-xs" onClick={() => setCurrentPage(currentPage - 1)}>{currentPage - 1}</button>
                        );
                      }
                      // Show current page
                      pageButtons.push(
                        <button key={currentPage} className={`btn btn-xs btn-primary`}>{currentPage}</button>
                      );
                      // Show next page if not last
                      if (currentPage + 1 < totalPages) {
                        pageButtons.push(
                          <button key={currentPage + 1} className="btn btn-xs" onClick={() => setCurrentPage(currentPage + 1)}>{currentPage + 1}</button>
                        );
                      }
                      // Always show last page
                      if (currentPage < totalPages - 1) {
                        if (currentPage < totalPages - 2) {
                          pageButtons.push(<span key="end-ellipsis" className="px-1">...</span>);
                        }
                        pageButtons.push(
                          <button key={totalPages} className={`btn btn-xs ${currentPage === totalPages ? 'btn-primary' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                        );
                      }
                      return pageButtons;
                    })()}
                    <button className="btn btn-sm" disabled={currentPage === divBlocks.length} onClick={() => setCurrentPage(p => Math.min(divBlocks.length, p + 1))}>পরের →</button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">কোনো কন্টেন্ট পাওয়া যায়নি।</div>
            )}
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}

export default BookContentPage;
