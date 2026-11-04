import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { iOSCard as IOSCard } from '../Components/ios/iOSCard';
import IOSSheet from '../Components/ios/iOSSheet';
import IOSSpinner from '../Components/ios/iOSSpinner';

const API_BASE = 'https://geminiai-render.onrender.com/api/newsfeed';
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like' },
  { key: 'love', emoji: '❤️', label: 'Love' },
  { key: 'haha', emoji: '😂', label: 'Haha' },
  { key: 'wow', emoji: '😮', label: 'Wow' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'angry', emoji: '😡', label: 'Angry' },
];

const getAvatar = (role) => (
  role === 'Admin'
    ? 'https://img.icons8.com/3d-fluency/94/manager.png'
    : 'https://img.icons8.com/3d-fluency/94/student-male--v3.png'
);

async function readResponse(response) {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
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

function PostSkeleton() {
  return (
    <IOSCard className="mb-3 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-base-300 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-32 bg-base-300 rounded animate-pulse mb-1.5" />
          <div className="h-2 w-20 bg-base-300 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 w-full bg-base-300 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-base-300 rounded animate-pulse" />
      </div>
      <div className="h-40 bg-base-300 rounded-xl animate-pulse" />
    </IOSCard>
  );
}

function Composer({ user, onCreated, showToast, mobile = false, onClose }) {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expanded, setExpanded] = useState(mobile);

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.onerror = () => showToast('ছবির preview তৈরি করা যায়নি', 'error');
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadToImgbb = async (file) => {
    if (!IMGBB_API_KEY) {
      showToast('ছবি আপলোডের জন্য ImgBB API key সেট করা নেই', 'error');
      return null;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await readResponse(response);
      if (!data.data?.url) throw new Error('Image upload response did not include a URL');
      return data.data.url;
    } catch (error) {
      console.error('Image upload failed:', error);
      showToast('ছবি আপলোড ব্যর্থ', 'error');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    if (posting || (!text.trim() && !imageFile)) return;
    setPosting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadToImgbb(imageFile);
        if (!imageUrl && !text.trim()) return;
      }

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user._id,
          authorName: user.username,
          authorRole: user.isAdmin ? 'Admin' : 'Student',
          content: text.trim(),
          imageUrl,
        }),
      });
      const data = await readResponse(response);
      if (!data.post) throw new Error('Post response did not include a post');

      onCreated(data.post);
      setText('');
      removeImage();
      setExpanded(!mobile);
      onClose?.();
      showToast('পোস্ট প্রকাশিত হয়েছে ✅');
    } catch (error) {
      console.error('Post creation failed:', error);
      showToast('পোস্ট তৈরি ব্যর্থ', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <IOSCard className="mb-3 p-3">
      <div className="flex items-start gap-3">
        <img
          src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')}
          alt="আপনার avatar"
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex-1 text-left bg-base-200 rounded-full px-4 py-2.5 text-sm text-base-content/50 ios-pressable"
          >
            কি মনে হচ্ছে, {user?.username}?
          </button>
        ) : (
          <div className="flex-1 min-w-0">
            <textarea
              autoFocus
              className="w-full bg-transparent border-none outline-none resize-none text-[15px] min-h-[80px] placeholder:text-base-content/40"
              placeholder={`কি মনে হচ্ছে, ${user?.username}?`}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            {imagePreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden">
                <img src={imagePreview} alt="ছবির preview" className="w-full max-h-64 object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="ছবি সরান"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white text-sm ios-pressable"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-content/10">
              <label className="w-9 h-9 rounded-full hover:bg-green-500/10 flex items-center justify-center cursor-pointer ios-pressable" title="ছবি">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
              <button
                type="button"
                onClick={submit}
                disabled={posting || uploadingImage || (!text.trim() && !imageFile)}
                className="px-5 py-1.5 rounded-full text-sm font-bold text-white transition-all disabled:opacity-40 bg-primary"
              >
                {posting || uploadingImage ? (
                  <span className="flex items-center gap-2">
                    <IOSSpinner size="sm" />
                    {uploadingImage ? 'আপলোড…' : 'পোস্ট…'}
                  </span>
                ) : 'পোস্ট করুন'}
              </button>
            </div>
          </div>
        )}
      </div>
    </IOSCard>
  );
}

function ReactionBar({ post, user, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const holdTimer = useRef(null);
  const didLongPress = useRef(false);
  const userReaction = REACTIONS.find((reaction) => post.reactions?.[reaction.key]?.includes(user?._id));

  const startHold = () => {
    didLongPress.current = false;
    holdTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPickerOpen(true);
    }, 450);
  };

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onMouseEnter={() => setPickerOpen(true)}
        onMouseLeave={() => setTimeout(() => setPickerOpen(false), 350)}
        onTouchStart={startHold}
        onTouchEnd={clearHold}
        onTouchMove={clearHold}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (didLongPress.current) {
            didLongPress.current = false;
            return;
          }
          onReact(post._id, userReaction?.key || 'like');
        }}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold ios-pressable transition-colors ${
          userReaction ? 'text-blue-500' : 'text-base-content/60 hover:bg-base-content/5'
        }`}
        aria-label={userReaction ? userReaction.label : 'Like'}
      >
        <span className="text-base leading-none">{userReaction?.emoji || '👍'}</span>
        <span>{userReaction?.label || 'Like'}</span>
      </button>
      {pickerOpen && (
        <div
          onMouseEnter={() => setPickerOpen(true)}
          onMouseLeave={() => setPickerOpen(false)}
          className="absolute bottom-full left-0 mb-1.5 flex gap-1 px-2 py-1.5 bg-base-100 rounded-full shadow-xl border border-base-content/10 z-50 ios-pop"
        >
          {REACTIONS.map((reaction) => (
            <button
              type="button"
              key={reaction.key}
              onClick={(event) => {
                event.stopPropagation();
                onReact(post._id, reaction.key);
                setPickerOpen(false);
              }}
              className="text-2xl hover:scale-125 transition-transform ios-pressable px-1"
              title={reaction.label}
              aria-label={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, user, onReact, onDelete, onComment, showToast }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const totalReactions = Object.values(post.reactions || {})
    .reduce((sum, reactions) => sum + (reactions?.length || 0), 0);
  const topEmojis = REACTIONS
    .filter((reaction) => post.reactions?.[reaction.key]?.length > 0)
    .sort((a, b) => (post.reactions[b.key]?.length || 0) - (post.reactions[a.key]?.length || 0))
    .slice(0, 3)
    .map((reaction) => reaction.emoji);
  const canDelete = user?._id === post.authorId || user?.isAdmin;
  const commentCount = post.comments?.length || 0;

  const handleComment = async () => {
    if (!commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      const success = await onComment(post._id, commentText.trim());
      if (success) setCommentText('');
    } finally {
      setCommenting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/newsfeed#${post._id}`;
    if (!navigator.clipboard?.writeText) {
      showToast('এই browser-এ লিংক কপি করা যায়নি', 'error');
      return;
    }
    navigator.clipboard.writeText(url)
      .then(() => showToast('লিংক কপি হয়েছে 📋'))
      .catch((error) => {
        console.error('Share link copy failed:', error);
        showToast('কপি ব্যর্থ', 'error');
      });
  };

  return (
    <IOSCard className="mb-3 overflow-hidden">
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <img src={getAvatar(post.authorRole)} alt={post.authorName} className="w-10 h-10 rounded-full" />
            {post.authorRole === 'Admin' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-base-100" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] truncate">
              {post.authorName}
              {post.authorRole === 'Admin' && <span className="ml-1 text-blue-500 text-xs">• Admin</span>}
            </p>
            <p className="text-[11px] text-base-content/50">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        {canDelete && (
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              aria-label="পোস্টের বিকল্প"
              className="w-8 h-8 rounded-full hover:bg-base-200 flex items-center justify-center ios-pressable"
            >
              <svg className="w-4 h-4 text-base-content/50" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            <ul tabIndex={0} className="dropdown-content menu p-1 shadow-xl bg-base-100 rounded-xl w-44 border border-base-content/10 z-50 mt-1">
              <li>
                <button type="button" onClick={() => onDelete(post._id)} className="text-error text-sm rounded-lg">
                  🗑️ ডিলিট
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {post.content && (
        <p className="px-3 pb-2 text-[15px] leading-relaxed whitespace-pre-wrap text-base-content">
          {post.content}
        </p>
      )}
      {post.imageUrl && (
        <a href={post.imageUrl} target="_blank" rel="noreferrer" className="block">
          <img src={post.imageUrl} alt="পোস্টের ছবি" className="w-full max-h-[520px] object-cover ios-pressable" />
        </a>
      )}

      {(totalReactions > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-3 py-2">
          {totalReactions > 0 ? (
            <div className="flex items-center gap-1">
              <div className="flex">
                {topEmojis.map((emoji, index) => (
                  <span
                    key={emoji}
                    className="w-4 h-4 flex items-center justify-center rounded-full bg-base-100 border border-base-100 text-[10px]"
                    style={{ marginLeft: index === 0 ? 0 : -4 }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
              <span className="text-[12px] text-base-content/50">{totalReactions}</span>
            </div>
          ) : <div />}
          {commentCount > 0 && (
            <button
              type="button"
              onClick={() => setCommentsOpen((open) => !open)}
              className="text-[12px] text-base-content/50 ios-pressable"
            >
              {commentCount} মন্তব্য
            </button>
          )}
        </div>
      )}

      <div className="mx-3 border-t border-base-content/10" />
      <div className="flex px-2 py-1">
        <ReactionBar post={post} user={user} onReact={onReact} />
        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-base-content/60 hover:bg-base-content/5 ios-pressable"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          মন্তব্য
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-base-content/60 hover:bg-base-content/5 ios-pressable"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          শেয়ার
        </button>
      </div>

      {commentsOpen && (
        <div className="px-3 pb-3 pt-2 border-t border-base-content/10 ios-fade">
          {post.comments?.length > 0 && (
            <div className="space-y-2.5 max-h-80 overflow-y-auto mb-3">
              {post.comments.map((comment) => (
                <div key={comment.commentId} className="flex gap-2 items-start">
                  <img src={getAvatar(comment.authorRole)} alt={comment.authorName} className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="bg-base-200 rounded-2xl px-3 py-2">
                      <p className="font-semibold text-[12px] text-base-content">
                        {comment.authorName}
                        {comment.authorRole === 'Admin' && <span className="text-blue-500 text-[10px] ml-1 font-normal">• Admin</span>}
                      </p>
                      <p className="text-[13px] text-base-content/80 mt-0.5 leading-snug">{comment.text}</p>
                    </div>
                    <p className="text-[10px] text-base-content/40 mt-1 ml-3">{timeAgo(comment.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <img src={getAvatar(user?.isAdmin ? 'Admin' : 'Student')} alt="আপনার avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="মন্তব্য লিখুন…"
                className="w-full bg-base-200 border-none rounded-full pl-4 pr-11 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleComment();
                }}
              />
              <button
                type="button"
                onClick={handleComment}
                disabled={!commentText.trim() || commenting}
                aria-label="মন্তব্য পাঠান"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-30 ios-pressable"
              >
                {commenting ? <IOSSpinner size="sm" /> : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </IOSCard>
  );
}

export default function NewsFeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const response = await fetch(`${API_BASE}?page=${pageNum}&limit=10`);
      const data = await readResponse(response);
      if (!Array.isArray(data.posts) || !data.pagination) {
        throw new Error('Posts response is missing pagination data');
      }
      setPosts((previous) => (append ? [...previous, ...data.posts] : data.posts));
      setHasMore(Boolean(data.pagination.hasMore));
      setPage(pageNum);
    } catch (error) {
      console.error('Fetching news feed failed:', error);
      showToast('পোস্ট লোড করা যায়নি', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleReact = async (postId, reactionType) => {
    try {
      const response = await fetch(`${API_BASE}/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, reactionType }),
      });
      const data = await readResponse(response);
      if (!data.reactions) throw new Error('Reaction response did not include reactions');
      setPosts((previous) => previous.map((post) => (
        post._id === postId ? { ...post, reactions: data.reactions } : post
      )));
    } catch (error) {
      console.error('Updating reaction failed:', error);
      showToast('রিঅ্যাকশন দেওয়া যায়নি', 'error');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('এই পোস্টটি মুছে ফেলতে চান?')) return;
    try {
      const response = await fetch(`${API_BASE}/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, isAdmin: Boolean(user.isAdmin) }),
      });
      await readResponse(response);
      setPosts((previous) => previous.filter((post) => post._id !== postId));
      showToast('পোস্ট মুছে ফেলা হয়েছে');
    } catch (error) {
      console.error('Deleting post failed:', error);
      showToast('মুছতে ব্যর্থ', 'error');
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const response = await fetch(`${API_BASE}/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user._id,
          authorName: user.username,
          authorRole: user.isAdmin ? 'Admin' : 'Student',
          text,
        }),
      });
      const data = await readResponse(response);
      if (!data.comment) throw new Error('Comment response did not include a comment');
      setPosts((previous) => previous.map((post) => (
        post._id === postId
          ? { ...post, comments: [...(post.comments || []), data.comment] }
          : post
      )));
      return true;
    } catch (error) {
      console.error('Adding comment failed:', error);
      showToast('মন্তব্য যোগ করা যায়নি', 'error');
      return false;
    }
  };

  const addPost = (post) => setPosts((previous) => [post, ...previous]);

  return (
    <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="ios-title">News Feed</h1>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="sm:hidden w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg ios-pressable"
            aria-label="নতুন পোস্ট"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="hidden sm:block">
          <Composer user={user} onCreated={addPost} showToast={showToast} />
        </div>

        {loading && <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>}

        {!loading && posts.length === 0 && (
          <IOSCard className="p-10 text-center">
            <div className="text-5xl mb-3">📝</div>
            <h3 className="ios-headline mb-1">এখনো কোনো পোস্ট নেই</h3>
            <p className="ios-caption">প্রথম পোস্ট করুন!</p>
          </IOSCard>
        )}

        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            user={user}
            onReact={handleReact}
            onDelete={handleDelete}
            onComment={handleComment}
            showToast={showToast}
          />
        ))}

        {hasMore && !loading && posts.length > 0 && (
          <div className="text-center my-4">
            <button
              type="button"
              onClick={() => fetchPosts(page + 1, true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-2xl bg-base-100 text-blue-500 font-semibold text-[15px] ios-pressable disabled:opacity-50"
            >
              {loadingMore ? <IOSSpinner size="sm" /> : 'আরো পোস্ট দেখুন'}
            </button>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-xs text-base-content/30 my-4">— সব পোস্ট দেখা হয়ে গেছে —</p>
        )}
      </div>

      <IOSSheet open={composerOpen} onClose={() => setComposerOpen(false)} title="নতুন পোস্ট">
        <div className="p-4">
          <Composer user={user} onCreated={addPost} showToast={showToast} mobile onClose={() => setComposerOpen(false)} />
        </div>
      </IOSSheet>

      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[999] ios-pop">
          <div className={`px-5 py-2.5 rounded-full shadow-2xl text-sm font-semibold text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
