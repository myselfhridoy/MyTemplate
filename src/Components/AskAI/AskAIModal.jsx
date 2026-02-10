import React, { useState, useMemo } from 'react';
import MathRendererWithContext from '../MathRenderer/MathRenderer';

const AI_MODELS = [
  { value: 'gemmy', label: 'জেমি: দ্যা টিচার', api: 'https://geminiai-render.onrender.com/api/gemmy/generate', type: 'formdata' },
  { value: 'merlin', label: 'মিস মার্লিন: দ্যা টিউটর', api: 'https://geminiai-render.onrender.com/api/merlin/v1/chat/completions', type: 'merlin' },
  { value: 'luzia', label: 'Luzia: দ্যা প্রফেসর', api: 'https://geminiai-render.onrender.com/api/luzia/ask', type: 'luzia' },
  { value: 'hmtai', label: 'H.M. Tutoring AI', api: 'https://geminiai-render.onrender.com/api/ai-free-api', type: 'hmtai' },
  { value: 'assistant', label: 'Knowledge Master', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemini-2.5-flash-lite' },
  { value: 'chatbot', label: 'AI Chat Bot', api: 'https://geminiai-render.onrender.com/api/chat/send', type: 'chatbot' },
  { value: 'easemate', label: 'Problem Solver', api: 'https://geminiai-render.onrender.com/api/easemate', type: 'easemate' },
  { value: 'borno', label: 'Academic Assistant', api: 'https://geminiai-render.onrender.com/api/bornoai', type: 'borno' },
  { value: 'doubt', label: 'Concept Builder', api: 'https://geminiai-render.onrender.com/api/gemma', type: 'gemma-stream', model: 'gemma-3-27b-it' },
];

function AskAIModal({ isOpen, onClose, questionText = '', stemText = '', imageUrl = '', source = '', marks = '', finalAnswer = '', steps = '' }) {
  const [selectedModel, setSelectedModel] = useState('gemmy');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (imageUrl && modelConfig.model !== 'gemma-3-27b-it') {
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
        <div className="bg-base-200 p-3 rounded-lg mb-3 text-sm" style={{ maxHeight: '260px', overflowY: 'auto' }}>
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
          <div className="border rounded-lg p-4 bg-base-100" style={{ whiteSpace: 'pre-line', overflowX: 'auto' }}>
            <span className="font-semibold text-success block mb-2">উত্তর:</span>
            {(() => {
              // Split answer into text and SVG parts
              const svgRegex = /(<svg[\s\S]*?<\/svg>)/gi;
              const parts = answer.split(svgRegex);
              if (parts.length <= 1) {
                // No SVG found, render normally
                return <MathRendererWithContext text={answer} />;
              }
              return parts.map((part, i) => {
                if (svgRegex.lastIndex === 0) svgRegex.lastIndex = 0; // reset
                if (/<svg[\s\S]*?<\/svg>/i.test(part)) {
                  // Sanitize: only allow svg content
                  const cleanSvg = part.replace(/<script[\s\S]*?<\/script>/gi, '')
                    // Make SVG responsive: remove fixed width/height, add viewBox if missing
                    .replace(/<svg([^>]*)>/i, (match, attrs) => {
                      // Extract width and height values for viewBox
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
        )}
      </div>
      <div className="modal-backdrop" onClick={handleClose}></div>
    </div>
  );
}

export default AskAIModal;
