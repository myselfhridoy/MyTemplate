import React, { useState, useEffect, useCallback } from 'react';

const DRIVE_API = 'https://geminiai-render.onrender.com/api/driveRouter';
const GOOGLE_CLIENT_ID = '19730678351-p3t6io5vl987rnffmim1nlo21ks7evub.apps.googleusercontent.com';

function SavedAnswerGallery({ questionHash, accessToken, onRefreshNeeded, onTokenReceived }) {
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [deleting, setDeleting] = useState(null);
    const [imgError, setImgError] = useState({});
    const [localToken, setLocalToken] = useState(() => {
        if (accessToken) return accessToken;
        try { return sessionStorage.getItem('g_drive_token') || null; } catch { return null; }
    });
    const [signInLoading, setSignInLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Sync external token
    useEffect(() => {
        if (accessToken) setLocalToken(accessToken);
    }, [accessToken]);

    const fetchAnswers = useCallback(async () => {
        const token = localToken;
        if (!questionHash || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`${DRIVE_API}/answers/${questionHash}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 500) {
                    setLocalToken(null);
                    if (onTokenReceived) onTokenReceived(null);
                    try { sessionStorage.removeItem('g_drive_token'); } catch { /* empty */ }
                }
                throw new Error('Failed to fetch');
            }
            const data = await res.json();
            setAnswers(data.answers || []);
            setCurrentIndex(0);
            setImgError({});
        } catch (err) {
            console.error('Gallery fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [questionHash, localToken]);

    useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

    useEffect(() => {
        if (onRefreshNeeded) onRefreshNeeded.current = fetchAnswers;
    }, [fetchAnswers, onRefreshNeeded]);

    const handleSignIn = async () => {
        setSignInLoading(true);
        try {
            // eslint-disable-next-line no-undef
            if (typeof google === 'undefined' || !google.accounts) {
                alert('Google Identity Services লোড হয়নি। পেজ রিফ্রেশ করুন।');
                return;
            }
            // eslint-disable-next-line no-undef
            const client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.file',
                prompt: 'select_account',
                callback: (response) => {
                    if (response.error) {
                        console.error('Sign-in error:', response);
                    } else {
                        setLocalToken(response.access_token);
                        if (onTokenReceived) onTokenReceived(response.access_token);
                    }
                    setSignInLoading(false);
                },
            });
            client.requestAccessToken();
        } catch (err) {
            console.error('Sign-in error:', err);
            setSignInLoading(false);
        }
    };

    const handleDelete = async (fileId) => {
        if (!window.confirm('এই উত্তরটি Drive থেকে ডিলিট করবেন?')) return;
        setDeleting(fileId);
        try {
            const res = await fetch(`${DRIVE_API}/answers/${fileId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localToken}` },
            });
            if (!res.ok) throw new Error('Delete failed');
            setAnswers((prev) => prev.filter((a) => a.id !== fileId));
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

    if (!questionHash) return null;

    // No token — sign-in prompt (theme-aware)
    if (!localToken) {
        return (
            <div className="border border-dashed border-base-300 rounded-xl p-3 mb-3 text-center bg-base-200">
                <button
                    onClick={handleSignIn}
                    disabled={signInLoading}
                    className="btn btn-primary btn-sm gap-1"
                >
                    {signInLoading ? (
                        <><span className="loading loading-spinner loading-xs"></span> সাইন ইন হচ্ছে...</>
                    ) : (
                        '📂 Drive এ সংরক্ষিত উত্তর'
                    )}
                </button>
                <div className="text-xs opacity-50 mt-1">
                    Google Drive থেকে আগের উত্তর লোড করতে সাইন ইন করুন
                </div>
            </div>
        );
    }

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
                <span>📂 Drive এ সংরক্ষিত উত্তর ({bengaliNum(answers.length)} টি)</span>
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
                    {/* Image display */}
                    <div className="relative bg-base-100" style={{ minHeight: '120px' }}>
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

                        {/* Image or error */}
                        {imgError[current.id] ? (
                            <div className="flex flex-col items-center justify-center p-6 opacity-50" style={{ minHeight: '150px' }}>
                                <span className="text-3xl mb-2">🖼️</span>
                                <span className="text-xs">ইমেজ লোড হয়নি</span>
                                <a href={current.webViewLink} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-primary mt-1 link">
                                    Drive এ দেখুন →
                                </a>
                            </div>
                        ) : (
                            <img
                                src={current.thumbnailUrl}
                                alt={`সেভ করা উত্তর ${currentIndex + 1}`}
                                className="w-full block cursor-pointer"
                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                                onClick={() => window.open(current.webViewLink, '_blank')}
                                onError={() => setImgError((prev) => ({ ...prev, [current.id]: true }))}
                                referrerPolicy="no-referrer"
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-base-300 bg-base-200 text-xs flex-wrap gap-1">
                        <div className="flex items-center gap-2 flex-wrap opacity-70">
                            <span>🕐 {formatDate(current.createdTime)}</span>
                            {current.modelUsed && (
                                <span className="badge badge-sm badge-primary badge-outline">
                                    {current.modelUsed}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5">
                            <a href={current.webViewLink} target="_blank" rel="noopener noreferrer"
                                className="btn btn-xs btn-primary">
                                🔗 Drive
                            </a>
                            <button
                                onClick={() => handleDelete(current.id)}
                                disabled={deleting === current.id}
                                className="btn btn-xs btn-error btn-outline"
                            >
                                {deleting === current.id ? '⏳' : '🗑️ ডিলিট'}
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

export default SavedAnswerGallery;
