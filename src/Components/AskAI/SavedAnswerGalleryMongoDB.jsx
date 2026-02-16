import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../Context/AuthContext';
import MathRendererWithContext from '../MathRenderer/MathRenderer';

const API_base = 'https://geminiai-render.onrender.com/api/saved_answers';

function SavedAnswerGalleryMongoDB({ questionHash, onRefreshNeeded }) {
    const { user } = useAuth();
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [deleting, setDeleting] = useState(null);
    const [expanded, setExpanded] = useState(false);

    const fetchAnswers = useCallback(async () => {
        if (!questionHash || !user?._id) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_base}/${user._id}/${questionHash}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setAnswers(data.answers || []);
            setCurrentIndex(0);
        } catch (err) {
            console.error('Gallery fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [questionHash, user]);

    useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

    useEffect(() => {
        if (onRefreshNeeded) onRefreshNeeded.current = fetchAnswers;
    }, [fetchAnswers, onRefreshNeeded]);

    const handleDelete = async (id) => {
        if (!window.confirm('এই উত্তরটি ডিলিট করবেন?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`${API_base}/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
            setAnswers((prev) => prev.filter((a) => a._id !== id));
            setCurrentIndex((prev) => Math.max(0, Math.min(prev, answers.length - 2)));
        } catch (err) {
            console.error('Delete error:', err);
            alert('ডিলিট ব্যর্থ হয়েছে।');
        } finally {
            setDeleting(null);
        }
    };

    const goNext = () => setCurrentIndex((i) => Math.min(i + 1, answers.length - 1));
    const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

    if (!questionHash || !user) return null;

    if (loading) {
        return (
            <div className="text-center p-3 text-sm opacity-60">
                <span className="loading loading-spinner loading-xs mr-1"></span>
                সেভ করা উত্তর লোড হচ্ছে...
            </div>
        );
    }
    if (answers.length === 0) return null;

    const current = answers[currentIndex];
    if (!current) return null;

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) +
                ' ' + d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    };

    const bengaliNum = (n) => String(n).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');

    return (
        <div className="border border-base-300 rounded-xl overflow-hidden mb-3 bg-base-200">
            {/* Header — collapsible toggle */}
            <div
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none text-sm font-semibold bg-base-300 text-base-content"
            >
                <span>📂 সংরক্ষিত উত্তর ({bengaliNum(answers.length)} টি)</span>
                <span className="flex items-center gap-1.5 text-xs opacity-90">
                    {expanded && <span>{bengaliNum(currentIndex + 1)} / {bengaliNum(answers.length)}</span>}
                    <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s ease',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>▼</span>
                </span>
            </div>

            {/* Collapsible content */}
            {expanded && (
                <>
                    {/* Content Display (Text or Image) */}
                    <div className="relative bg-base-100 p-4" style={{ minHeight: '120px', maxHeight: '500px', overflowY: 'auto' }}>
                        {/* Nav arrows */}
                        {answers.length > 1 && currentIndex > 0 && (
                            <button
                                onClick={goPrev}
                                className="btn btn-circle btn-sm btn-neutral opacity-70 hover:opacity-100 absolute left-1 top-1/2 -translate-y-1/2 z-10"
                                title="আগের উত্তর"
                            >◀</button>
                        )}
                        {answers.length > 1 && currentIndex < answers.length - 1 && (
                            <button
                                onClick={goNext}
                                className="btn btn-circle btn-sm btn-neutral opacity-70 hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 z-10"
                                title="পরের উত্তর"
                            >▶</button>
                        )}

                        {/* Content Display (Prioritize Image if available, else Text) */}
                        {current.imageBase64 ? (
                            /* Image Mode (ImgBB or Legacy Base64) */
                            <img
                                src={current.imageBase64}
                                alt={`সেভ করা উত্তর ${currentIndex + 1}`}
                                className="w-full block"
                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                            />
                        ) : (
                            /* Text Mode */
                            current.answerText && (
                                <div className="text-sm space-y-4">
                                    {/* Context Header */}
                                    <div className="text-xs text-gray-500 border-b pb-2 mb-2">
                                        {[current.source, current.marks ? `মান: ${current.marks}` : ''].filter(Boolean).join(' • ')}
                                    </div>

                                    {/* Answer Only (As requested) */}
                                    <div className="pt-2">
                                        <div style={{ whiteSpace: 'pre-line' }}>
                                            {(() => {
                                                const answer = current.answerText;
                                                const svgRegex = /(<svg[\s\S]*?<\/svg>)/gi;
                                                const parts = answer.split(svgRegex);
                                                if (parts.length <= 1) {
                                                    return <MathRendererWithContext text={answer} />;
                                                }
                                                return parts.map((part, i) => {
                                                    if (svgRegex.lastIndex === 0) svgRegex.lastIndex = 0;
                                                    if (/<svg[\s\S]*?<\/svg>/i.test(part)) {
                                                        return (
                                                            <div key={i} style={{ margin: '12px 0', display: 'flex', justifyContent: 'center', overflowX: 'auto', width: '100%' }}>
                                                                <div dangerouslySetInnerHTML={{ __html: part }} style={{ maxWidth: '100%' }} />
                                                            </div>
                                                        );
                                                    }
                                                    const trimmed = part.trim();
                                                    if (!trimmed) return null;
                                                    return <MathRendererWithContext key={i} text={trimmed} />;
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-base-300 bg-base-200 text-xs flex-wrap gap-1">
                        <div className="flex items-center gap-2 flex-wrap opacity-70">
                            <span>🕐 {formatDate(current.createdAt)}</span>
                            {current.modelUsed && (
                                <span className="badge badge-sm badge-primary badge-outline">
                                    {current.modelUsed}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => handleDelete(current._id)}
                                disabled={deleting === current._id}
                                className="btn btn-xs btn-error btn-outline"
                            >
                                {deleting === current._id ? '⏳' : '🗑️ ডিলিট'}
                            </button>
                        </div>
                    </div>

                    {/* Dot indicators */}
                    {answers.length > 1 && (
                        <div className="flex justify-center gap-1 py-1.5 bg-base-200">
                            {answers.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`rounded-full border-none cursor-pointer transition-all duration-300 ${i === currentIndex ? 'bg-primary w-4 h-1.5' : 'bg-base-content/30 w-1.5 h-1.5'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default SavedAnswerGalleryMongoDB;
