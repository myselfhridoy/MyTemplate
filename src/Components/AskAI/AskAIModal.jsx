import React, { useState, useMemo, useRef, useCallback } from 'react';
import MathRendererWithContext from '../MathRenderer/MathRenderer';
import { toPng } from 'html-to-image';
import { sha256 } from 'js-sha256';
import SavedAnswerGallery from './SavedAnswerGallery';

const DRIVE_API = 'https://geminiai-render.onrender.com/api/driveRouter';
const GOOGLE_CLIENT_ID = '19730678351-p3t6io5vl987rnffmim1nlo21ks7evub.apps.googleusercontent.com';

const AI_MODELS = [
  { value: 'gemmy', label: 'জেমি: দ্যা টিচার', api: 'https://geminiai-render.onrender.com/api/gemmy/generate', type: 'formdata' },
  { value: 'merlin', label: 'মিস মার্লিন: দ্যা টিউটর', api: 'https://geminiai-render.onrender.com/api/merlin/v1/chat/completions', type: 'merlin' },
  { value: 'luzia', label: 'Luzia: দ্যা প্রফেসর', api: 'https://geminiai-render.onrender.com/api/luzia/ask', type: 'luzia' },
  { value: 'assistant', label: 'Knowledge Master', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemini-3-flash-preview' },
  { value: 'chatbot', label: 'AI Chat Bot', api: 'https://geminiai-render.onrender.com/api/chat/send', type: 'chatbot' },
  { value: 'hmtai', label: 'H.M. Tutoring AI', api: 'https://geminiai-render.onrender.com/api/ai-free-api', type: 'hmtai' },
  { value: 'easemate', label: 'Problem Solver', api: 'https://geminiai-render.onrender.com/api/easemate', type: 'easemate' },
  { value: 'borno', label: 'Academic Assistant', api: 'https://geminiai-render.onrender.com/api/bornoai', type: 'borno' },
  { value: 'doubt', label: 'Concept Builder', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemma-4-31b-it' },
];

function AskAIModal({ isOpen, onClose, questionText = '', stemText = '', imageUrl = '', source = '', marks = '', finalAnswer = '', steps = '', subjectName = '', chapterName = '', className = '' }) {
  const [selectedModel, setSelectedModel] = useState('gemmy');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingAnswer, setDownloadingAnswer] = useState(false);
  const questionPreviewRef = useRef(null);
  const visibleAnswerRef = useRef(null);

  // ─── Google Drive state (persist in sessionStorage) ───
  const [gAccessToken, setGAccessToken] = useState(() => {
    try { return sessionStorage.getItem('g_drive_token') || null; } catch { return null; }
  });
  const updateGToken = (token) => {
    setGAccessToken(token);
    try { if (token) sessionStorage.setItem('g_drive_token', token); else sessionStorage.removeItem('g_drive_token'); } catch { }
  };
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [driveSaveMsg, setDriveSaveMsg] = useState('');
  const galleryRefreshRef = useRef(null);

  // Question fingerprint for Drive storage
  const questionHash = useMemo(() => {
    const raw = (questionText || '') + '|||' + (stemText || '');
    return raw.trim() ? sha256(raw) : '';
  }, [questionText, stemText]);

  // ─── Google OAuth Sign-In ───
  const requestGoogleToken = useCallback(() => {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('Google Identity Services লোড হয়নি। পেজ রিফ্রেশ করুন।'));
        return;
      }
      // eslint-disable-next-line no-undef
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        prompt: 'select_account',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || 'Google Sign-In ব্যর্থ'));
          } else {
            updateGToken(response.access_token);
            resolve(response.access_token);
          }
        },
      });
      client.requestAccessToken();
    });
  }, []);

  // ─── Save to Drive ───
  const saveToDrive = async () => {
    if (!visibleAnswerRef.current) return;
    setSavingToDrive(true);
    setDriveSaveMsg('');
    try {
      // Get token if not already signed in
      let token = gAccessToken;
      if (!token) {
        token = await requestGoogleToken();
      }

      // Capture answer as PNG data URL
      const dataUrl = await captureToDataUrl();

      // Get current model label
      const modelConfig = AI_MODELS.find(m => m.value === selectedModel);
      const modelLabel = modelConfig ? modelConfig.label : selectedModel;

      // Send to backend
      const res = await fetch(`${DRIVE_API}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          questionHash,
          imageBase64: dataUrl,
          questionText: (questionText || '').substring(0, 500),
          source: source || '',
          modelUsed: modelLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Token expired / invalid — clear and auto-retry once
        const isAuthErr = (data.error || '').match(/credential|unauthorized|invalid.*token|folder.*error/i) || res.status === 401;
        if (isAuthErr) {
          updateGToken(null);
          throw new Error('TOKEN_EXPIRED');
        }
        throw new Error(data.error || 'Save failed');
      }

      setDriveSaveMsg('✅ Drive এ সেভ হয়েছে!');
      // Refresh gallery
      if (galleryRefreshRef.current) galleryRefreshRef.current();
    } catch (err) {
      console.error('Drive save error:', err);
      if (err.message === 'TOKEN_EXPIRED') {
        setDriveSaveMsg('🔄 Token expire হয়েছে, আবার Sign-In করুন');
        updateGToken(null);
      } else if (err.message?.includes('popup_closed') || err.message?.includes('access_denied')) {
        setDriveSaveMsg('❌ Google Sign-In বাতিল হয়েছে');
      } else {
        setDriveSaveMsg('❌ ' + (err.message || 'সেভ ব্যর্থ হয়েছে'));
      }
    } finally {
      setSavingToDrive(false);
      setTimeout(() => setDriveSaveMsg(''), 5000);
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

  const bornoQuestion = useMemo(() => {
    let q = '';
    if (stemText) q += `উদ্দীপক: ${stemText}\n\n`;
    if (questionText) q += questionText;
    if (marks) q += `\n\n[মান: ${marks} নম্বর]`;
    if (finalAnswer) q += `\n\n[সঠিক উত্তর/ইঙ্গিত: ${finalAnswer}]`;
    if (source) q += `\n\n(সোর্স: ${source})`;
    return q.trim();
  }, [questionText, stemText, source, marks, finalAnswer]);

  const bornoContext = useMemo(() => {
    const classText = (className || '').trim();
    const subjectText = (subjectName || '').trim();
    const isPhysics = /পদার্থবিজ্ঞান/.test(subjectText);
    const isHigherMath = /উচ্চতর\s*গণিত/.test(subjectText);
    const paperBase = isPhysics ? 'পদার্থবিজ্ঞান' : isHigherMath ? 'উচ্চতর গণিত' : '';
    const isFirstPaper = /(প্রথম|১ম|1ম|1st)\s*পত্র/.test(subjectText);
    const isSecondPaper = /(দ্বিতীয়|দ্বিতীয়|২য়|২য়|2য়|2য়|2nd)\s*পত্র/.test(subjectText);
    const class11 = /(একাদশ|১১|11)/.test(classText);
    const class12 = /(দ্বাদশ|১২|12)/.test(classText);

    if (paperBase) {
      if (isFirstPaper || class11) {
        return { gradeValue: 'একাদশ-শ্রেণী', subjectValue: `${paperBase} প্রথম পত্র` };
      }
      if (isSecondPaper || class12) {
        return { gradeValue: 'দ্বাদশ-শ্রেণী', subjectValue: `${paperBase} দ্বিতীয় পত্র` };
      }
      return {
        gradeValue: class12 ? 'দ্বাদশ-শ্রেণী' : 'একাদশ-শ্রেণী',
        subjectValue: class12 ? `${paperBase} দ্বিতীয় পত্র` : `${paperBase} প্রথম পত্র`,
      };
    }

    return {
      gradeValue: classText || 'একাদশ-শ্রেণী',
      subjectValue: subjectText || 'পদার্থবিজ্ঞান',
    };
  }, [className, subjectName]);

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
              if (p?.text && !p.thought) answerText += p.text;
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
    const prompt = modelConfig.type === 'borno' ? bornoQuestion : buildPrompt(fullQuestion);

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
        formData.append('model', 'gemini-3.1-flash-preview');
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
        if (imageUrl) {
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
            for (const p of partsArr) { if (p?.text && !p.thought) answerText += p.text; }
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
        // Academic Assistant (FormData with SSE streaming)
        const { gradeValue, subjectValue } = bornoContext;
        const formData = new FormData();
        formData.append('userText', prompt);
        formData.append('gradeValue', gradeValue);
        formData.append('subject', subjectValue);
        if (imageUrl) {
          const imageFile = await fetchImageAsFile(imageUrl);
          if (imageFile) formData.append('image', imageFile);
        }
        const resp = await fetch(`${modelConfig.api}/chat`, {
          method: 'POST',
          body: formData
        });
        if (!resp.ok) throw new Error('API Error: ' + resp.status);
        // Handle SSE stream response
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  // Only process content messages, skip thought/ping/connected
                  if (parsed.type === 'content' && parsed.delta) {
                    answerText += parsed.delta;
                  } else if (parsed.type === 'done' && parsed.content) {
                    if (!answerText) answerText = parsed.content;
                  }
                } catch {
                  // If not JSON, ignore
                }
              }
            }
          }
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

    // Question section (clone the already-rendered question preview with MathJax intact)
    if (questionPreviewRef.current) {
      const qSection = document.createElement('div');
      qSection.style.cssText = 'margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;';
      const qLabel = document.createElement('div');
      qLabel.style.cssText = 'font-size:13px;font-weight:700;color:#2563eb;margin-bottom:8px;';
      qLabel.textContent = 'প্রশ্ন:';
      qSection.appendChild(qLabel);
      const qClone = questionPreviewRef.current.cloneNode(true);
      qClone.style.maxHeight = 'none';
      qClone.style.overflowY = 'visible';
      qClone.style.background = 'transparent';
      qClone.style.padding = '0';
      qClone.style.margin = '0';
      qSection.appendChild(qClone);
      contentDiv.appendChild(qSection);
    }

    // Answer section (clone the already-rendered answer with MathJax intact)
    if (visibleAnswerRef.current) {
      const answerSection = document.createElement('div');
      answerSection.style.cssText = 'padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;';
      const answerClone = visibleAnswerRef.current.cloneNode(true);
      answerClone.style.border = 'none';
      answerClone.style.padding = '0';
      answerClone.style.background = 'transparent';
      answerSection.appendChild(answerClone);
      contentDiv.appendChild(answerSection);
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;';
    footer.innerHTML = '<span style="font-size:10px;color:#94a3b8">Generated by H.M. Tutoring AI</span><span style="font-size:10px;color:#94a3b8">hmtutoring.netlify.app</span>';
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
            <div ref={visibleAnswerRef} className="border rounded-lg p-4 bg-base-100" style={{ overflowX: 'hidden', maxWidth: '100%', whiteSpace: 'pre-wrap' }}>
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
            {/* Download + Drive Save buttons */}
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
                onClick={saveToDrive}
                disabled={savingToDrive}
              >
                {savingToDrive ? (
                  <><span className="loading loading-spinner loading-xs"></span> সেভ হচ্ছে...</>
                ) : (
                  '☁️ Drive এ রাখুন'
                )}
              </button>
            </div>
            {driveSaveMsg && (
              <div style={{
                textAlign: 'center', fontSize: '13px', marginTop: '-10px', marginBottom: '12px',
                padding: '4px 8px', borderRadius: '6px',
                background: driveSaveMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                color: driveSaveMsg.startsWith('✅') ? '#166534' : '#991b1b',
              }}>
                {driveSaveMsg}
              </div>
            )}
          </>
        )}

        {/* Saved answers gallery */}
        {questionHash && (
          <SavedAnswerGallery
            questionHash={questionHash}
            accessToken={gAccessToken}
            onRefreshNeeded={galleryRefreshRef}
            onTokenReceived={(token) => updateGToken(token)}
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

export default AskAIModal;
