import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';

const API_BASE = 'https://geminiai-render.onrender.com/api/newsfeed';
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

// Reaction emojis config
const REACTION_TYPES = [
    { key: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
    { key: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
    { key: 'haha', emoji: '😂', label: 'Haha', color: 'text-yellow-500' },
    { key: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-500' },
    { key: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-500' },
    { key: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

// Time ago helper
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'এইমাত্র';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} দিন আগে`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} সপ্তাহ আগে`;
    return date.toLocaleDateString('bn-BD');
}

function NewsFeedPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Composer state
    const [composerOpen, setComposerOpen] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [newPostImage, setNewPostImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [posting, setPosting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Comment state
    const [commentTexts, setCommentTexts] = useState({});
    const [expandedComments, setExpandedComments] = useState({});
    const [commentingOn, setCommentingOn] = useState(null);

    // Reaction picker state
    const [activeReactionPicker, setActiveReactionPicker] = useState(null);

    // Toast
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Fetch posts
    const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const res = await fetch(`${API_BASE}?page=${pageNum}&limit=10`);
            const data = await res.json();

            if (data.success) {
                if (append) {
                    setPosts(prev => [...prev, ...data.posts]);
                } else {
                    setPosts(data.posts);
                }
                setHasMore(data.pagination.hasMore);
                setPage(pageNum);
            }
        } catch (err) {
            console.error('Fetch posts error:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Upload image to imgbb
    const uploadToImgbb = async (file) => {
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) return data.data.url;
            throw new Error('Upload failed');
        } catch (err) {
            console.error('Image upload error:', err);
            showToast('ছবি আপলোড ব্যর্থ হয়েছে', 'error');
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    // Handle image selection
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewPostImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setNewPostImage(null);
        setImagePreview(null);
    };

    // Create post
    const handleCreatePost = async () => {
        if (!newPostText.trim() && !newPostImage) return;
        setPosting(true);

        try {
            let imageUrl = null;
            if (newPostImage) {
                imageUrl = await uploadToImgbb(newPostImage);
                if (!imageUrl && !newPostText.trim()) {
                    setPosting(false);
                    return;
                }
            }

            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authorId: user._id,
                    authorName: user.username,
                    authorRole: user.isAdmin ? 'Admin' : 'Student',
                    content: newPostText.trim(),
                    imageUrl,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev => [data.post, ...prev]);
                setNewPostText('');
                setNewPostImage(null);
                setImagePreview(null);
                setComposerOpen(false);
                showToast('পোস্ট প্রকাশিত হয়েছে! ✅');
            }
        } catch (err) {
            console.error('Create post error:', err);
            showToast('পোস্ট তৈরি ব্যর্থ হয়েছে', 'error');
        } finally {
            setPosting(false);
        }
    };

    // Toggle reaction
    const handleReaction = async (postId, reactionType) => {
        setActiveReactionPicker(null);
        try {
            const res = await fetch(`${API_BASE}/${postId}/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id,
                    reactionType,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev =>
                    prev.map(p => p._id === postId ? { ...p, reactions: data.reactions } : p)
                );
            }
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    // Add comment
    const handleAddComment = async (postId) => {
        const text = commentTexts[postId]?.trim();
        if (!text) return;
        setCommentingOn(postId);

        try {
            const res = await fetch(`${API_BASE}/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authorId: user._id,
                    authorName: user.username,
                    authorRole: user.isAdmin ? 'Admin' : 'Student',
                    text,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev =>
                    prev.map(p =>
                        p._id === postId
                            ? { ...p, comments: [...(p.comments || []), data.comment] }
                            : p
                    )
                );
                setCommentTexts(prev => ({ ...prev, [postId]: '' }));
            }
        } catch (err) {
            console.error('Comment error:', err);
        } finally {
            setCommentingOn(null);
        }
    };

    // Delete post
    const handleDeletePost = async (postId) => {
        if (!confirm('এই পোস্টটি মুছে ফেলতে চান?')) return;

        try {
            const res = await fetch(`${API_BASE}/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id,
                    isAdmin: user.isAdmin || false,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPosts(prev => prev.filter(p => p._id !== postId));
                showToast('পোস্ট মুছে ফেলা হয়েছে');
            }
        } catch (err) {
            console.error('Delete error:', err);
            showToast('মুছতে ব্যর্থ হয়েছে', 'error');
        }
    };

    // Share (copy link)
    const handleShare = (postId) => {
        const url = `${window.location.origin}/newsfeed#${postId}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('লিংক কপি হয়েছে! 📋');
        }).catch(() => {
            showToast('কপি ব্যর্থ হয়েছে', 'error');
        });
    };

    // Get total reaction count for a post
    const getTotalReactions = (reactions) => {
        if (!reactions) return 0;
        return Object.values(reactions).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    };

    // Get user's current reaction
    const getUserReaction = (reactions) => {
        if (!reactions || !user) return null;
        for (const r of REACTION_TYPES) {
            if (reactions[r.key]?.includes(user._id)) return r;
        }
        return null;
    };

    // Get top 3 reaction emojis for display
    const getTopReactionEmojis = (reactions) => {
        if (!reactions) return [];
        return REACTION_TYPES
            .filter(r => reactions[r.key]?.length > 0)
            .sort((a, b) => (reactions[b.key]?.length || 0) - (reactions[a.key]?.length || 0))
            .slice(0, 3)
            .map(r => r.emoji);
    };

    // Get author avatar based on role
    const getAvatar = (role) => {
        return role === 'Admin'
            ? 'https://img.icons8.com/3d-fluency/94/manager.png'
            : 'https://img.icons8.com/3d-fluency/94/student-male--v3.png';
    };

    // Load more
    const loadMore = () => {
        fetchPosts(page + 1, true);
    };

    // =============================================
    // Skeleton loader component (Facebook-style shimmer)
    // =============================================
    const PostSkeleton = () => (
        <div className="fb-card animate-pulse">
            <div className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-base-300"></div>
                    <div className="flex-1">
                        <div className="h-3.5 bg-base-300 rounded w-32 mb-2"></div>
                        <div className="h-2.5 bg-base-300 rounded w-20"></div>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <div className="h-3 bg-base-300 rounded w-full"></div>
                    <div className="h-3 bg-base-300 rounded w-4/5"></div>
                </div>
            </div>
            <div className="h-52 bg-base-300"></div>
            <div className="p-4">
                <div className="flex gap-4">
                    <div className="h-8 bg-base-300 rounded flex-1"></div>
                    <div className="h-8 bg-base-300 rounded flex-1"></div>
                    <div className="h-8 bg-base-300 rounded flex-1"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-base-200" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>

            {/* ===== Facebook-style CSS ===== */}
            <style>{`
                .nf-page .fb-card {
                    background: var(--fallback-b1, oklch(var(--b1)));
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    margin-bottom: 16px;
                    overflow: hidden;
                }
                .nf-page .fb-divider {
                    height: 1px;
                    background: var(--fallback-b3, oklch(var(--b3)));
                    margin: 0;
                }
                .nf-page .fb-action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    flex: 1;
                    padding: 8px 4px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--fallback-bc, oklch(var(--bc) / 0.6));
                    cursor: pointer;
                    border: none;
                    background: none;
                    transition: background 0.15s;
                }
                .nf-page .fb-action-btn:hover {
                    background: var(--fallback-b3, oklch(var(--b3)));
                }
                .nf-page .fb-action-btn.active {
                    color: #1877f2;
                }
                .nf-page .fb-reaction-bar {
                    position: absolute;
                    bottom: calc(100% + 6px);
                    left: -8px;
                    background: var(--fallback-b1, oklch(var(--b1)));
                    border-radius: 28px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                    padding: 4px 8px;
                    display: flex;
                    gap: 2px;
                    z-index: 100;
                    animation: fb-reaction-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .nf-page .fb-reaction-btn {
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: transform 0.15s;
                    padding: 2px 4px;
                    border-radius: 50%;
                    border: none;
                    background: none;
                    line-height: 1;
                }
                .nf-page .fb-reaction-btn:hover {
                    transform: scale(1.35) translateY(-4px);
                }
                .nf-page .fb-comment-bubble {
                    background: var(--fallback-b2, oklch(var(--b2)));
                    border-radius: 18px;
                    padding: 8px 12px;
                }
                .nf-page .fb-composer-input {
                    background: var(--fallback-b2, oklch(var(--b2)));
                    border: none;
                    border-radius: 20px;
                    padding: 8px 16px;
                    width: 100%;
                    font-size: 15px;
                    outline: none;
                    cursor: pointer;
                    color: var(--fallback-bc, oklch(var(--bc) / 0.65));
                    transition: background 0.15s;
                }
                .nf-page .fb-composer-input:hover {
                    background: var(--fallback-b3, oklch(var(--b3)));
                }
                .nf-page .fb-composer-input:focus {
                    background: var(--fallback-b2, oklch(var(--b2)));
                    cursor: text;
                }
                .nf-page .fb-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid var(--fallback-b3, oklch(var(--b3)));
                }
                .nf-page .fb-avatar-sm {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .nf-page .fb-avatar-xs {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .nf-page .fb-emoji-stack {
                    display: flex;
                    margin-right: 4px;
                }
                .nf-page .fb-emoji-stack span {
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: var(--fallback-b1, oklch(var(--b1)));
                    border: 1.5px solid var(--fallback-b1, oklch(var(--b1)));
                    font-size: 12px;
                    margin-left: -4px;
                }
                .nf-page .fb-emoji-stack span:first-child {
                    margin-left: 0;
                }
                .nf-page .fb-comment-input {
                    background: var(--fallback-b2, oklch(var(--b2)));
                    border: none;
                    border-radius: 20px;
                    padding: 8px 40px 8px 14px;
                    width: 100%;
                    font-size: 13px;
                    outline: none;
                    color: var(--fallback-bc, oklch(var(--bc)));
                }
                .nf-page .fb-comment-input::placeholder {
                    color: var(--fallback-bc, oklch(var(--bc) / 0.45));
                }

                @keyframes fb-reaction-pop {
                    0% { opacity: 0; transform: scale(0.7) translateY(8px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>

            <div className="nf-page container mx-auto max-w-[680px] py-4 px-3 sm:px-4">

                {/* ===== Post Composer (Facebook Style) ===== */}
                <div className="fb-card">
                    <div className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')}
                                alt="avatar"
                                className="fb-avatar"
                            />
                            {!composerOpen ? (
                                <button
                                    className="fb-composer-input text-left"
                                    onClick={() => setComposerOpen(true)}
                                >
                                    {`কি মনে হচ্ছে, ${user?.username || 'User'}?`}
                                </button>
                            ) : null}
                        </div>

                        {/* Expanded Composer */}
                        {composerOpen && (
                            <div className="mt-3">
                                <textarea
                                    className="w-full bg-transparent border-none outline-none resize-none text-base-content/90 placeholder:text-base-content/40 min-h-[80px] text-[15px] leading-relaxed"
                                    placeholder={`কি মনে হচ্ছে, ${user?.username || 'User'}?`}
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                    autoFocus
                                    rows={3}
                                />

                                {/* Image Preview */}
                                {imagePreview && (
                                    <div className="relative mt-2 rounded-lg overflow-hidden border border-base-300">
                                        <img
                                            src={imagePreview}
                                            alt="preview"
                                            className="w-full max-h-72 object-cover"
                                        />
                                        <button
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors text-lg"
                                            onClick={removeImage}
                                        >×</button>
                                    </div>
                                )}

                                {/* Composer Actions */}
                                <div className="fb-divider mt-3"></div>
                                <div className="flex items-center justify-between mt-3 gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-base-content/50 font-semibold mr-1">পোস্টে যোগ করুন:</span>
                                        {/* Image Upload */}
                                        <label className="w-9 h-9 rounded-full hover:bg-green-500/10 flex items-center justify-center cursor-pointer transition-colors" title="ছবি">
                                            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageSelect}
                                            />
                                        </label>
                                        <button className="w-9 h-9 rounded-full hover:bg-yellow-500/10 flex items-center justify-center transition-colors" title="ইমোজি">
                                            <span className="text-xl">😊</span>
                                        </button>
                                    </div>

                                    <button
                                        className="px-5 py-1.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40"
                                        style={{ background: (posting || uploadingImage || (!newPostText.trim() && !newPostImage)) ? '#a0a0a0' : '#1877f2' }}
                                        onClick={handleCreatePost}
                                        disabled={posting || uploadingImage || (!newPostText.trim() && !newPostImage)}
                                    >
                                        {posting || uploadingImage ? (
                                            <span className="flex items-center gap-2">
                                                <span className="loading loading-spinner loading-xs"></span>
                                                {uploadingImage ? 'আপলোড...' : 'পোস্ট...'}
                                            </span>
                                        ) : 'পোস্ট করুন'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== Loading Skeletons ===== */}
                {loading && (
                    <div>
                        <PostSkeleton />
                        <PostSkeleton />
                        <PostSkeleton />
                    </div>
                )}

                {/* ===== Empty State ===== */}
                {!loading && posts.length === 0 && (
                    <div className="fb-card p-10 text-center">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-lg font-bold text-base-content/70">এখনো কোনো পোস্ট নেই</h3>
                        <p className="text-sm text-base-content/40 mt-2">প্রথম পোস্ট করে ফিড শুরু করুন!</p>
                    </div>
                )}

                {/* ===== Posts Feed ===== */}
                {posts.map((post) => {
                    const userReaction = getUserReaction(post.reactions);
                    const totalReactions = getTotalReactions(post.reactions);
                    const topEmojis = getTopReactionEmojis(post.reactions);
                    const isAuthor = user?._id === post.authorId;
                    const canDelete = isAuthor || user?.isAdmin;
                    const commentCount = post.comments?.length || 0;

                    return (
                        <div key={post._id} className="fb-card" id={post._id}>

                            {/* === Post Header === */}
                            <div className="flex items-start justify-between p-3 sm:px-4 pb-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <img src={getAvatar(post.authorRole)} alt={post.authorName} className="fb-avatar" />
                                        {post.authorRole === 'Admin' && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-base-100" title="Admin">
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-[15px] text-base-content hover:underline cursor-pointer">
                                                {post.authorName}
                                            </span>
                                            {post.authorRole === 'Admin' && (
                                                <span className="text-xs text-blue-500/80 font-medium">• Admin</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-base-content/40">
                                            <span>{timeAgo(post.createdAt)}</span>
                                            <span>·</span>
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 0113 0h-2.7A4.52 4.52 0 008.5 4.56V1.52A6.49 6.49 0 011.5 8zm6 6.48V11.4a4.52 4.52 0 003.3-3.4h2.7a6.49 6.49 0 01-6 6.48z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Three-dot menu */}
                                {canDelete && (
                                    <div className="dropdown dropdown-end">
                                        <label tabIndex={0} className="w-9 h-9 rounded-full hover:bg-base-200 flex items-center justify-center cursor-pointer transition-colors">
                                            <svg className="w-5 h-5 text-base-content/50" fill="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="5" r="2" />
                                                <circle cx="12" cy="12" r="2" />
                                                <circle cx="12" cy="19" r="2" />
                                            </svg>
                                        </label>
                                        <ul tabIndex={0} className="dropdown-content menu p-1 shadow-xl bg-base-100 rounded-xl w-48 border border-base-300/50 z-50 mt-1">
                                            <li>
                                                <button
                                                    className="text-error text-sm rounded-lg"
                                                    onClick={() => handleDeletePost(post._id)}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    পোস্ট মুছে ফেলুন
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* === Post Content === */}
                            <div className="px-3 sm:px-4 py-2">
                                <p className="text-[15px] text-base-content leading-relaxed whitespace-pre-wrap">
                                    {post.content}
                                </p>
                            </div>

                            {/* === Post Image === */}
                            {post.imageUrl && (
                                <div className="cursor-pointer" onClick={() => window.open(post.imageUrl, '_blank')}>
                                    <img
                                        src={post.imageUrl}
                                        alt="post"
                                        className="w-full max-h-[520px] object-cover hover:brightness-95 transition-all"
                                    />
                                </div>
                            )}

                            {/* === Reaction & Comment Counts === */}
                            {(totalReactions > 0 || commentCount > 0) && (
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    {totalReactions > 0 ? (
                                        <div className="flex items-center gap-1 cursor-pointer hover:underline">
                                            <div className="fb-emoji-stack">
                                                {topEmojis.map((emoji, i) => (
                                                    <span key={i}>{emoji}</span>
                                                ))}
                                            </div>
                                            <span className="text-[13px] text-base-content/50">{totalReactions}</span>
                                        </div>
                                    ) : <div></div>}
                                    {commentCount > 0 && (
                                        <button
                                            className="text-[13px] text-base-content/50 hover:underline cursor-pointer"
                                            onClick={() => setExpandedComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                                        >
                                            {commentCount} মন্তব্য
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* === Divider === */}
                            <div className="mx-4"><div className="fb-divider"></div></div>

                            {/* === Action Buttons (Like, Comment, Share) === */}
                            <div className="flex items-center px-2 py-1">
                                {/* Like / React */}
                                <div className="relative flex-1">
                                    <button
                                        className={`fb-action-btn w-full ${userReaction ? 'active' : ''}`}
                                        onClick={() => handleReaction(post._id, 'like')}
                                        onMouseEnter={() => setActiveReactionPicker(post._id)}
                                        onMouseLeave={() => setTimeout(() => setActiveReactionPicker(prev => prev === post._id ? null : prev), 600)}
                                    >
                                        <span className="text-lg leading-none">{userReaction ? userReaction.emoji : '👍'}</span>
                                        <span className="text-[13px]">{userReaction ? userReaction.label : 'Like'}</span>
                                    </button>

                                    {/* Reaction Picker Popup */}
                                    {activeReactionPicker === post._id && (
                                        <div
                                            className="fb-reaction-bar"
                                            onMouseEnter={() => setActiveReactionPicker(post._id)}
                                            onMouseLeave={() => setActiveReactionPicker(null)}
                                        >
                                            {REACTION_TYPES.map((r) => (
                                                <button
                                                    key={r.key}
                                                    className="fb-reaction-btn tooltip tooltip-top"
                                                    data-tip={r.label}
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(post._id, r.key); }}
                                                >
                                                    {r.emoji}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Comment */}
                                <button
                                    className="fb-action-btn"
                                    onClick={() => setExpandedComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                                    </svg>
                                    <span className="text-[13px]">মন্তব্য</span>
                                </button>

                                {/* Share */}
                                <button
                                    className="fb-action-btn"
                                    onClick={() => handleShare(post._id)}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                    </svg>
                                    <span className="text-[13px]">শেয়ার</span>
                                </button>
                            </div>

                            {/* === Comments Section === */}
                            {expandedComments[post._id] && (
                                <div className="px-3 sm:px-4 pb-3">
                                    <div className="fb-divider mb-3"></div>

                                    {/* Existing Comments */}
                                    {post.comments && post.comments.length > 0 && (
                                        <div className="space-y-3 max-h-80 overflow-y-auto mb-3">
                                            {post.comments.map((comment) => (
                                                <div key={comment.commentId} className="flex gap-2 items-start">
                                                    <img src={getAvatar(comment.authorRole)} alt={comment.authorName} className="fb-avatar-xs mt-0.5" />
                                                    <div>
                                                        <div className="fb-comment-bubble">
                                                            <span className="font-semibold text-[13px] text-base-content">
                                                                {comment.authorName}
                                                                {comment.authorRole === 'Admin' && (
                                                                    <span className="text-blue-500 text-[11px] ml-1 font-normal">• Admin</span>
                                                                )}
                                                            </span>
                                                            <p className="text-[13px] text-base-content/80 mt-0.5 leading-snug">{comment.text}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 ml-3">
                                                            <span className="text-[11px] text-base-content/35">{timeAgo(comment.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Comment Input */}
                                    <div className="flex gap-2 items-center">
                                        <img src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')} alt="you" className="fb-avatar-sm" />
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                className="fb-comment-input"
                                                placeholder="মন্তব্য লিখুন..."
                                                value={commentTexts[post._id] || ''}
                                                onChange={(e) => setCommentTexts(prev => ({ ...prev, [post._id]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post._id)}
                                            />
                                            <button
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 disabled:opacity-30 transition-colors"
                                                onClick={() => handleAddComment(post._id)}
                                                disabled={!commentTexts[post._id]?.trim() || commentingOn === post._id}
                                            >
                                                {commentingOn === post._id ? (
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ===== Load More ===== */}
                {hasMore && !loading && posts.length > 0 && (
                    <div className="text-center mt-2 mb-10">
                        <button
                            className="w-full fb-card py-3 text-center text-blue-500 font-semibold text-[15px] hover:brightness-95 transition-all"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="loading loading-spinner loading-sm"></span>
                                    লোড হচ্ছে...
                                </span>
                            ) : 'আরো পোস্ট দেখুন'}
                        </button>
                    </div>
                )}

                {!hasMore && posts.length > 0 && (
                    <div className="text-center text-[13px] text-base-content/25 mt-4 mb-10 py-6">
                        — সব পোস্ট দেখা হয়ে গেছে —
                    </div>
                )}
            </div>

            {/* ===== Toast ===== */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[999] animate-fade-in">
                    <div className={`px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                        {toast.msg}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NewsFeedPage;
