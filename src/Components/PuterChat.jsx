import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Paperclip, Bot, User, Trash2, Image as ImageIcon, FileText, X, Plus, MessageSquare, Menu, ChevronLeft, Sparkles, Code, Calculator, PenTool, BarChart3, RefreshCw } from 'lucide-react';
import MathRenderer from './MathRenderer/MathRenderer';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const MODEL_OPTIONS = [
    { value: 'gpt-5.2', label: 'GPT-5.2' },
    { value: 'gpt-5.2-chat', label: 'GPT-5.2 Chat' },
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
    { value: 'gpt-5.1', label: 'GPT-5.1' },
    { value: 'gpt-5.1-chat-latest', label: 'GPT-5.1 Chat Latest' },
    { value: 'gpt-5.1-codex', label: 'GPT-5.1 Codex' },
    { value: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max' },
    { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1 Codex Mini' },
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano' },
    { value: 'gpt-5-chat-latest', label: 'GPT-5 Chat Latest' },
    { value: 'openai/gpt-4o', label: 'GPT-4o (OpenAI)' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'meta/llama-3-70b', label: 'Llama 3 70B' },
    { value: 'mistral/mistral-large', label: 'Mistral Large' },
    { value: 'perplexity/llama-3-sonar-large-32k-online', label: 'Perplexity Online' }
];

const SUGGESTION_CARDS = [
    { icon: Code, label: 'Code Help', prompt: 'Help me write a function that', bg: 'linear-gradient(to bottom right, rgba(139,92,246,0.15), rgba(99,102,241,0.15))', iconColor: 'text-violet-400' },
    { icon: Calculator, label: 'Math Solver', prompt: 'Solve this math problem:', bg: 'linear-gradient(to bottom right, rgba(59,130,246,0.15), rgba(6,182,212,0.15))', iconColor: 'text-blue-400' },
    { icon: PenTool, label: 'Creative Writing', prompt: 'Write a creative story about', bg: 'linear-gradient(to bottom right, rgba(236,72,153,0.15), rgba(244,63,94,0.15))', iconColor: 'text-pink-400' },
    { icon: BarChart3, label: 'Analysis', prompt: 'Analyze the following data:', bg: 'linear-gradient(to bottom right, rgba(16,185,129,0.15), rgba(20,184,166,0.15))', iconColor: 'text-emerald-400' },
];

function getSessionDateGroup(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This Week';
    return 'Older';
}

// Extract image URL from message content (for preview)
function getImageUrl(msg) {
    if (Array.isArray(msg.content)) {
        const imgPart = msg.content.find(c => c.type === 'image_url');
        if (imgPart?.image_url?.url) return imgPart.image_url.url;
    }
    return null;
}

// Memoized message bubble to prevent re-renders on input change
const MessageBubble = React.memo(({ msg, idx }) => {
    const isUser = msg.role === 'user';
    const imageUrl = isUser ? getImageUrl(msg) : null;

    return (
        <div
            className={cn(
                "flex gap-2 sm:gap-3 puter-fade-in w-full",
                isUser ? "justify-end pl-4 sm:pl-10" : "justify-start pr-4 sm:pr-10"
            )}
            style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
        >
            {/* AI Avatar */}
            {!isUser && (
                <div className="shrink-0 mt-1 hidden sm:block">
                    <div className="w-8 h-8 rounded-xl border border-violet-500/10 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgba(139,92,246,0.2), rgba(59,130,246,0.2))' }}>
                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                </div>
            )}

            <div
                className={cn(
                    "relative rounded-2xl min-w-0 overflow-hidden",
                    isUser
                        ? "puter-user-msg rounded-br-md shadow-lg text-white"
                        : "bg-base-200/60 backdrop-blur-sm text-base-content rounded-bl-md border border-base-content/5"
                )}
                style={{
                    ...(isUser ? { background: 'linear-gradient(135deg, #7c3aed, #2563eb)' } : {})
                }}
            >
                {/* Image Preview */}
                {imageUrl && (
                    <div style={{ padding: '6px 6px 0' }}>
                        <img
                            src={imageUrl}
                            alt="Uploaded"
                            style={{
                                width: '100%',
                                maxHeight: '200px',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                display: 'block',
                            }}
                        />
                    </div>
                )}

                {/* File Badges (non-image files) */}
                {msg.files && msg.files.length > 0 && !imageUrl && (
                    <div style={{ padding: '8px 12px 0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {msg.files.map((f, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                maxWidth: '100%',
                                overflow: 'hidden',
                            }}>
                                {f.type.startsWith('image/') ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', opacity: 0.8 }}>{f.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Message Content */}
                <div
                    className="answer-content text-xs sm:text-sm"
                    style={{
                        padding: '10px 12px',
                        lineHeight: '1.7',
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        scrollbarWidth: 'none',
                    }}
                >
                    <MathRenderer
                        text={typeof msg.content === 'string'
                            ? msg.content
                            : (Array.isArray(msg.content)
                                ? msg.content.find(c => c.type === 'text' || c.type === 'input_text')?.text || msg.content.find(c => c.type === 'text')?.text || ''
                                : '')}
                    />
                </div>
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="shrink-0 mt-1 hidden sm:block">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #7c3aed, #2563eb)' }}>
                        <User className="h-3.5 w-3.5 text-white" />
                    </div>
                </div>
            )}
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble';

export default function PuterChat() {
    // Session State
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [puterUser, setPuterUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);

    // Chat State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState(() => {
        return localStorage.getItem('puter-chat-model') || 'openai/gpt-4o-mini';
    });
    const [files, setFiles] = useState([]);

    const scrollAreaRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    const loadPuterUser = async () => {
        try {
            const getUser = window.puter?.auth?.getUser;
            if (typeof getUser === 'function') {
                const user = await getUser();
                setPuterUser(user || null);
                return user || null;
            }

            const staticUser = window.puter?.auth?.user || null;
            setPuterUser(staticUser);
            return staticUser;
        } catch (err) {
            console.warn('Failed to load Puter user:', err);
            setPuterUser(null);
            return null;
        }
    };

    const ensurePuterAuth = async () => {
        try {
            if (window.puter?.auth?.signIn) {
                await window.puter.auth.signIn({ attempt_temp_user_creation: true });
            }
            await loadPuterUser();
            setAuthReady(true);
        } catch (err) {
            console.warn('Puter auth init failed:', err);
            setAuthReady(false);
        }
    };

    // Client-side cache + in-flight dedupe for Puter.ai calls
    const CACHE_TTL = 120000; // 2 minutes
    const puterCacheRef = useRef(new Map()); // key -> { data, exp }
    const inflightRef = useRef(new Map()); // key -> Promise

    const makeCacheKey = async (args) => {
        try {
            // Serialize the arguments but avoid reading large file contents
            const parts = await Promise.all(args.map(async (a) => {
                if (!a) return a;
                if (a instanceof File) {
                    return { __file: true, name: a.name, size: a.size, type: a.type, lastModified: a.lastModified };
                }
                if (Array.isArray(a)) return a.map(x => (typeof x === 'object' ? JSON.stringify(x) : x));
                if (typeof a === 'object') return JSON.stringify(a);
                return a;
            }));
            const raw = JSON.stringify(parts);
            // short base64 key
            return btoa(unescape(encodeURIComponent(raw)));
        } catch (e) {
            return String(Math.random());
        }
    };

    const getCached = (key) => {
        const map = puterCacheRef.current;
        const hit = map.get(key);
        if (!hit) return null;
        if (Date.now() > hit.exp) {
            map.delete(key);
            return null;
        }
        return hit.data;
    };

    const setCached = (key, data, ttl = CACHE_TTL) => {
        const map = puterCacheRef.current;
        map.set(key, { data, exp: Date.now() + ttl });
    };

    // Initial Load
    useEffect(() => {
        const savedSessions = localStorage.getItem('puter-chat-sessions');
        if (savedSessions) {
            try {
                const parsed = JSON.parse(savedSessions);
                setSessions(parsed);
                if (parsed.length > 0) {
                    setCurrentSessionId(parsed[0].id);
                } else {
                    createNewSession();
                }
            } catch (e) {
                console.error("Failed to parse sessions", e);
                createNewSession();
            }
        } else {
            const legacyHistory = localStorage.getItem('puter-chat-history');
            if (legacyHistory) {
                try {
                    const messages = JSON.parse(legacyHistory);
                    const newSession = {
                        id: Date.now().toString(),
                        title: 'Previous Chat',
                        timestamp: Date.now(),
                        messages: messages
                    };
                    setSessions([newSession]);
                    setCurrentSessionId(newSession.id);
                    localStorage.removeItem('puter-chat-history');
                } catch (e) {
                    createNewSession();
                }
            } else {
                createNewSession();
            }
        }

        // Restore files
        const savedFiles = localStorage.getItem('puter-chat-files');
        if (savedFiles) {
            try {
                const parsedFiles = JSON.parse(savedFiles);
                const restoredFiles = parsedFiles.map(f => {
                    const arr = f.dataUrl.split(',');
                    const mime = arr[0].match(/:(.*?);/)[1];
                    const bstr = atob(arr[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    return new File([u8arr], f.name, { type: mime });
                });
                setFiles(restoredFiles);
            } catch (e) {
                console.error("Failed to parse saved files", e);
            }
        }

        ensurePuterAuth();
    }, []);

    // Persist Sessions
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('puter-chat-sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    // Persist Model
    useEffect(() => {
        localStorage.setItem('puter-chat-model', selectedModel);
    }, [selectedModel]);

    // Persist Files (as base64)
    useEffect(() => {
        const saveFiles = async () => {
            if (files.length === 0) {
                localStorage.removeItem('puter-chat-files');
                return;
            }
            try {
                const fileData = await Promise.all(files.map(file => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve({ name: file.name, type: file.type, dataUrl: e.target.result });
                        reader.readAsDataURL(file);
                    });
                }));
                localStorage.setItem('puter-chat-files', JSON.stringify(fileData));
            } catch (e) {
                console.warn("Storage quota exceeded or error saving files", e);
            }
        };
        saveFiles();
    }, [files]);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [currentSessionId, sessions, isLoading]);

    const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

    const updateCurrentSessionMessages = (newMessages) => {
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                let title = s.title;
                if (s.title === 'New Chat' && newMessages.length > 0) {
                    const firstUserMsg = newMessages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        let msgText = '';
                        if (typeof firstUserMsg.content === 'string') {
                            msgText = firstUserMsg.content;
                        } else if (Array.isArray(firstUserMsg.content)) {
                            const textPart = firstUserMsg.content.find(c => c.type === 'text' || c.type === 'input_text');
                            msgText = textPart?.text || 'Image Chat';
                        }
                        title = msgText.slice(0, 30) + (msgText.length > 30 ? '...' : '');
                    }
                }
                return { ...s, messages: newMessages, title, timestamp: Date.now() };
            }
            return s;
        }));
    };

    const createNewSession = () => {
        const newSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            timestamp: Date.now(),
            messages: []
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMobileMenuOpen(false);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };
    
    const refreshPuterSession = async () => {
        try {
            // Sign out current session if available
            if (window.puter?.auth?.logout) {
                await window.puter.auth.logout();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Re-authenticate with temp user onboarding support
            await ensurePuterAuth();

            // Clear puter-related storage (keep chat history/model prefs)
            const keys = Object.keys(localStorage).filter(k => k.includes('puter') || k.includes('auth'));
            keys.forEach(k => {
                if (!k.includes('chat')) localStorage.removeItem(k);
            });

            setInput('');
            setFiles([]);
            setIsLoading(false);
            createNewSession();
        } catch (err) {
            console.error('Session refresh error:', err);
            createNewSession();
        }
    };

    const deleteSession = (e, id) => {
        e.stopPropagation();
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (currentSessionId === id) {
            if (newSessions.length > 0) {
                setCurrentSessionId(newSessions[0].id);
            } else {
                createNewSession();
            }
        }
        localStorage.setItem('puter-chat-sessions', JSON.stringify(newSessions));
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSuggestionClick = (prompt) => {
        setInput(prompt);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // Retry wrapper matching the working HTML pattern — puter.ai.chat handles auth internally
    const chatWithRetry = async (...args) => {
        const maxRetries = 3;
        await ensurePuterAuth();
        // Determine if this call requests streaming
        const opts = args.find(a => a && typeof a === 'object' && (a.stream !== undefined || a.model !== undefined));
        const isStream = opts && opts.stream === true;

        // For non-stream calls, attempt client-side cache & dedupe
        if (!isStream) {
            const key = await makeCacheKey(args);
            const cached = getCached(key);
            if (cached) {
                return cached; // return cached final response (string/object)
            }

            if (inflightRef.current.has(key)) {
                return await inflightRef.current.get(key);
            }

            const p = (async () => {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        const res = await window.puter.ai.chat(...args);
                        // store non-iterable (final) responses in cache
                        setCached(key, res);
                        return res;
                    } catch (error) {
                        if (attempt < maxRetries) {
                            console.log(`Puter API call failed, retrying... (${attempt}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            throw error;
                        }
                    }
                }
            })();

            inflightRef.current.set(key, p);
            try {
                const out = await p;
                return out;
            } finally {
                inflightRef.current.delete(key);
            }
        }

        // Streamed calls: do not cache or dedupe, just retry
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await window.puter.ai.chat(...args);
            } catch (error) {
                if (attempt < maxRetries) {
                    console.log(`Puter API call failed, retrying... (${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw error;
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ((!input.trim() && files.length === 0) || isLoading) return;

        const currentSession = getCurrentSession();
        if (!currentSession) return;

        let userMsgContent;
        const currentFiles = [...files];
        const imageFile = currentFiles.find(f => f.type.startsWith('image/'));

        if (imageFile) {
            userMsgContent = [
                { type: 'text', text: input || "Analyze this image" },
                { type: 'image_url', image_url: { url: URL.createObjectURL(imageFile) } }
            ];
        } else {
            userMsgContent = input;
        }

        const userMsg = {
            role: 'user',
            content: userMsgContent,
            files: currentFiles.map(f => ({ name: f.name, type: f.type }))
        };

        const updatedMessages = [...currentSession.messages, userMsg];
        updateCurrentSessionMessages(updatedMessages);

        setInput('');
        setFiles([]);
        setIsLoading(true);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        try {
            let response;

            if (imageFile) {
                // Use raw File object like the working HTML version
                const historyText = updatedMessages.slice(0, -1).map(m => {
                    const role = m.role === 'user' ? 'User' : 'Assistant';
                    let content = '';
                    if (typeof m.content === 'string') content = m.content;
                    else if (Array.isArray(m.content)) {
                        content = m.content
                            .filter(c => c.type === 'text' || c.type === 'input_text' || (!c.type && typeof c === 'string'))
                            .map(c => c.text || c).join('\n');
                    }
                    return `${role}: ${content}`;
                }).join('\n\n');

                const prompt = `${historyText}\n\nUser: ${input || "Analyze this image"}`;
                // Pass raw File object directly — NOT base64
                response = await chatWithRetry(prompt, imageFile, { model: selectedModel, stream: true });

            } else {
                const apiMessages = updatedMessages.map(({ files, ...msg }) => {
                    let contentStr = '';
                    if (typeof msg.content === 'string') {
                        contentStr = msg.content;
                    } else if (Array.isArray(msg.content)) {
                        contentStr = msg.content
                            .filter(c => c.type === 'text' || c.type === 'input_text' || (!c.type && typeof c === 'string'))
                            .map(c => c.text || c)
                            .join('\n');
                        if (!contentStr.trim()) contentStr = "[Image uploaded]";
                    }
                    return { role: msg.role, content: contentStr };
                });

                response = await chatWithRetry(apiMessages, { model: selectedModel, stream: true });
            }

            // Handle streaming response (like the working HTML version)
            let fullResponse = '';
            if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const part of response) {
                    if (part?.text) {
                        fullResponse += part.text;
                    }
                }
            } else {
                // Fallback for non-streaming response
                fullResponse = typeof response === 'string' ? response : response?.message?.content || JSON.stringify(response);
            }

            const aiMsg = {
                role: 'assistant',
                content: fullResponse
            };

            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return { ...s, messages: [...updatedMessages, aiMsg], timestamp: Date.now() };
                }
                return s;
            }));

        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                role: 'assistant',
                content: `Error: ${error.message || 'Failed to get response'}`
            };
            setSessions(prev => prev.map(s => {
                if (s.id === currentSessionId) {
                    return { ...s, messages: [...updatedMessages, errorMsg], timestamp: Date.now() };
                }
                return s;
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const currentSession = getCurrentSession();
    const messages = useMemo(() => currentSession?.messages || [], [currentSession?.messages]);
    const userStatus = useMemo(() => {
        if (!authReady) {
            return { dotClass: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]', label: 'Auth...', detail: 'Authenticating with Puter' };
        }

        if (!puterUser) {
            return { dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]', label: 'Ready', detail: 'Ready (user info unavailable)' };
        }

        if (puterUser.is_temp) {
            return {
                dotClass: 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]',
                label: 'Guest',
                detail: `Guest user: ${puterUser.username || puterUser.uuid || 'temp'}`
            };
        }

        return {
            dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]',
            label: puterUser.username ? `@${puterUser.username}` : 'Signed In',
            detail: puterUser.uuid ? `UUID: ${puterUser.uuid}` : 'Signed in user'
        };
    }, [authReady, puterUser]);

    // Group sessions by date
    const groupedSessions = sessions.reduce((groups, session) => {
        const group = getSessionDateGroup(session.timestamp);
        if (!groups[group]) groups[group] = [];
        groups[group].push(session);
        return groups;
    }, {});
    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

    // ──────────────── SIDEBAR CONTENT (shared desktop/mobile) ────────────────
    const SidebarContent = ({ isMobile = false }) => (
        <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-base-content/5">
                <div className="flex items-center gap-2.5 mb-4 px-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #8b5cf6, #3b82f6)' }}>
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-base tracking-tight">AI Chat</span>
                </div>
                <Button
                    onClick={createNewSession}
                    className="w-full justify-start gap-2.5 h-10 rounded-xl border border-violet-500/20 text-base-content shadow-none transition-all duration-200 hover:opacity-80"
                    variant="ghost"
                    style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.1), rgba(59,130,246,0.1))' }}
                >
                    <Plus className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-medium">New Chat</span>
                </Button>
                <Button
                    onClick={refreshPuterSession}
                    className="w-full justify-start gap-2.5 h-10 rounded-xl border border-blue-500/20 text-base-content shadow-none transition-all duration-200 hover:opacity-80"
                    variant="ghost"
                    style={{ background: 'linear-gradient(to right, rgba(59,130,246,0.1), rgba(34,197,94,0.1))' }}
                    title="Refresh authentication session with Puter.js"
                >
                    <RefreshCw className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Refresh Session</span>
                </Button>
            </div>

            {/* Session List */}
            <ScrollArea className="flex-1 puter-scrollbar">
                <div className="p-2 flex flex-col gap-0.5">
                    {groupOrder.map(group => {
                        const groupSessions = groupedSessions[group];
                        if (!groupSessions || groupSessions.length === 0) return null;
                        return (
                            <div key={group}>
                                <div className="px-3 py-2 mt-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">{group}</span>
                                </div>
                                {groupSessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => {
                                            setCurrentSessionId(session.id);
                                            if (isMobile) setMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200",
                                            "hover:bg-base-content/5",
                                            currentSessionId === session.id
                                                ? "bg-base-content/8 puter-session-active"
                                                : "opacity-70 hover:opacity-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 truncate overflow-hidden min-w-0">
                                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-base-content/40" />
                                            <span className="truncate text-[13px]">{session.title}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-6 w-6 shrink-0 rounded-md transition-all duration-200",
                                                isMobile ? "opacity-60" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                                            )}
                                            onClick={(e) => deleteSession(e, session.id)}
                                        >
                                            <Trash2 className="h-3 w-3 text-base-content/50 hover:text-error" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-base-content/5">
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-base-content/30">
                    <Sparkles className="h-3 w-3" />
                    <span>Powered by Puter.js</span>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-[calc(100dvh-64px)] w-full overflow-hidden relative bg-base-100" style={{ touchAction: 'manipulation' }}>
            {/* ═══════════ Desktop Sidebar ═══════════ */}
            <div className={cn(
                "hidden md:flex flex-col border-r border-base-content/5 bg-base-200/30 transition-all duration-300 ease-in-out",
                sidebarOpen ? "w-72" : "w-0 border-none overflow-hidden"
            )}>
                <SidebarContent />
            </div>

            {/* ═══════════ Mobile Sidebar Overlay ═══════════ */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden puter-fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <div
                        className="h-full w-[280px] bg-base-100 border-r border-base-content/10 shadow-2xl flex flex-col puter-fade-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Mobile Close */}
                        <div className="absolute top-3 right-3 z-10">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <SidebarContent isMobile />
                    </div>
                </div>
            )}

            {/* ═══════════ Main Chat Area ═══════════ */}
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden bg-base-100">
                {/* ─── Header ─── */}
                <div className="h-12 sm:h-14 border-b border-base-content/5 flex items-center justify-between px-2 sm:px-3 md:px-4 bg-base-100/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-1.5">
                        {/* Mobile hamburger */}
                        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-lg" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        {/* Desktop sidebar toggle */}
                        <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 rounded-lg" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>

                        {/* Divider */}
                        <div className="w-px h-5 bg-base-content/10 mx-1 hidden md:block" />

                        {/* Model Selector */}
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="w-[130px] sm:w-[180px] h-8 sm:h-9 text-xs sm:text-sm border-none shadow-none focus:ring-0 bg-base-content/5 hover:bg-base-content/8 rounded-lg transition-colors">
                                <SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-base-content/10 bg-base-100 shadow-xl">
                                {MODEL_OPTIONS.map(model => (
                                    <SelectItem key={model.value} value={model.value} className="rounded-lg">
                                        {model.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status dot */}
                    <div className="flex items-center gap-2 text-xs text-base-content/40" title={userStatus.detail}>
                        <div className={cn(
                            "w-2 h-2 rounded-full transition-colors",
                            userStatus.dotClass
                        )} />
                        <span className="hidden sm:inline">{userStatus.label}</span>
                    </div>
                </div>

                {/* ─── Messages Area ─── */}
                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 flex flex-col gap-3 sm:gap-5 overflow-x-hidden">
                        {messages.length === 0 ? (
                            /* ═══ Empty State ═══ */
                            <div className="flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[55vh] text-center puter-fade-in px-2">
                                {/* Floating icon */}
                                <div className="puter-float mb-4 sm:mb-6">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl border border-violet-500/10 flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, rgba(139,92,246,0.2), rgba(59,130,246,0.2))' }}>
                                        <Sparkles className="h-7 w-7 sm:h-9 sm:w-9 text-violet-400/80" />
                                    </div>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #a78bfa, #60a5fa)' }}>
                                    What can I help with?
                                </h3>
                                <p className="text-xs sm:text-sm text-base-content/40 max-w-sm mb-5 sm:mb-8">
                                    Ask me anything — code, math, writing, analysis, and more.
                                </p>
                                {/* Suggestion Cards */}
                                <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-md">
                                    {SUGGESTION_CARDS.map((card) => (
                                        <button
                                            key={card.label}
                                            onClick={() => handleSuggestionClick(card.prompt)}
                                            className="suggestion-card flex flex-col items-start gap-1.5 sm:gap-2.5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-base-content/5 text-left cursor-pointer group"
                                            style={{ background: card.bg }}
                                        >
                                            <card.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", card.iconColor)} />
                                            <span className="text-xs sm:text-sm font-medium text-base-content/80 group-hover:text-base-content transition-colors">
                                                {card.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* ═══ Message List ═══ */
                            messages.map((msg, idx) => (
                                <MessageBubble key={idx} msg={msg} idx={idx} />
                            ))
                        )}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="flex gap-3 w-full justify-start puter-fade-in">
                                <div className="shrink-0 mt-1">
                                    <div className="w-8 h-8 rounded-xl border border-violet-500/10 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgba(139,92,246,0.2), rgba(59,130,246,0.2))' }}>
                                        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                                    </div>
                                </div>
                                <div className="bg-base-200/60 backdrop-blur-sm rounded-2xl rounded-bl-md border border-base-content/5 px-5 py-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-violet-400/70 rounded-full typing-dot-1"></span>
                                    <span className="w-2 h-2 bg-violet-400/50 rounded-full typing-dot-2"></span>
                                    <span className="w-2 h-2 bg-violet-400/30 rounded-full typing-dot-3"></span>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* ─── Input Area ─── */}
                <div className="p-2 sm:p-3 md:p-4 pb-[env(safe-area-inset-bottom,8px)]" style={{ background: 'linear-gradient(to top, var(--color-base-100) 0%, var(--color-base-100) 50%, transparent 100%)' }}>
                    <div className="max-w-3xl mx-auto">
                        {/* Attached Files Preview */}
                        {files.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-2 pb-2">
                                {files.map((file, i) => {
                                    const isImage = file.type.startsWith('image/');
                                    // Make sure we have a valid dataUrl or blob URL to show preview
                                    const previewUrl = file.dataUrl || URL.createObjectURL(file);
                                    return (
                                        <div key={i} className="relative group bg-base-200/90 backdrop-blur-md border border-base-content/10 rounded-xl flex items-center shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                                            {isImage ? (
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 bg-base-300">
                                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 bg-base-300 flex items-center justify-center">
                                                    <FileText className="h-5 w-5 text-blue-400" />
                                                </div>
                                            )}
                                            <div className="px-3 py-2 flex flex-col justify-center min-w-0 pr-8">
                                                <span className="text-xs sm:text-sm font-medium text-base-content truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                                                <span className="text-[10px] text-base-content/50 uppercase">{file.type.split('/')[1] || 'FILE'}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(i)}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-black/20 hover:bg-error/80 text-white rounded-full transition-colors backdrop-blur-md"
                                                aria-label="Remove attached file"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Input Form */}
                        <form
                            onSubmit={handleSubmit}
                            className="relative flex items-end gap-1.5 sm:gap-2 bg-base-200/50 backdrop-blur-xl p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-base-content/8 focus-within:border-violet-500/30 focus-within:shadow-[0_0_15px_rgba(124,58,237,0.08)] transition-all duration-300"
                        >
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 rounded-xl text-base-content/40 hover:text-violet-400 hover:bg-violet-500/10 h-9 w-9 mb-0.5 ml-0.5 transition-all duration-200"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />

                            <Textarea
                                ref={textareaRef}
                                placeholder="Ask anything..."
                                className="min-h-[24px] max-h-[150px] sm:max-h-[200px] resize-none border-none focus-visible:ring-0 shadow-none bg-transparent py-2 sm:py-2.5 px-1.5 sm:px-2 w-full text-sm md:text-sm text-base-content placeholder:text-base-content/30 caret-base-content"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />

                            <Button
                                type="submit"
                                size="icon"
                                className={cn(
                                    "shrink-0 rounded-xl h-9 w-9 mb-0.5 mr-0.5 transition-all duration-300",
                                    (!input.trim() && files.length === 0)
                                        ? "bg-base-content/5 text-base-content/20 cursor-not-allowed"
                                        : "text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-105"
                                )}
                                style={(!input.trim() && files.length === 0) ? {} : { background: 'linear-gradient(to right, #7c3aed, #2563eb)' }}
                                disabled={isLoading || (!input.trim() && files.length === 0)}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>

                        <div className="text-center mt-2.5">
                            <p className="text-[10px] text-base-content/25">AI can make mistakes. Verify important information.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
