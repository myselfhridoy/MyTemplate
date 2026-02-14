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
                // Token expired - clear and show sign-in again
                if (res.status === 401 || res.status === 500) {
                    setLocalToken(null);
                    if (onTokenReceived) onTokenReceived(null);
                    try { sessionStorage.removeItem('g_drive_token'); } catch { }
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

    useEffect(() => {
        fetchAnswers();
    }, [fetchAnswers]);

    // Allow parent to trigger refresh
    useEffect(() => {
        if (onRefreshNeeded) {
            onRefreshNeeded.current = fetchAnswers;
        }
    }, [fetchAnswers, onRefreshNeeded]);

    // Sign in to view saved answers
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

    // No token — show sign-in prompt
    if (!localToken) {
        return (
            <div style={{
                border: '1px dashed #cbd5e1', borderRadius: '10px',
                padding: '12px', marginBottom: '12px', textAlign: 'center',
                background: '#f8fafc',
            }}>
                <button
                    onClick={handleSignIn}
                    disabled={signInLoading}
                    style={{
                        background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                        color: '#fff', border: 'none', padding: '6px 16px',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                        cursor: signInLoading ? 'wait' : 'pointer',
                        fontFamily: 'Hind Siliguri, sans-serif',
                    }}
                >
                    {signInLoading ? '⏳ সাইন ইন হচ্ছে...' : '📂 Drive এ সংরক্ষিত উত্তর'}
                </button>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Google Drive থেকে আগের উত্তর লোড করতে সাইন ইন করুন
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: '13px' }}>
                <span className="loading loading-spinner loading-xs" style={{ marginRight: 6 }}></span>
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
        } catch {
            return iso;
        }
    };

    const bengaliNum = (n) => String(n).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');

    return (
        <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
        }}>
            {/* Header — always visible, clickable to toggle */}
            <div
                onClick={() => setExpanded((v) => !v)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', cursor: 'pointer', userSelect: 'none',
                    background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                }}
            >
                <span>📂 Drive এ সংরক্ষিত উত্তর ({bengaliNum(answers.length)} টি)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', opacity: 0.9 }}>
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
                    <div style={{ position: 'relative', minHeight: '120px', background: '#fff' }}>
                        {/* Left arrow */}
                        {answers.length > 1 && currentIndex > 0 && (
                            <button
                                onClick={goPrev}
                                style={{
                                    position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 5, width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                                    cursor: 'pointer', fontSize: '16px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                title="আগের উত্তর"
                            >◀</button>
                        )}

                        {/* Right arrow */}
                        {answers.length > 1 && currentIndex < answers.length - 1 && (
                            <button
                                onClick={goNext}
                                style={{
                                    position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
                                    zIndex: 5, width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                                    cursor: 'pointer', fontSize: '16px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                title="পরের উত্তর"
                            >▶</button>
                        )}

                        {/* Image */}
                        {imgError[current.id] ? (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', padding: '24px', color: '#94a3b8', minHeight: '150px',
                            }}>
                                <span style={{ fontSize: '28px', marginBottom: '8px' }}>🖼️</span>
                                <span style={{ fontSize: '12px' }}>ইমেজ লোড হয়নি</span>
                                <a href={current.webViewLink} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px' }}>
                                    Drive এ দেখুন →
                                </a>
                            </div>
                        ) : (
                            <img
                                src={current.thumbnailUrl}
                                alt={`সেভ করা উত্তর ${currentIndex + 1}`}
                                style={{
                                    width: '100%', maxHeight: '400px', objectFit: 'contain',
                                    display: 'block', cursor: 'pointer',
                                }}
                                onClick={() => window.open(current.webViewLink, '_blank')}
                                onError={() => setImgError((prev) => ({ ...prev, [current.id]: true }))}
                                referrerPolicy="no-referrer"
                            />
                        )}
                    </div>

                    {/* Footer: meta + actions */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 12px', borderTop: '1px solid #e2e8f0',
                        background: '#f8fafc', fontSize: '11px', color: '#64748b',
                        flexWrap: 'wrap', gap: '4px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>🕐 {formatDate(current.createdTime)}</span>
                            {current.modelUsed && (
                                <span style={{
                                    background: '#e0e7ff', color: '#4338ca', padding: '1px 6px',
                                    borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                                }}>
                                    {current.modelUsed}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <a href={current.webViewLink} target="_blank" rel="noopener noreferrer"
                                style={{
                                    background: '#2563eb', color: '#fff', border: 'none',
                                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                    cursor: 'pointer', textDecoration: 'none', fontWeight: 500,
                                }}>
                                🔗 Drive
                            </a>
                            <button
                                onClick={() => handleDelete(current.id)}
                                disabled={deleting === current.id}
                                style={{
                                    background: '#fee2e2', color: '#dc2626', border: 'none',
                                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                    cursor: deleting === current.id ? 'wait' : 'pointer', fontWeight: 500,
                                }}
                            >
                                {deleting === current.id ? '⏳' : '🗑️ ডিলিট'}
                            </button>
                        </div>
                    </div>

                    {/* Dot indicators */}
                    {answers.length > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: '5px',
                            padding: '6px', background: '#f8fafc',
                        }}>
                            {answers.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    style={{
                                        width: i === currentIndex ? '16px' : '6px',
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: i === currentIndex ? '#2563eb' : '#cbd5e1',
                                        border: 'none', cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                    }}
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
