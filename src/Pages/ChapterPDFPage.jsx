import React, { useState, useRef, useEffect } from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import mappingData from '../Components/Mapping/Mapping.json';


const API_BASE = 'https://geminiai-render.onrender.com/api/nctb-questions/board-questions';

function getBengaliNum(num) {
    return String(num).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');
}

function ChapterPDFPage() {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');
    const [topicData, setTopicData] = useState(null);
    const [loading, setLoading] = useState(false);
    const contentRef = useRef(null);
    const [watermarkSrc, setWatermarkSrc] = useState(null);

    // Generate transparent watermark image (bakes opacity into image data)
    // This bypasses browser "Background graphics" restriction
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.globalAlpha = 0.06;
            ctx.drawImage(img, 0, 0);
            setWatermarkSrc(canvas.toDataURL('image/png'));
        };
        img.src = '/HMT Logo.png';
    }, []);

    // Derived
    const classes = Array.from(new Set(mappingData.map(m => m.class)));
    const subjectsForClass = selectedClass ? mappingData.filter(m => m.class === selectedClass) : [];
    const selectedSubjectObj = subjectsForClass.find(m => m.subject.code === selectedSubject);
    const chapters = selectedSubjectObj ? selectedSubjectObj.chapters : [];
    const qtypeCode = selectedSubjectObj?.qtypes?.[0]?.code || 'BCQ';
    const chObj = chapters.find(c => c.id === parseInt(selectedChapter));

    // MathJax render helper
    const renderText = (text) => {
        if (!text) return null;
        const normalized = text.replace(/\\n(?![a-zA-Z])/g, '\n');
        const parts = normalized.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);
        return (
            <span>
                {parts.map((part, i) => {
                    if (/^\$\$[\s\S]+?\$\$$/.test(part)) {
                        return (
                            <div key={i} style={{ overflowX: 'auto', margin: '4px 0', maxWidth: '100%' }}>
                                <MathJax dynamic style={{ fontSize: '0.85em' }}>{part}</MathJax>
                            </div>
                        );
                    }
                    if (/^\$[^$]+\$$/.test(part)) {
                        return <span key={i} style={{ display: 'inline' }}><MathJax inline dynamic>{part}</MathJax></span>;
                    }
                    const lines = part.split(/\r?\n/);
                    return lines.map((line, idx) => (
                        <span key={`${i}-${idx}`}>{line}{idx < lines.length - 1 ? <br /> : null}</span>
                    ));
                })}
            </span>
        );
    };

    // ========== Fetch & organize data ==========
    const fetchData = async () => {
        if (!selectedClass || !selectedSubject || !selectedChapter) return;
        setLoading(true);
        setTopicData(null);
        try {
            const fetchFilter = async (filter, retries = 3) => {
                for (let attempt = 0; attempt < retries; attempt++) {
                    try {
                        const params = new URLSearchParams({
                            class: selectedClass, subject: selectedSubject,
                            qtype: qtypeCode, chapter: selectedChapter, filter,
                        });
                        const res = await fetch(`${API_BASE}?${params}`);
                        if (!res.ok) throw new Error('ডাটা লোড ব্যর্থ');
                        const data = await res.json();
                        const results = data.results || [];
                        // Verify: if count is higher than results, retry
                        if (data.count && results.length < data.count && attempt < retries - 1) {
                            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                            continue;
                        }
                        return results;
                    } catch (err) {
                        if (attempt === retries - 1) throw err;
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    }
                }
                return [];
            };

            const [kaResults, khaResults, cqResults] = await Promise.all([
                fetchFilter('ka'), fetchFilter('kha'), fetchFilter('cq'),
            ]);

            const topicMap = new Map();
            const ensure = (name, code) => {
                if (!topicMap.has(name)) topicMap.set(name, { code: code || '', name, ka: [], kha: [], cqGroups: [] });
                return topicMap.get(name);
            };

            // Helper to handle duplicates
            const processAndPush = (list, item) => {
                const sq = item.sub_question;
                if (!sq) return;
                const qText = (sq.question_text || '').trim();
                const existing = list.find(bg => (bg.sub_question.question_text || '').trim() === qText);
                if (existing) {
                    if (!existing.sources) existing.sources = [existing.source];
                    if (!existing.sources.includes(item.source)) existing.sources.push(item.source);
                    // Keep the latest year's sorting priority if needed, or just append
                } else {
                    item.sources = [item.source];
                    list.push(item);
                }
            };

            kaResults.forEach(item => {
                const sq = item.sub_question;
                if (sq) processAndPush(ensure(sq.topic_name || 'অন্যান্য', sq.topic_code).ka, item);
            });
            khaResults.forEach(item => {
                const sq = item.sub_question;
                if (sq) processAndPush(ensure(sq.topic_name || 'অন্যান্য', sq.topic_code).kha, item);
            });

            const chNum = parseInt(selectedChapter);
            cqResults.forEach(item => {
                const sqs = item.sub_questions || [];
                const ga = sqs.find(sq => sq.label === 'গ' && sq.chapter_no === chNum);
                const gha = sqs.find(sq => sq.label === 'ঘ' && sq.chapter_no === chNum);
                if (!ga && !gha) return;
                const cqEntry = { stem: item.stem, source: item.source, question_no: item.question_no };

                if (ga && gha && ga.topic_name === gha.topic_name) {
                    ensure(ga.topic_name || 'অন্যান্য', ga.topic_code).cqGroups.push({ ...cqEntry, subQuestions: [ga, gha] });
                } else {
                    if (ga) ensure(ga.topic_name || 'অন্যান্য', ga.topic_code).cqGroups.push({ ...cqEntry, subQuestions: [ga] });
                    if (gha) ensure(gha.topic_name || 'অন্যান্য', gha.topic_code).cqGroups.push({ ...cqEntry, subQuestions: [gha] });
                }
            });

            const sorted = Array.from(topicMap.values()).sort((a, b) => {
                const cA = (a.code || '').match(/T-(\d+)/i);
                const cB = (b.code || '').match(/T-(\d+)/i);
                if (cA && cB) return parseInt(cA[1]) - parseInt(cB[1]);
                return a.name.localeCompare(b.name, 'bn');
            });

            // Sort CQ groups by Year (Descending)
            sorted.forEach(topic => {
                topic.cqGroups.sort((a, b) => {
                    const getYear = (str) => {
                        if (!str) return 0;
                        // Try English digits
                        let match = str.match(/[0-9]{4}/);
                        if (match) return parseInt(match[0]);

                        // Try Bengali digits
                        match = str.match(/[০-৯]{4}/);
                        if (match) {
                            const benToEng = d => '0123456789'['০১২৩৪৫৬৭৮৯'.indexOf(d)];
                            return parseInt(match[0].split('').map(benToEng).join(''));
                        }
                        return 0;
                    };
                    return getYear(b.source) - getYear(a.source);
                });
            });

            setTopicData(sorted);
        } catch (err) {
            console.error(err);
            alert('ডাটা লোড করতে সমস্যা হয়েছে।');
        } finally {
            setLoading(false);
        }
    };

    // ========== Generate PDF (print current page) ==========
    const generatePDF = () => {
        window.print();
    };

    // ========== Inline styles for PDF content ==========
    const S = {
        categoryBox: (color) => ({
            display: 'inline-block', padding: '8px 32px', borderRadius: '8px',
            backgroundColor: color, color: '#fff', fontWeight: 700, fontSize: '15px',
        }),
        questionItem: (color) => ({
            marginBottom: '10px', paddingLeft: '10px', borderLeft: `3px solid ${color}`, paddingBottom: '6px',
            pageBreakInside: 'avoid', breakInside: 'avoid',
        }),
        answerLine: {
            marginTop: '4px', fontSize: '13px', color: '#16a34a', paddingLeft: '16px',
        },
        metaBadge: { fontSize: '11px', color: '#94a3b8', marginLeft: '6px' },
        watermark: {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', opacity: 0.04, pointerEvents: 'none', zIndex: 0,
        },
    };

    // ========== JSX ==========
    return (
        <MathJaxContext
            config={{
                loader: { load: ['input/tex', 'output/svg', '[tex]/ams', '[tex]/newcommand'] },
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']],
                    packages: { '[+]': ['ams', 'newcommand'] },
                },
                svg: { fontCache: 'local' },
            }}
        >
            <style>{`
        mjx-container mjx-utext, mjx-container mjx-mtext,
        .MathJax mjx-utext, .MathJax mjx-mtext {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif !important;
        }

        @media print {
          /* Zero margin for absolute control */
          @page { size: A4; margin: 0; } 
          
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Hide navbar, filters, stats, buttons */
          nav, .navbar, .no-print, .pt-16 > *:not(.pdf-page-root) { display: none !important; }
          .no-print { display: none !important; }

          /* Show only PDF content */
          .pdf-page-root { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .pdf-print-area {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .pdf-print-area > div {
            width: 100% !important;
            padding: 0 !important;
          }

          /* Fixed watermark for every page */
          .print-watermark-fixed {
            display: block !important;
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 9999 !important;
            width: 450px !important;
            opacity: 1 !important; /* Opacity baked into image via canvas */
            pointer-events: none !important;
          }
        }

        /* Hide watermark on screen */
        .print-watermark-fixed { display: none; }

        /* Print Header/Footer (Hidden on screen, Visible on print) */
        .print-header, .print-footer { display: none; }

        @media print {
            .print-header {
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                top: 10px;
                left: 20px;
                right: 20px;
                height: 40px;
                margin-top: 0; 
                padding: 0 10px;
                border-bottom: 2px solid #334155;
                background-color: #fff;
                z-index: 10000;
                padding-bottom: 2px;
            }
            .print-footer {
                display: flex !important;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                bottom: 10px;
                left: 20px;
                right: 20px;
                height: 30px;
                margin-bottom: 0;
                padding: 0 10px;
                border-top: 2px solid #334155;
                background-color: #fff;
                z-index: 10000;
                padding-top: 2px;
            }
            .page-number::after {
                content: counter(page);
            }
            
            /* Add padding to content (The "Real" Margins) - REMOVED for Table Strategy */
            .pdf-print-area {
                padding: 0 15mm !important; 
            }

            /* Cover Page Negative Pull (Print Only) - REMOVED for Table Strategy */
            .print-cover-page {
                width: 100% !important;
                height: 250mm !important; 
            }
        }
      `}</style>

            <div className="container mx-auto p-4 pdf-page-root" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
                <h1 className="text-2xl font-extrabold mb-4 no-print text-center">📄 অধ্যায় ভিত্তিক PDF জেনারেটর</h1>

                {/* ========== Filters (hidden in print) ========== */}
                <div className="flex flex-wrap gap-4 mb-6 no-print justify-center">
                    <select className="select select-bordered" value={selectedClass}
                        onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); setTopicData(null); }}>
                        <option value="">শ্রেণি</option>
                        {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    {selectedClass && (
                        <select className="select select-bordered" value={selectedSubject}
                            onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); setTopicData(null); }}>
                            <option value="">বিষয়</option>
                            {subjectsForClass.map((m, i) => <option key={i} value={m.subject.code}>{m.subject.name}</option>)}
                        </select>
                    )}
                    {selectedSubject && (
                        <select className="select select-bordered" value={selectedChapter}
                            onChange={e => { setSelectedChapter(e.target.value); setTopicData(null); }}>
                            <option value="">অধ্যায়</option>
                            {chapters.map(ch => <option key={ch.id} value={ch.id}>অধ্যায় {getBengaliNum(ch.id)}: {ch.title}</option>)}
                        </select>
                    )}
                    {selectedChapter && (
                        <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : '🔍'} ডাটা লোড করুন
                        </button>
                    )}
                </div>

                {/* ========== Summary (hidden in print) ========== */}
                {topicData && (
                    <div className="mb-6 no-print">
                        <div className="stats shadow flex-wrap">
                            <div className="stat">
                                <div className="stat-title">টপিক</div>
                                <div className="stat-value text-primary">{getBengaliNum(topicData.length)}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">জ্ঞানমূলক (ক)</div>
                                <div className="stat-value text-blue-500">{getBengaliNum(topicData.reduce((s, t) => s + t.ka.length, 0))}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">অনুধাবন (খ)</div>
                                <div className="stat-value text-green-500">{getBengaliNum(topicData.reduce((s, t) => s + t.kha.length, 0))}</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">সৃজনশীল (CQ)</div>
                                <div className="stat-value text-amber-500">{getBengaliNum(topicData.reduce((s, t) => s + t.cqGroups.length, 0))}</div>
                            </div>
                        </div>
                        <button className="btn btn-success mt-4 gap-2" onClick={generatePDF}>
                            🖨️ PDF ডাউনলোড করুন
                        </button>
                    </div>
                )}

                {/* ========== PDF Content (visible on screen + printed) ========== */}
                {topicData && (
                    <div className="pdf-print-area" style={{ maxWidth: '100%', overflowX: 'visible', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '24px', boxShadow: 'none' }}>
                        <div ref={contentRef} style={{ width: '100%', padding: '0', backgroundColor: '#fff', fontFamily: '"Hind Siliguri", sans-serif', color: '#1e293b', position: 'relative' }}>

                            {/* Watermark: Fixed on every page (using canvas source for standard print) */}
                            {watermarkSrc && <img src={watermarkSrc} alt="" className="print-watermark-fixed" />}

                            {/* ---- Print Header (Repeats on every page via position:fixed) ---- */}
                            <div className="print-header">
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <img src="/HMT Logo.png" alt="Logo" style={{ height: '40px', marginRight: '10px' }} crossOrigin="anonymous" />
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#1e293b', lineHeight: '1.2' }}>
                                    <div style={{ fontWeight: 'bold' }}>{selectedSubjectObj?.subject?.name}</div>
                                    <div>অধ্যায় {getBengaliNum(selectedChapter)}: {chObj?.title}</div>
                                </div>
                            </div>

                            {/* ---- Print Footer (Repeats on every page via position:fixed) ---- */}
                            <div className="print-footer">
                                <div style={{ textAlign: 'left', fontSize: '12px', color: '#1e293b', lineHeight: '1.2' }}>
                                    <div style={{ fontWeight: 'bold' }}>Instructor</div>
                                    <div>Hridoy Matber</div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '12px', color: '#1e293b' }}>
                                    {/* Page Number Removed */}
                                </div>
                            </div>

                            {/* ---- Cover Page ---- */}
                            <div className="print-cover-page" style={{
                                height: '250mm', /* Safe Height */
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                textAlign: 'center', position: 'relative',
                                border: '3px double #94a3b8', padding: '40px',
                                breakAfter: 'always', pageBreakAfter: 'always',
                                boxSizing: 'border-box',
                                backgroundColor: 'white',
                                zIndex: 20000,
                                overflow: 'hidden',
                            }}>
                                {/* Patches to strictly hide fixed Header/Footer on this page */}
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: 'white', zIndex: 20001 }}></div>
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '150px', background: 'white', zIndex: 20001 }}></div>

                                <div style={{ marginBottom: '30px' }}>
                                    {/* Logo removed as per request */}
                                </div>
                                <div style={{ fontSize: '22px', color: '#64748b', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                                    {selectedClass}
                                </div>
                                <div style={{ fontSize: '18px', color: '#475569', marginBottom: '24px', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px', display: 'inline-block' }}>
                                    {selectedSubjectObj?.subject?.name}
                                </div>
                                <div style={{ fontSize: '28px', color: '#2563eb', fontWeight: 800, marginBottom: '12px' }}>
                                    অধ্যায় {getBengaliNum(selectedChapter)}
                                </div>
                                <div style={{ fontSize: '42px', fontWeight: 900, color: '#1e293b', marginBottom: '32px', lineHeight: 1.2 }}>
                                    {chObj?.title || ''}
                                </div>
                                <div style={{ width: '120px', height: '4px', backgroundColor: '#2563eb', margin: '0 auto 32px auto' }}></div>
                                <div style={{ fontSize: '20px', color: '#334155', fontWeight: 600 }}>
                                    বোর্ড প্রশ্ন সংকলন (উত্তরসহ)
                                </div>
                                <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '40px' }}>
                                    www.hmtutoring.netlify.app
                                </div>
                            </div>

                            {/* ---- Table Layout for Main Content (Handles Multi-page Header/Footer Spacing) ---- */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                                <thead>
                                    <tr>
                                        <td style={{ border: 'none', padding: 0 }}>
                                            {/* Spacer for Header */}
                                            <div style={{ height: '20mm' }}>&nbsp;</div>
                                        </td>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: 'none', padding: 0 }}>

                                            {/* ---- Topic Sections ---- */}
                                            {topicData.map((topic, ti) => (
                                                <div key={ti} style={{ marginTop: ti === 0 ? '60px' : '40px', position: 'relative', pageBreakBefore: 'always' }}>
                                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                                        {/* Topic Header */}
                                                        <div style={{ backgroundColor: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontSize: '18px', fontWeight: 800, textAlign: 'center', marginBottom: '20px' }}>
                                                            {topic.code ? `${topic.code}: ` : ''}{topic.name}
                                                        </div>

                                                        {/* ক - জ্ঞানমূলক */}
                                                        {topic.ka.length > 0 && (
                                                            <div style={{ marginBottom: '28px' }}>
                                                                <div style={{ textAlign: 'center', marginBottom: '12px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
                                                                    <span style={S.categoryBox('#3b82f6')}>ক | জ্ঞানমূলক</span>
                                                                </div>
                                                                <div style={{ columnCount: 2, columnGap: '20px' }}>
                                                                    {topic.ka.map((item, qi) => (
                                                                        <div key={qi} style={S.questionItem('#3b82f6')}>
                                                                            <div style={{ fontSize: '14px' }}>
                                                                                <strong>{getBengaliNum(qi + 1)}।</strong> {renderText(item.sub_question?.question_text)}
                                                                                {item.sub_question?.marks && <span style={S.metaBadge}>[{item.sub_question.marks} নম্বর]</span>}
                                                                                <span style={S.metaBadge}>({item.sources ? item.sources.join(', ') : item.source})</span>
                                                                            </div>
                                                                            {item.sub_question?.answer?.final_answer && (
                                                                                <div style={S.answerLine}>
                                                                                    <strong>উত্তর:</strong> {renderText(item.sub_question.answer.final_answer)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* খ - অনুধাবন */}
                                                        {topic.kha.length > 0 && (
                                                            <div style={{ marginBottom: '28px' }}>
                                                                <div style={{ textAlign: 'center', marginBottom: '12px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
                                                                    <span style={S.categoryBox('#10b981')}>খ | অনুধাবন</span>
                                                                </div>
                                                                <div style={{ columnCount: 2, columnGap: '20px' }}>
                                                                    {topic.kha.map((item, qi) => (
                                                                        <div key={qi} style={S.questionItem('#10b981')}>
                                                                            <div style={{ fontSize: '14px' }}>
                                                                                <strong>{getBengaliNum(qi + 1)}।</strong> {renderText(item.sub_question?.question_text)}
                                                                                {item.sub_question?.marks && <span style={S.metaBadge}>[{item.sub_question.marks} নম্বর]</span>}
                                                                                <span style={S.metaBadge}>({item.sources ? item.sources.join(', ') : item.source})</span>
                                                                            </div>
                                                                            {item.sub_question?.answer?.final_answer && (
                                                                                <div style={S.answerLine}>
                                                                                    <strong>উত্তর:</strong> {renderText(item.sub_question.answer.final_answer)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* গ/ঘ - প্রয়োগ ও উচ্চতর দক্ষতা */}
                                                        {topic.cqGroups.length > 0 && (
                                                            <div style={{ marginBottom: '28px' }}>
                                                                <div style={{ textAlign: 'center', marginBottom: '12px', breakAfter: 'avoid', pageBreakAfter: 'avoid' }}>
                                                                    <span style={S.categoryBox('#f59e0b')}>গ-ঘ | প্রয়োগ ও উচ্চতর দক্ষতা</span>
                                                                </div>
                                                                {topic.cqGroups.map((cq, ci) => (
                                                                    <div key={ci} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255,251,235,0.7)', borderRadius: '8px', border: '1px solid #fde68a', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#92400e', fontWeight: 600, marginBottom: '6px' }}>
                                                                            <span>{getBengaliNum(ci + 1)}। {cq.source}</span>
                                                                            <span>প্রশ্ন নং: {getBengaliNum(cq.question_no)}</span>
                                                                        </div>
                                                                        {/* Stem */}
                                                                        {cq.stem && (
                                                                            <div style={{ marginBottom: '10px', fontSize: '14px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
                                                                                {cq.stem.text && <div><strong>উদ্দীপক:</strong> {renderText(cq.stem.text)}</div>}
                                                                                {cq.stem.has_image && cq.stem.image_url && (
                                                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                                                                                        <img src={cq.stem.image_url} alt="stem" style={{ maxHeight: '150px', objectFit: 'contain', borderRadius: '4px' }} crossOrigin="anonymous" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Sub questions */}
                                                                        {cq.subQuestions.map((sq, si) => (
                                                                            <div key={si} style={{ marginBottom: '8px', paddingLeft: '10px', borderLeft: `3px solid ${sq.label === 'গ' ? '#f59e0b' : '#ef4444'}` }}>
                                                                                <div style={{ fontSize: '14px' }}>
                                                                                    <strong>{sq.label}।</strong> {renderText(sq.question_text)}
                                                                                    {sq.marks && <span style={S.metaBadge}>[{sq.marks} নম্বর]</span>}
                                                                                </div>
                                                                                {sq.answer?.final_answer && (
                                                                                    <div style={S.answerLine}>
                                                                                        <strong>উত্তর:</strong> {renderText(sq.answer.final_answer)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Footer Text */}
                                            <div style={{ marginTop: '40px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                                                Generated by H.M. Tutoring AI — hmtutoring.netlify.app
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td style={{ border: 'none', padding: 0 }}>
                                            {/* Spacer for Footer */}
                                            <div style={{ height: '15mm' }}>&nbsp;</div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>

        </MathJaxContext>
    );
}

export default ChapterPDFPage;
