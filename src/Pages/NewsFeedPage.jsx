import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Context/AuthContext';

const API_BASE = 'https://geminiai-render.onrender.com/api/newsfeed';
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

// Reaction emojis config
const REACTION_TYPES = [
    { key: 'like', emoji: '👍', label: 'Like' },
    { key: 'love', emoji: '❤️', label: 'Love' },
    { key: 'haha', emoji: '😂', label: 'Haha' },
    { key: 'wow', emoji: '😮', label: 'Wow' },
    { key: 'sad', emoji: '😢', label: 'Sad' },
    { key: 'angry', emoji: '😡', label: 'Angry' },
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

    return (
        <div className="min-h-screen bg-base-200/50" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
            <div className="container mx-auto max-w-2xl py-6 px-3 sm:px-4">

                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2.5 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-base-content">নিউজ ফিড</h1>
                        <p className="text-xs text-base-content/50">সবার সাথে শেয়ার করুন</p>
                    </div>
                </div>

                {/* Post Composer Card */}
                <div className="card bg-base-100 shadow-lg border border-base-300/50 mb-6">
                    <div className="card-body p-4">
                        <div className="flex gap-3">
                            <div className="avatar">
                                <div className="w-10 h-10 rounded-full border border-base-300">
                                    <img src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')} alt="avatar" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <textarea
                                    className="textarea textarea-bordered w-full resize-none bg-base-200/50 focus:bg-base-100 transition-colors min-h-[60px] text-sm sm:text-base"
                                    placeholder={`কি মনে হচ্ছে, ${user?.username || 'User'}?`}
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                    rows={2}
                                />

                                {/* Image Preview */}
                                {imagePreview && (
                                    <div className="relative mt-2 inline-block">
                                        <img
                                            src={imagePreview}
                                            alt="preview"
                                            className="max-h-48 rounded-lg border border-base-300 object-cover"
                                        />
                                        <button
                                            className="btn btn-circle btn-xs btn-error absolute top-1 right-1 shadow-lg"
                                            onClick={removeImage}
                                        >✕</button>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3 gap-2">
                                    <div className="flex gap-1">
                                        {/* Image Upload */}
                                        <label className="btn btn-ghost btn-sm gap-1 text-green-500 hover:bg-green-500/10 cursor-pointer">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="hidden sm:inline text-xs">ছবি</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleImageSelect}
                                            />
                                        </label>
                                    </div>

                                    <button
                                        className="btn btn-primary btn-sm px-6 shadow-md hover:shadow-lg transition-all"
                                        onClick={handleCreatePost}
                                        disabled={posting || uploadingImage || (!newPostText.trim() && !newPostImage)}
                                    >
                                        {posting || uploadingImage ? (
                                            <span className="flex items-center gap-2">
                                                <span className="loading loading-spinner loading-xs"></span>
                                                {uploadingImage ? 'আপলোড...' : 'পোস্ট...'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                </svg>
                                                পোস্ট করুন
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feed Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <span className="text-sm text-base-content/50">পোস্ট লোড হচ্ছে...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && posts.length === 0 && (
                    <div className="card bg-base-100 shadow-md border border-base-300/50 p-10 text-center">
                        <div className="text-5xl mb-4">📝</div>
                        <h3 className="text-lg font-bold text-base-content/70">এখনো কোনো পোস্ট নেই</h3>
                        <p className="text-sm text-base-content/50 mt-1">প্রথম পোস্ট করে ফিড শুরু করুন!</p>
                    </div>
                )}

                {/* Posts Feed */}
                <div className="space-y-4">
                    {posts.map((post) => {
                        const userReaction = getUserReaction(post.reactions);
                        const totalReactions = getTotalReactions(post.reactions);
                        const topEmojis = getTopReactionEmojis(post.reactions);
                        const isAuthor = user?._id === post.authorId;
                        const canDelete = isAuthor || user?.isAdmin;

                        return (
                            <div key={post._id} className="card bg-base-100 shadow-md border border-base-300/50 hover:shadow-lg transition-shadow" id={post._id}>
                                <div className="card-body p-4">

                                    {/* Post Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="avatar">
                                                <div className="w-10 h-10 rounded-full border border-base-300">
                                                    <img src={getAvatar(post.authorRole)} alt={post.authorName} />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-base-content">{post.authorName}</span>
                                                    <span className={`badge badge-xs ${post.authorRole === 'Admin' ? 'badge-primary' : 'badge-ghost'}`}>
                                                        {post.authorRole === 'Admin' ? '🛡️ Admin' : '🎓 Student'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-base-content/40">{timeAgo(post.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Delete Menu */}
                                        {canDelete && (
                                            <div className="dropdown dropdown-end">
                                                <label tabIndex={0} className="btn btn-ghost btn-circle btn-xs opacity-40 hover:opacity-100">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="5" r="2" />
                                                        <circle cx="12" cy="12" r="2" />
                                                        <circle cx="12" cy="19" r="2" />
                                                    </svg>
                                                </label>
                                                <ul tabIndex={0} className="dropdown-content menu p-1 shadow-lg bg-base-100 rounded-lg w-40 border border-base-300 z-50">
                                                    <li>
                                                        <button
                                                            className="text-error text-sm"
                                                            onClick={() => handleDeletePost(post._id)}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            মুছে ফেলুন
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Post Content */}
                                    <p className="text-sm sm:text-base text-base-content mt-2 whitespace-pre-wrap leading-relaxed">
                                        {post.content}
                                    </p>

                                    {/* Post Image */}
                                    {post.imageUrl && (
                                        <div className="mt-3 -mx-4">
                                            <img
                                                src={post.imageUrl}
                                                alt="post"
                                                className="w-full max-h-[500px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                onClick={() => window.open(post.imageUrl, '_blank')}
                                            />
                                        </div>
                                    )}

                                    {/* Reaction Summary */}
                                    {totalReactions > 0 && (
                                        <div className="flex items-center gap-1.5 mt-3 px-1">
                                            <div className="flex -space-x-1">
                                                {topEmojis.map((emoji, i) => (
                                                    <span key={i} className="text-sm bg-base-200 rounded-full w-5 h-5 flex items-center justify-center border border-base-100 shadow-sm text-xs">
                                                        {emoji}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-base-content/50">{totalReactions}</span>
                                            {(post.comments?.length || 0) > 0 && (
                                                <span className="text-xs text-base-content/40 ml-auto">
                                                    {post.comments.length} মন্তব্য
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Divider */}
                                    <div className="divider my-1 h-0"></div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between gap-1">
                                        {/* Like/React Button */}
                                        <div className="relative flex-1">
                                            <button
                                                className={`btn btn-ghost btn-sm w-full gap-1.5 text-xs sm:text-sm ${userReaction ? 'text-blue-500 font-semibold' : ''}`}
                                                onClick={() => handleReaction(post._id, 'like')}
                                                onMouseEnter={() => setActiveReactionPicker(post._id)}
                                                onMouseLeave={() => setTimeout(() => setActiveReactionPicker(prev => prev === post._id ? null : prev), 500)}
                                            >
                                                <span className="text-base">{userReaction ? userReaction.emoji : '👍'}</span>
                                                <span className="hidden sm:inline">{userReaction ? userReaction.label : 'Like'}</span>
                                            </button>

                                            {/* Reaction Picker Popup */}
                                            {activeReactionPicker === post._id && (
                                                <div
                                                    className="absolute bottom-full left-0 mb-1 bg-base-100 rounded-full shadow-xl border border-base-300 px-2 py-1.5 flex gap-0.5 z-50 animate-fade-in"
                                                    onMouseEnter={() => setActiveReactionPicker(post._id)}
                                                    onMouseLeave={() => setActiveReactionPicker(null)}
                                                >
                                                    {REACTION_TYPES.map((r) => (
                                                        <button
                                                            key={r.key}
                                                            className="btn btn-ghost btn-circle btn-xs hover:scale-125 transition-transform text-lg tooltip tooltip-top"
                                                            data-tip={r.label}
                                                            onClick={(e) => { e.stopPropagation(); handleReaction(post._id, r.key); }}
                                                        >
                                                            {r.emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Comment Button */}
                                        <button
                                            className="btn btn-ghost btn-sm flex-1 gap-1.5 text-xs sm:text-sm"
                                            onClick={() => setExpandedComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            <span className="hidden sm:inline">মন্তব্য</span>
                                        </button>

                                        {/* Share Button */}
                                        <button
                                            className="btn btn-ghost btn-sm flex-1 gap-1.5 text-xs sm:text-sm"
                                            onClick={() => handleShare(post._id)}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                            <span className="hidden sm:inline">শেয়ার</span>
                                        </button>
                                    </div>

                                    {/* Comments Section */}
                                    {expandedComments[post._id] && (
                                        <div className="mt-2 space-y-3">

                                            {/* Existing Comments */}
                                            {post.comments && post.comments.length > 0 && (
                                                <div className="space-y-2 max-h-64 overflow-y-auto px-1">
                                                    {post.comments.map((comment) => (
                                                        <div key={comment.commentId} className="flex gap-2">
                                                            <div className="avatar">
                                                                <div className="w-7 h-7 rounded-full border border-base-300">
                                                                    <img src={getAvatar(comment.authorRole)} alt={comment.authorName} />
                                                                </div>
                                                            </div>
                                                            <div className="bg-base-200 rounded-xl px-3 py-2 flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-semibold text-xs text-base-content">{comment.authorName}</span>
                                                                    <span className={`badge badge-xs ${comment.authorRole === 'Admin' ? 'badge-primary' : 'badge-ghost'} py-0`}>
                                                                        {comment.authorRole === 'Admin' ? 'Admin' : 'Student'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-base-content/80 mt-0.5 break-words">{comment.text}</p>
                                                                <span className="text-[10px] text-base-content/30 mt-1 block">{timeAgo(comment.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Comment Input */}
                                            <div className="flex gap-2 items-end">
                                                <div className="avatar">
                                                    <div className="w-8 h-8 rounded-full border border-base-300">
                                                        <img src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')} alt="you" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        className="input input-bordered input-sm w-full rounded-full bg-base-200/70 focus:bg-base-100 pr-10 text-sm transition-colors"
                                                        placeholder="মন্তব্য লিখুন..."
                                                        value={commentTexts[post._id] || ''}
                                                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [post._id]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post._id)}
                                                    />
                                                    <button
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 btn btn-ghost btn-circle btn-xs text-primary"
                                                        onClick={() => handleAddComment(post._id)}
                                                        disabled={!commentTexts[post._id]?.trim() || commentingOn === post._id}
                                                    >
                                                        {commentingOn === post._id ? (
                                                            <span className="loading loading-spinner loading-xs"></span>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Load More */}
                {hasMore && !loading && posts.length > 0 && (
                    <div className="text-center mt-6 mb-10">
                        <button
                            className="btn btn-outline btn-primary btn-sm px-8"
                            onClick={loadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? (
                                <span className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-xs"></span>
                                    লোড হচ্ছে...
                                </span>
                            ) : (
                                'আরো দেখুন'
                            )}
                        </button>
                    </div>
                )}

                {!hasMore && posts.length > 0 && (
                    <div className="text-center text-xs text-base-content/30 mt-6 mb-10 py-4">
                        — সব পোস্ট দেখা হয়ে গেছে —
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <div className="toast toast-end toast-bottom z-50">
                    <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg text-sm`}>
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}

            {/* Inline CSS for animation */}
            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out;
        }
      `}</style>
        </div>
    );
}

export default NewsFeedPage;
