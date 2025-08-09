import React, { useEffect, useMemo, useState, useCallback } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

function DoubtSolvePage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);

  // Cleanup preview URL
  useEffect(() => () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); }, [imagePreviewUrl]);

  // Load mapping (same source used elsewhere)
  useEffect(() => {
    setMappingLoading(true);
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" + Date.now())
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(res.statusText)))
      .then((data) => Array.isArray(data) ? setMapping(data) : setMapping([]))
      .catch(() => setMapping([]))
      .finally(() => setMappingLoading(false));
  }, []);

  const classes = Array.from(new Set(mapping.map(m => m['শ্রেণি']).filter(Boolean)));
  let subjects = [];
  if (selectedClass) {
    const filteredItems = mapping.filter(m => m['শ্রেণি'] === selectedClass);
    subjects = filteredItems.map(item => item['বিষয়'] || item.বিষয় || Object.values(item)[1]).filter(Boolean);
    subjects = Array.from(new Set(subjects));
  }
  const chapters = (selectedClass && selectedSubject)
    ? (() => {
        const selectedMapping = mapping.find(m => m['শ্রেণি'] === selectedClass && (m['বিষয়'] || Object.values(m)[1]) === selectedSubject);
        const chapterObj = selectedMapping?.['অধ্যায়'] || (selectedMapping && Object.values(selectedMapping)[2]) || {};
        return Object.keys(chapterObj);
      })()
    : [];

  const questionTypes = [
    { value: 'জ্ঞানমূলক', label: 'জ্ঞানমূলক' },
    { value: 'অনুধাবন', label: 'অনুধাবন' },
    { value: 'বহুনির্বাচনী', label: 'বহুনির্বাচনী' },
    { value: 'গাণিতিক প্রশ্ন', label: 'গাণিতিক প্রশ্ন' },
    { value: 'সৃজনশীল', label: 'সৃজনশীল' }
  ];

  const getPrompt = (type, userQuestion, contextPrompt = null) => {
    const latexGuidelines = String.raw`আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় দিন এবং গাণিতিক অংশগুলো অবশ্যই LaTeX (MathJax) ফরম্যাটে লিখবেন। বাংলা টেক্সট কখনোই $...$ বা $$...$$ এর ভিতরে থাকবে না।

কঠোর ফরম্যাটিং নির্দেশনা:
- Inline math: $ ... $ ব্যবহার করুন (উদা: $x^2+y^2$, $A^{-1}$, $I_{3}$, $\det(A)$, $\frac{a}{b}$)。
- Block/math steps বা দীর্ঘ সমীকরণ: $$ ... $$ ব্যবহার করুন。
- Matrix অবশ্যই LaTeX এ লিখবেন, ASCII ব্র্যাকেট/টেক্সট ম্যাট্রিক্স নয়:
  $$\begin{bmatrix}a & b \\ c & d\end{bmatrix}$$
- Vector/column: $\begin{pmatrix}a \\ b\end{pmatrix}$, Determinant: $\det(A)$。
- ASCII টেবিল/ব্র্যাকেট, caret-less power, বা প্লেইন টেক্সট ম্যাট্রিক্স একেবারেই ব্যবহার করবেন না。
- বাংলা ব্যাখ্যা ও LaTeX গণিত একই লাইনে প্রয়োজনে লিখুন; অনর্থক লাইন ব্রেক নয়。
- তালিকার জন্য Markdown ব্যবহার করুন।

উত্তরে গণিত থাকলে অন্তত একটি $ ... $ বা $$ ... $$ থাকবে তা নিশ্চিত করুন। কোনো AI মডেলের নাম উল্লেখ করবেন না; সম্ভাষণ ছাড়া সরাসরি উত্তর দিন।`;

    const basePrompt = contextPrompt ? `${contextPrompt}\n\n${latexGuidelines}` : latexGuidelines;

    switch(type){
      case 'জ্ঞানমূলক': return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। ১-২ লাইনে সরাসরি উত্তর দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      case 'অনুধাবন': return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। এই ফরম্যাটে উত্তর দাও:\n\n**সংজ্ঞা:** (১-২ লাইন)\n\n**ব্যাখ্যা:** (৩-৫ বাক্য)\n\nপ্রশ্ন: ${userQuestion}`;
      case 'বহুনির্বাচনী': return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই ফরম্যাটে উত্তর দাও:\n\n**সঠিক উত্তর:**\n\n**সমাধান:** ধাপে ধাপে/শর্টকাট থাকলে তা সহ\n\n**Calculator Hacks:** (থাকলে)\n\nপ্রশ্ন: ${userQuestion}`;
      case 'গাণিতিক প্রশ্ন': return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই ফরম্যাটে ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n**প্রয়োজনীয় সূত্র:**\n**সমাধান:**\n**উত্তর:**\n\nপ্রশ্ন: ${userQuestion}`;
      case 'সৃজনশীল': return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রশ্নে যতগুলো অংশ আছে সেই অনুযায়ী উত্তর দাও (ক/খ/গ/ঘ)।\n\nপ্রশ্ন: ${userQuestion}`;
      default: return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
    }
  };

  const handleTextChange = useCallback((e) => {
    const v = e.target.value; setQuestionText(v); if (answer && v.length > 0) setAnswer("");
  }, [answer]);

  const memoizedAnswer = useMemo(() => {
    if (!answer?.trim()) return null; return <MathRendererWithContext text={answer} />;
  }, [answer]);

  const handleImageChange = (e) => {
    if (answer) setAnswer("");
    if (imagePreviewUrl) { URL.revokeObjectURL(imagePreviewUrl); setImagePreviewUrl(null); }
    const file = e.target.files[0]; setImageFile(file);
    if (file) setImagePreviewUrl(URL.createObjectURL(file));
  };

  const fileToDataURL = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }

    setLoading(true); setAnswer("");
    try {
      // Chapter context (optional)
      const selectedMapping = mapping.find(m => m['শ্রেণি'] === selectedClass && (m['বিষয়'] || Object.values(m)[1]) === selectedSubject);
      const chapterObj = selectedMapping?.['অধ্যায়'] || (selectedMapping && Object.values(selectedMapping)[2]) || {};
      const chapterUrl = chapterObj[selectedChapter];
      let chapterContent = '';
      if (chapterUrl) {
        try {
          const r = await fetch(chapterUrl);
          if (r.ok) {
            chapterContent = (await r.text())
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 8000);
          }
        } catch (err) {
          console.warn('Failed to fetch chapter content:', err);
        }
      }

      let contextPrompt = `আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
      if (chapterContent) contextPrompt += `\n\nঅধ্যায়ের বিষয়বস্তু:\n${chapterContent.substring(0, 4000)}\n`;

      let prompt;
      if (questionText.trim()) {
        let extra = '';
        if (imageFile) {
          extra = questionType === 'সৃজনশীল' ? `\n\nছবিতে সৃজনশীল প্রশ্নের নির্দিষ্ট অংশ থাকলে সেটিই উত্তর দাও।` : `\n\nদেওয়া ছবির তথ্য বিবেচনা করো।`;
        }
        prompt = getPrompt(questionType, questionText + extra, contextPrompt);
      } else if (imageFile) {
        prompt = getPrompt(questionType, 'ছবির প্রশ্ন বিশ্লেষণ করে উত্তর দাও।', contextPrompt);
      } else {
        setAnswer("প্রশ্ন লিখুন বা ছবি দিন।"); setLoading(false); return;
      }

      const HF_TOKEN = import.meta.env.VITE_HF_TOKEN;
      if (!HF_TOKEN) {
        setAnswer('HF টোকেন কনফিগার করা হয়নি (VITE_HF_TOKEN).');
        setLoading(false);
        return;
      }

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
          ]
        }
      ];

      if (imageFile) {
        try {
          const dataUrl = await fileToDataURL(imageFile);
          messages[0].content.push({ type: 'image_url', image_url: { url: dataUrl } });
        } catch (err) {
          console.warn('Failed to encode image:', err);
        }
      }

      const body = {
        model: 'google/gemma-3-27b-it:nebius',
        messages,
        temperature: 0.2,
        stream: true,
      };

      const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        throw new Error(`HF API error ${resp.status}: ${errorText}`);
      }

      // Stream the response (SSE)
      const reader = resp.body?.getReader();
      if (!reader) {
        // Fallback if streaming not supported
        const data = await resp.json().catch(() => null);
        const text = data?.choices?.[0]?.message?.content || '';
        setAnswer(text || 'কোনো উত্তর পাওয়া যায়নি।');
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let receivedAny = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events separated by double newlines
        const events = buffer.split("\n\n");
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.slice(5).trim().replace(/^:\s?/, '').trim();
            if (!dataStr) continue;
            if (dataStr === '[DONE]') {
              // End of stream
              break;
            }
            try {
              const json = JSON.parse(dataStr);
              const delta = json?.choices?.[0]?.delta;
              const content = typeof delta?.content === 'string' ? delta.content : '';
              if (content) {
                receivedAny = true;
                setAnswer((prev) => prev + content);
              }
            } catch {
              // Ignore parse errors for keep-alive/ping lines
            }
          }
        }
      }

      if (!receivedAny) {
        setAnswer('কোনো উত্তর পাওয়া যায়নি।');
      }
    } catch (err) {
      console.error(err);
      setAnswer("উত্তর আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">ডাউট সলভ</h1>
      <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); if (answer) setAnswer(''); }} disabled={mappingLoading}>
            <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
            {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
          </select>
          {selectedClass ? (
            <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); if (answer) setAnswer(''); }} disabled={mappingLoading}>
              <option value="">বিষয়</option>
              {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled><option value="">প্রথমে শ্রেণি নির্বাচন করুন</option></select>
          )}
          {selectedClass && selectedSubject ? (
            <select className="select select-bordered w-full text-sm" value={selectedChapter} onChange={e => { setSelectedChapter(e.target.value); if (answer) setAnswer(''); }} disabled={mappingLoading}>
              <option value="">অধ্যায়</option>
              {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled><option value="">প্রথমে বিষয় নির্বাচন করুন</option></select>
          )}
          <select className="select select-bordered w-full text-sm" value={questionType} onChange={e => { setQuestionType(e.target.value); if (answer) setAnswer(''); }}>
            <option value="">প্রশ্নের ধরণ</option>
            {questionTypes.map((t, i) => <option key={i} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="প্রশ্ন লিখুন..." value={questionText} onChange={handleTextChange} />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold text-sm">অথবা ছবি আপলোড করুন:</label>
          <input type="file" accept="image/*" className="file-input file-input-bordered w-full text-sm" onChange={handleImageChange} />
          {imagePreviewUrl && <div className="mt-2"><img src={imagePreviewUrl} alt="Uploaded" className="max-h-40 w-auto rounded shadow mx-auto block" /></div>}
        </div>
        <button className="btn btn-primary w-full text-sm sm:text-base" type="submit" disabled={loading || (!questionText.trim() && !imageFile)}>
          {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
        </button>
      </form>
      {answer && (
        <div className="bg-base-100 rounded shadow p-3 sm:p-4 text-base sm:text-lg text-base-content overflow-hidden">
          <span className="font-bold">উত্তর:</span>
          <div className="answer-content overflow-x-auto" style={{ lineHeight: '1.8', wordSpacing: '0.1em', marginTop: '0.5rem' }}>
            {memoizedAnswer}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoubtSolvePage;
