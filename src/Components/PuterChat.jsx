import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Bot, User, Trash2, Image as ImageIcon, FileText, X, Plus, MessageSquare, Menu, ChevronLeft, Sparkles, Code, Calculator, PenTool, BarChart3 } from 'lucide-react';
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

export default function PuterChat() {
    // Session State
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Chat State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState('openai/gpt-4o-mini');
    const [files, setFiles] = useState([]);

    const scrollAreaRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

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
    }, []);

    // Persist Sessions
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('puter-chat-sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

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
    const messages = currentSession?.messages || [];

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
            <div className="flex-1 flex flex-col min-w-0 bg-base-100">
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
                    <div className="flex items-center gap-2 text-xs text-base-content/40">
                        <div className={cn(
                            "w-2 h-2 rounded-full transition-colors",
                            "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                        )} />
                        <span className="hidden sm:inline">Ready</span>
                    </div>
                </div>

                {/* ─── Messages Area ─── */}
                <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 flex flex-col gap-3 sm:gap-5">
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
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex gap-3 w-full puter-fade-in",
                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                    style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                                >
                                    {/* AI Avatar */}
                                    {msg.role !== 'user' && (
                                        <div className="shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-xl border border-violet-500/10 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, rgba(139,92,246,0.2), rgba(59,130,246,0.2))' }}>
                                                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            "relative max-w-[88%] sm:max-w-[80%] md:max-w-[70%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 overflow-hidden",
                                            msg.role === 'user'
                                                ? "puter-user-msg rounded-br-md shadow-lg mr-1 md:mr-0 text-white"
                                                : "bg-base-200/60 backdrop-blur-sm text-base-content rounded-bl-md border border-base-content/5"
                                        )}
                                        style={msg.role === 'user' ? { background: 'linear-gradient(to bottom right, #7c3aed, #2563eb)' } : undefined}
                                    >
                                        {/* File Badges */}
                                        {msg.files && msg.files.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2.5">
                                                {msg.files.map((f, i) => (
                                                    <div key={i} className="bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5">
                                                        {f.type.startsWith('image/') ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                                        <span className="truncate max-w-[120px] opacity-80">{f.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Message Content */}
                                        <div className="answer-content text-xs sm:text-sm leading-relaxed w-full min-w-0 break-words overflow-x-auto">
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
                                    {msg.role === 'user' && (
                                        <div className="shrink-0 mt-1">
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to bottom right, #7c3aed, #2563eb)' }}>
                                                <User className="h-3.5 w-3.5 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                        {/* Attached Files */}
                        {files.length > 0 && (
                            <div className="flex gap-2 px-2 mb-2 overflow-x-auto">
                                {files.map((file, i) => (
                                    <div key={i} className="relative group bg-base-200/80 backdrop-blur-sm border border-base-content/5 px-3 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                                        {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-violet-400" /> : <FileText className="h-4 w-4 text-blue-400" />}
                                        <span className="max-w-[130px] truncate text-base-content/70">{file.name}</span>
                                        <button type="button" onClick={() => removeFile(i)} className="ml-0.5 text-base-content/30 hover:text-error transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
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
                                className="min-h-[24px] max-h-[150px] sm:max-h-[200px] resize-none border-none focus-visible:ring-0 shadow-none bg-transparent py-2 sm:py-2.5 px-1.5 sm:px-2 w-full text-sm md:text-sm placeholder:text-base-content/30"
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
