import React, { useState, useMemo, useRef } from 'react';
import MathRendererWithContext from '../MathRenderer/MathRenderer';
import { toPng } from 'html-to-image';
import { sha256 } from 'js-sha256';
import SavedAnswerGalleryMongoDB from './SavedAnswerGalleryMongoDB';
import { useAuth } from '../../Context/AuthContext';

const API_base = 'https://geminiai-render.onrender.com/api/saved_answers';

const AI_MODELS = [
    { value: 'gemmy', label: 'জেমি: দ্যা টিচার', api: 'https://geminiai-render.onrender.com/api/gemmy/generate', type: 'formdata' },
    { value: 'merlin', label: 'মিস মার্লিন: দ্যা টিউটর', api: 'https://geminiai-render.onrender.com/api/merlin/v1/chat/completions', type: 'merlin' },
    { value: 'luzia', label: 'Luzia: দ্যা প্রফেসর', api: 'https://geminiai-render.onrender.com/api/luzia/ask', type: 'luzia' },
    { value: 'hmtai', label: 'H.M. Tutoring AI', api: 'https://geminiai-render.onrender.com/api/ai-free-api', type: 'hmtai' },
    { value: 'assistant', label: 'Knowledge Master', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemini-3-flash-preview' },
    { value: 'chatbot', label: 'AI Chat Bot', api: 'https://geminiai-render.onrender.com/api/chat/send', type: 'chatbot' },
    { value: 'easemate', label: 'Problem Solver', api: 'https://geminiai-render.onrender.com/api/easemate', type: 'easemate' },
    { value: 'borno', label: 'Academic Assistant', api: 'https://geminiai-render.onrender.com/api/bornoai', type: 'borno' },
    { value: 'doubt', label: 'Concept Builder', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemini-2.5-flash-lite' },
];

function AskAIModalMongoDB({ isOpen, onClose, questionText = '', stemText = '', imageUrl = '', source = '', marks = '', finalAnswer = '', steps = '', subjectName = '', chapterName = '', className = '' }) {
    const { user } = useAuth();
    const [selectedModel, setSelectedModel] = useState('gemmy');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloadingAnswer, setDownloadingAnswer] = useState(false);
    const questionPreviewRef = useRef(null);
    const visibleAnswerRef = useRef(null);

    // MongoDB Save functionality
    const [savingToDB, setSavingToDB] = useState(false);
    const [dbSaveMsg, setDbSaveMsg] = useState('');
    const galleryRefreshRef = useRef(null); // To trigger gallery refresh

    // Question fingerprint for Storage
    const questionHash = useMemo(() => {
        const raw = (questionText || '') + '|||' + (stemText || '');
        return raw.trim() ? sha256(raw) : '';
    }, [questionText, stemText]);

    // ImgBB Upload
    const uploadToImgBB = async (dataUrl) => {
        const formData = new FormData();
        formData.append('key', import.meta.env.VITE_IMGBB_API_KEY);
        // Convert Base64 dataURL to Blob
        const blob = await (await fetch(dataUrl)).blob();
        formData.append('image', blob);

        const res = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (data.success) {
            return data.data.url;
        }
        throw new Error('ImgBB Upload Failed');
    };

    // ─── Save to MongoDB ───
    const saveToDB = async () => {
        if (!visibleAnswerRef.current || !user) return;
        setSavingToDB(true);
        setDbSaveMsg('');
        try {
            // New: Capture answer as image and upload to ImgBB
            const dataUrl = await captureToDataUrl();
            const imgbbUrl = await uploadToImgBB(dataUrl);

            // Get current model label
            const modelConfig = AI_MODELS.find(m => m.value === selectedModel);
            const modelLabel = modelConfig ? modelConfig.label : selectedModel;

            // Send to backend
            const res = await fetch(`${API_base}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id,
                    username: user.username,
                    questionHash,
                    questionText: '', // Not storing full text (as requested to save space)
                    stemText: '', // Not storing stem text
                    source,
                    marks,
                    answerText: null, // Set null to force Gallery to use Image Mode
                    modelUsed: modelLabel,
                    imageBase64: imgbbUrl, // Save ImgBB URL here
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Save failed');
            }

            setDbSaveMsg('✅ Saved successfully!');
            // Refresh gallery
            if (galleryRefreshRef.current) galleryRefreshRef.current();
        } catch (err) {
            console.error('Save error:', err);
            setDbSaveMsg('❌ ' + (err.message || 'Save failed'));
        } finally {
            setSavingToDB(false);
            setTimeout(() => setDbSaveMsg(''), 5000);
        }
    };

    const fullQuestion = useMemo(() => {
        let q = '';
        if (stemText) q += `উদ্দীপক: ${stemText}\n\n`;
        if (questionText) q += questionText;
        if (marks) q += `\n\n[মান: ${marks} নম্বর]`;
        if (finalAnswer) q += `\n\n[সঠিক উত্তর/ইঙ্গিত: ${finalAnswer}]`;
        if (steps) q += `\n\n[সমাধানের ধাপ/সূত্র: ${steps}]`;
        if (source) q += `\n\n(সোর্স: ${source})`;
        return q.trim();
    }, [questionText, stemText, source, marks, finalAnswer, steps]);

    // Compress image via canvas (reduce size for API calls)
    const compressImage = (blob, { maxWidth = 800, maxHeight = 800, quality = 0.85 } = {}) => {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                let { width, height } = img;
                const scale = Math.min(1, maxWidth / width, maxHeight / height);
                // Only compress if image needs resizing (too large)
                if (scale >= 1) { resolve(blob); return; }
                width = Math.round(width * scale); height = Math.round(height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
                canvas.toBlob((b) => resolve(b || blob), mime, quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
            img.src = url;
        });
    };

    // Fetch image URL, compress, and convert to File for FormData
    const fetchImageAsFile = async (url) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const blob = await resp.blob();
            const compressed = await compressImage(blob);
            const ext = compressed.type === 'image/png' ? 'png' : 'jpg';
            return new File([compressed], `question_image.${ext}`, { type: compressed.type || 'image/jpeg' });
        } catch {
            return null;
        }
    };

    // Convert image URL to data URI for JSON APIs
    const fetchImageAsDataUri = async (url) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) return null;
            const blob = await resp.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch {
            return null;
        }
    };

    // Parse SSE stream for gemma-style APIs
    const parseSSEStream = async (resp) => {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let answerText = '';
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                    const json = JSON.parse(jsonStr);
                    const parts = json?.candidates?.[0]?.content?.parts;
                    if (Array.isArray(parts)) {
                        for (const p of parts) {
                            if (p?.text) answerText += p.text;
                        }
                    }
                } catch { /* skip */ }
            }
        }
        return answerText;
    };

    const buildPrompt = (userQuestion) => {
        return `আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**

**গুরুত্বপূর্ণ formatting নিয়ম:**
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো
- Math expressions এর আগে বা পরে অনর্থক line break দিও না

**কোনো ধরনের সম্ভাষণ ব্যবহার করবে না, সরাসরি উত্তর দাও।**

**যদি প্রশ্নে মান (নম্বর) এবং সঠিক উত্তর/ইঙ্গিত দেওয়া থাকে, সেটি মাথায় রেখে মান অনুযায়ী উত্তরের দৈর্ঘ্য ও গভীরতা নির্ধারণ করো। সঠিক উত্তরের সাথে মিলিয়ে ধাপে ধাপে ব্যাখ্যা দাও।**

নিচের প্রশ্নটি ধাপে ধাপে সমাধান করো:

${userQuestion}`;
    };

    const handleAsk = async () => {
        if (!fullQuestion) return;
        setLoading(true);
        setAnswer('');

        const modelConfig = AI_MODELS.find(m => m.value === selectedModel) || AI_MODELS[0];
        const prompt = buildPrompt(fullQuestion);

        try {
            let answerText = '';

            if (modelConfig.type === 'formdata') {
                // Gemmy API (FormData)
                const formData = new FormData();
                formData.append('text', prompt);
                if (imageUrl) {
                    const imageFile = await fetchImageAsFile(imageUrl);
                    if (imageFile) formData.append('image', imageFile);
                }
                const resp = await fetch(modelConfig.api, { method: 'POST', body: formData });
                const data = await resp.json();
                if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    answerText = data.candidates[0].content.parts[0].text;
                }
            } else if (modelConfig.type === 'merlin') {
                // Merlin API (FormData with OpenAI-style request)
                const openaiReq = {
                    model: 'gemini-3.0-flash',
                    messages: [
                        { role: 'system', content: 'আপনি একজন দক্ষ বাংলা শিক্ষক। উত্তর বাংলায় দিন, গাণিতিক অংশ $...$ এ লিখুন।' },
                        { role: 'user', content: prompt }
                    ],
                    stream: false
                };
                const formData = new FormData();
                formData.append('data', JSON.stringify(openaiReq));
                if (imageUrl) {
                    const imageFile = await fetchImageAsFile(imageUrl);
                    if (imageFile) formData.append('image', imageFile);
                }
                const resp = await fetch(modelConfig.api, { method: 'POST', body: formData });
                const data = await resp.json();
                if (data?.choices?.[0]?.message?.content) {
                    answerText = data.choices[0].message.content;
                }
            } else if (modelConfig.type === 'luzia') {
                // Luzia API (FormData)
                const formData = new FormData();
                formData.append('prompt', prompt);
                formData.append('personalityId', 'professor');
                if (imageUrl) {
                    const imageFile = await fetchImageAsFile(imageUrl);
                    if (imageFile) formData.append('images', imageFile);
                }
                const resp = await fetch(modelConfig.api, { method: 'POST', body: formData });
                const data = await resp.json();
                if (data?.content) {
                    answerText = data.content;
                }
            } else if (modelConfig.type === 'hmtai') {
                // HMTAI API (FormData + streaming)
                const formData = new FormData();
                formData.append('conversation_id', crypto.randomUUID?.() || Date.now().toString());
                formData.append('message_id', crypto.randomUUID?.() || Date.now().toString());
                formData.append('content', prompt);
                formData.append('model', 'gemini-2.5-flash');
                formData.append('max_mode', 'true');
                if (imageUrl) {
                    const imageFile = await fetchImageAsFile(imageUrl);
                    if (imageFile) formData.append('attachments', imageFile);
                }
                const resp = await fetch(modelConfig.api, { method: 'POST', body: formData });
                if (!resp.ok) throw new Error('API Error: ' + resp.status);
                const reader = resp.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let chunks = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks += decoder.decode(value, { stream: true });
                }
                // Parse streamed chunks
                for (const line of chunks.split('\n')) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const obj = JSON.parse(trimmed);
                        if (obj.type === 'text_delta' && obj.data) answerText += obj.data;
                    } catch { /* skip non-JSON lines */ }
                }
            } else if (modelConfig.type === 'gemma-stream') {
                // Gemma/Knowledge Master/Concept Builder (JSON + SSE stream)
                const parts = [{ text: prompt }];
                // Image support for gemini models (not gemma)
                if (imageUrl && modelConfig.model !== 'gemini-2.5-flash-lite') {
                    const dataUri = await fetchImageAsDataUri(imageUrl);
                    if (dataUri) {
                        const [meta, base64] = dataUri.split(',');
                        const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ inlineData: { mimeType, data: base64 } });
                    }
                }
                const resp = await fetch(modelConfig.api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                    body: JSON.stringify({ parts, model: modelConfig.model }),
                });
                if (!resp.ok) throw new Error('API Error: ' + resp.status);
                const ct = resp.headers.get('Content-Type') || '';
                if (ct.includes('application/json')) {
                    const data = await resp.json();
                    const partsArr = data?.candidates?.[0]?.content?.parts;
                    if (Array.isArray(partsArr)) {
                        for (const p of partsArr) { if (p?.text) answerText += p.text; }
                    }
                } else {
                    answerText = await parseSSEStream(resp);
                }
            } else if (modelConfig.type === 'chatbot') {
                // AI Chat Bot (FormData)
                const formData = new FormData();
                formData.append('message', prompt);
                if (imageUrl) {
                    const imageFile = await fetchImageAsFile(imageUrl);
                    if (imageFile) formData.append('image', imageFile);
                }
                const resp = await fetch(modelConfig.api, { method: 'POST', body: formData });
                const data = await resp.json();
                if (data?.reply) {
                    answerText = data.reply;
                } else if (imageUrl) {
                    // Retry without image if empty reply
                    const retryForm = new FormData();
                    retryForm.append('message', prompt);
                    const retryResp = await fetch(modelConfig.api, { method: 'POST', body: retryForm });
                    const retryData = await retryResp.json();
                    if (retryData?.reply) answerText = retryData.reply;
                }
            } else if (modelConfig.type === 'easemate') {
                // Problem Solver (JSON with data URI image)
                let imgDataUri = null;
                if (imageUrl) imgDataUri = await fetchImageAsDataUri(imageUrl);
                const resp = await fetch(modelConfig.api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'chat', prompt, imageUrl: imgDataUri }),
                });
                const data = await resp.json();
                if (data?.answer) answerText = data.answer;
            } else if (modelConfig.type === 'borno') {
                // Academic Assistant (JSON array)
                let imgDataUri = '';
                if (imageUrl) imgDataUri = (await fetchImageAsDataUri(imageUrl)) || '';
                const resp = await fetch(modelConfig.api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([prompt, imgDataUri, 'fvRLQNCpxUVIGeqCn45iW59CIzD3', '', '']),
                });
                const raw = await resp.text();
                // Parse borno response
                const m2 = raw.match(/2:[^,]*,\s*([\s\S]*?)$/);
                if (m2 && m2[1]) {
                    answerText = m2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
                    if (answerText.startsWith('"')) answerText = answerText.slice(1);
                    if (answerText.endsWith('"')) answerText = answerText.slice(0, -1);
                } else {
                    const m1 = raw.match(/1:\s*\{\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/);
                    if (m1) answerText = m1[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    else answerText = raw;
                }
            }

            setAnswer(answerText || 'উত্তর পাওয়া যায়নি।');
        } catch (err) {
            setAnswer('Error: ' + (err?.message || 'AI সার্ভারে সমস্যা হয়েছে।'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAnswer('');
        setLoading(false);
        onClose();
    };

    // Build a temporary off-screen capture element with branding + question + answer (DOM cloning)
    const captureToDataUrl = async () => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;';

        const container = document.createElement('div');
        container.style.cssText = 'width:800px;padding:24px;background:#fff;font-family:"Hind Siliguri",sans-serif;color:#1e293b;position:relative;overflow:hidden;';

        // Watermark
        const watermark = document.createElement('div');
        watermark.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.05;pointer-events:none;z-index:0;';
        watermark.innerHTML = '<img src="/HMT Logo.png" style="width:700px;height:auto" crossorigin="anonymous" />';
        container.appendChild(watermark);

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = 'position:relative;z-index:1;';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #2563eb;';
        const metaText = [className, subjectName, chapterName, source].filter(Boolean).join(' • ');
        header.innerHTML = `<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px;color:#2563eb;white-space:nowrap">H.M. Tutoring AI</div><div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis">${metaText}</div></div><div style="width:120px;display:flex;justify-content:flex-end;align-items:center"><img src="/HMT Logo.png" alt="HMT" style="width:90px;height:90px;object-fit:contain" crossorigin="anonymous" /></div>`;
        contentDiv.appendChild(header);

        // Question Section (Restored as per user request)
        if (questionPreviewRef.current) {
            const questionSection = document.createElement('div');
            questionSection.style.cssText = 'margin-bottom:12px;padding:12px;background:#f1f5f9;border-radius:8px;border:1px solid #cbd5e1;font-size:14px;';

            const questionClone = questionPreviewRef.current.cloneNode(true);
            questionClone.style.border = 'none';
            questionClone.style.padding = '0';
            questionClone.style.background = 'transparent';
            questionClone.style.overflow = 'visible'; // Fix: Force remove scrollbars
            questionClone.style.maxHeight = 'none';   // Fix: Remove max-height constraint

            questionSection.appendChild(questionClone);
            contentDiv.appendChild(questionSection);
        }

        // Answer section (clone the already-rendered answer with MathJax intact)
        if (visibleAnswerRef.current) {
            const answerSection = document.createElement('div');
            answerSection.style.cssText = 'padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;';
            const answerClone = visibleAnswerRef.current.cloneNode(true);
            answerClone.style.border = 'none';
            answerClone.style.padding = '0';
            answerClone.style.background = 'transparent';
            answerClone.style.overflow = 'visible'; // Fix: Force remove scrollbars
            answerClone.style.maxHeight = 'none';   // Fix: Remove max-height constraint
            answerSection.appendChild(answerClone);
            contentDiv.appendChild(answerSection);
        }

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = 'margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;';
        footer.innerHTML = '<span style="font-size:10px;color:#94a3b8">Generated by H.M. Tutoring AI</span><span style="font-size:10px;color:#94a3b8">https://hmtutoring.netlify.app</span>';
        contentDiv.appendChild(footer);

        container.appendChild(contentDiv);
        wrapper.appendChild(container);
        document.body.appendChild(wrapper);

        try {
            await new Promise(r => setTimeout(r, 300));
            const dataUrl = await toPng(container, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
            return dataUrl;
        } finally {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        }
    };

    // Download answer as PNG
    const downloadAnswer = async () => {
        if (!visibleAnswerRef.current) return;
        setDownloadingAnswer(true);
        try {
            const dataUrl = await captureToDataUrl();
            const link = document.createElement('a');
            link.download = `AI-উত্তর-${source || 'answer'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
            alert('ডাউনলোড ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setDownloadingAnswer(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="modal modal-open" style={{ zIndex: 9999 }}>
            <div className="modal-box max-w-2xl w-full relative" style={{ fontFamily: 'Hind Siliguri, sans-serif', maxHeight: '85vh', overflowY: 'auto' }}>
                {/* Close button */}
                <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={handleClose}>✕</button>

                <h3 className="font-bold text-lg mb-3">🤖 AI দিয়ে সমাধান করুন</h3>

                {/* Model select */}
                <div className="flex items-center gap-3 mb-3">
                    <label className="font-semibold text-sm">মডেল:</label>
                    <select
                        className="select select-bordered select-sm"
                        value={selectedModel}
                        onChange={e => { setSelectedModel(e.target.value); setAnswer(''); }}
                    >
                        {AI_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>

                {/* Question preview */}
                <div ref={questionPreviewRef} className="bg-base-200 p-3 rounded-lg mb-3 text-sm" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {stemText && (
                        <div className="mb-2">
                            <span className="font-semibold">উদ্দীপক: </span>
                            <MathRendererWithContext text={stemText} />
                        </div>
                    )}
                    {imageUrl && (
                        <div className="my-2 flex justify-center">
                            <img src={imageUrl} alt="উদ্দীপকের চিত্র" className="rounded border" style={{ maxHeight: '100px', objectFit: 'contain' }} />
                        </div>
                    )}
                    {questionText && (
                        <div className="mb-1">
                            <MathRendererWithContext text={questionText} />
                        </div>
                    )}
                    {source && <div className="text-xs opacity-70 mt-2">(সোর্স: {source})</div>}
                    {!stemText && !questionText && <span>প্রশ্ন নেই</span>}
                </div>

                {/* Ask button */}
                <button
                    className={`btn btn-primary btn-sm mb-4 ${loading ? 'loading' : ''}`}
                    onClick={handleAsk}
                    disabled={loading || !fullQuestion}
                >
                    {loading ? 'উত্তর তৈরি হচ্ছে...' : 'উত্তর দেখুন'}
                </button>

                {/* Answer */}
                {answer && (
                    <>
                        <div ref={visibleAnswerRef} className="border rounded-lg p-4 bg-base-100" style={{ whiteSpace: 'pre-line', overflowX: 'auto' }}>
                            <span className="font-semibold text-success block mb-2">উত্তর:</span>
                            {(() => {
                                const svgRegex = /(<svg[\s\S]*?<\/svg>)/gi;
                                const parts = answer.split(svgRegex);
                                if (parts.length <= 1) {
                                    return <MathRendererWithContext text={answer} />;
                                }
                                return parts.map((part, i) => {
                                    if (svgRegex.lastIndex === 0) svgRegex.lastIndex = 0;
                                    if (/<svg[\s\S]*?<\/svg>/i.test(part)) {
                                        const cleanSvg = part.replace(/<script[\s\S]*?<\/script>/gi, '')
                                            .replace(/<svg([^>]*)>/i, (match, attrs) => {
                                                const wMatch = attrs.match(/width\s*=\s*["']?(\d+)/);
                                                const hMatch = attrs.match(/height\s*=\s*["']?(\d+)/);
                                                const hasViewBox = /viewBox/i.test(attrs);
                                                let newAttrs = attrs
                                                    .replace(/\bwidth\s*=\s*["']?[\d.]+["']?/gi, '')
                                                    .replace(/\bheight\s*=\s*["']?[\d.]+["']?/gi, '');
                                                if (!hasViewBox && wMatch && hMatch) {
                                                    newAttrs += ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`;
                                                }
                                                return `<svg${newAttrs} style="width:100%;height:auto;max-width:${wMatch ? wMatch[1] + 'px' : '600px'}">`;
                                            });
                                        return (
                                            <div key={i} style={{ margin: '12px 0', display: 'flex', justifyContent: 'center', overflowX: 'auto', width: '100%' }}>
                                                <div dangerouslySetInnerHTML={{ __html: cleanSvg }} style={{ maxWidth: '100%' }} />
                                            </div>
                                        );
                                    }
                                    const trimmed = part.trim();
                                    if (!trimmed) return null;
                                    return <MathRendererWithContext key={i} text={trimmed} />;
                                });
                            })()}
                        </div>
                        {/* Download + Save buttons */}
                        <div className="mt-3 mb-4" style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-sm btn-outline btn-success"
                                style={{ flex: 1 }}
                                onClick={downloadAnswer}
                                disabled={downloadingAnswer}
                            >
                                📥 ডাউনলোড
                            </button>
                            <button
                                className="btn btn-sm btn-outline btn-info"
                                style={{ flex: 1 }}
                                onClick={saveToDB}
                                disabled={savingToDB}
                            >
                                {savingToDB ? (
                                    <><span className="loading loading-spinner loading-xs"></span> সেভ হচ্ছে...</>
                                ) : (
                                    '💾 সেভ করুন'
                                )}
                            </button>
                        </div>
                        {dbSaveMsg && (
                            <div style={{
                                textAlign: 'center', fontSize: '13px', marginTop: '-10px', marginBottom: '12px',
                                padding: '4px 8px', borderRadius: '6px',
                                background: dbSaveMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                                color: dbSaveMsg.startsWith('✅') ? '#166534' : '#991b1b',
                            }}>
                                {dbSaveMsg}
                            </div>
                        )}
                    </>
                )}

                {/* Saved answers gallery */}
                {questionHash && (
                    <SavedAnswerGalleryMongoDB
                        questionHash={questionHash}
                        onRefreshNeeded={galleryRefreshRef}
                    />
                )}

            </div>

            {/* Full-page loading overlay during download/share */}
            {downloadingAnswer && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                }}>
                    <style>{`
            @keyframes pulseRing {
              0% { transform: scale(0.8); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.5; }
              100% { transform: scale(0.8); opacity: 1; }
            }
            @keyframes dotBounce {
              0%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-10px); }
            }
          `}</style>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'pulseRing 1.5s ease-in-out infinite',
                        boxShadow: '0 0 30px rgba(59,130,246,0.4)',
                    }}>
                        <span style={{ fontSize: '28px' }}>📥</span>
                    </div>
                    <p style={{
                        color: '#fff', fontFamily: '"Hind Siliguri", sans-serif',
                        fontSize: '16px', fontWeight: 600, marginTop: '16px',
                    }}>ডাউনলোড তৈরি হচ্ছে...</p>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#93c5fd',
                                animation: `dotBounce 1s ease-in-out ${i * 0.15}s infinite`,
                            }} />
                        ))}
                    </div>
                </div>
            )}

            <div className="modal-backdrop" onClick={handleClose}></div>
        </div>
    );
}

export default AskAIModalMongoDB;
