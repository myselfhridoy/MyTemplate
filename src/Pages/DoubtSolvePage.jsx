import React, { useState, useEffect, useCallback, useMemo } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

// Use local proxy for Gemma API requests during development
//const LOCAL_GEMMA_PROXY_URL = "http://localhost:5001/api/gemma";
const GEMMA_PROXY_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5001/api/gemma"  // লোকালি চলবে
    : "/.netlify/functions/gemma"; // Netlify-তে ডিপ্লয় হলে এই রুট ধরবে
const MAPPING_URL = "https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json";

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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    setMappingLoading(true);
    fetch(MAPPING_URL)
      .then((res) => res.json())
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

  const getPromptForQuestionType = (type, userQuestion, contextPrompt = null) => {
    const basePrompt = contextPrompt || `আপনি একজন দক্ষ শিক্ষক। সব প্রশ্নের উত্তর বাংলায় এবং গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।`;
    switch(type) {
      case 'জ্ঞানমূলক':
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। সংক্ষিপ্ত ও সরাসরি উত্তর দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      case 'অনুধাবন':
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। সংজ্ঞা ও ব্যাখ্যা দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      case 'বহুনির্বাচনী':
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। সঠিক উত্তর ও সমাধান দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। ধাপে ধাপে সমাধান দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      case 'সৃজনশীল':
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রতিটি অংশের উত্তর দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
    }
  };

  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    setQuestionText(value);
    if (answer && value.length > 0) {
      setAnswer("");
    }
  }, [answer]);

  const memoizedAnswerContent = useMemo(() => {
    if (!answer || !answer.trim()) return null;
    return <MathRendererWithContext text={answer} />;
  }, [answer]);

  const handleImageChange = (e) => {
    if (answer) setAnswer("");
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  async function compressToBase64(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.75 } = {}) {
    if (!file.type.startsWith('image/')) throw new Error('Not an image');
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img = await new Promise((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    let { width, height } = img;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    if (scale < 1) { width = Math.round(width * scale); height = Math.round(height * scale); }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const mime = (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
    const compressedDataUrl = canvas.toDataURL(mime, quality);
    return compressedDataUrl;
  }

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }
    setLoading(true);
    setAnswer("");
    try {
      let contextPrompt = `আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**\n\n**গুরুত্বপূর্ণ formatting নিয়ম:**\n- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো\n- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো\n- Math expressions এর আগে বা পরে অনর্থক line break দিও না\n- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো\n\nউত্তরের structure:\n- তালিকার জন্য proper markdown formatting ব্যবহার করো\n- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো\n\n**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**\n**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।**`;
      let prompt;
      switch(questionType) {
        case 'জ্ঞানমূলক':
          prompt = contextPrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)।\n\nপ্রশ্ন: ${questionText}`;
          break;
        case 'অনুধাবন':
          prompt = contextPrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। **অবশ্যই** এই exact format এ উত্তর দাও:\n\n**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে। যেমন: "বেগ কী?" প্রশ্নে "নির্দিষ্ট দিকে কোনো বস্তুর সরণের হারকে বেগ বলে।")\n\n**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে। প্রশ্নে যা জানতে চাওয়া হয়েছে সেটার সরাসরি উত্তর দাও।)\n\n**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**\n\nপ্রশ্ন: ${questionText}`;
          break;
        case 'বহুনির্বাচনী':
          prompt = contextPrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)\n\n**সমাধান:**\n- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও\n- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো\n- বাংলা টেক্সট এবং math একই লাইনে রাখো\n\n**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)\n\nপ্রশ্ন: ${questionText}`;
          break;
        case 'গাণিতিক প্রশ্ন':
          prompt = contextPrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)\n\n**প্রয়োজনীয় সূত্র:**\n(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)\n\n**সমাধান:**\n(প্রতিটি ধাপ আলাদা paragraph এ লিখো)\n\n**উত্তর:**\n(চূড়ান্ত উত্তর)\n\nপ্রশ্ন: ${questionText}`;
          break;
        default:
          prompt = contextPrompt + `\n\nপ্রশ্ন: ${questionText}`;
      }
      let messages = [
        { role: "system", content: "You are a friendly assistant" },
        { role: "user", content: prompt }
      ];
      if (imageFile) {
        const base64DataUrl = await compressToBase64(imageFile);
        messages[1].content = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: base64DataUrl } }
        ];
      }
      const response = await fetch(
        GEMMA_PROXY_URL,
        {
          headers: { "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({ messages, stream: true, max_tokens: 79000, temperature: 0.6 })
        }
      );
      if (!response.body) {
        setAnswer("উত্তর আনতে সমস্যা হয়েছে।");
        setLoading(false);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value);
          // Each chunk may contain multiple SSE events
          chunk.split(/\n\n/).forEach(event => {
            if (event.startsWith("data:")) {
              try {
                const json = JSON.parse(event.slice(5));
                if (json.response) {
                  fullAnswer += json.response;
                  setAnswer(prev => prev + json.response);
                }
              } catch {}
            }
          });
        }
      }
    } catch (err) {
      setAnswer("উত্তর আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">ডাউট সলভ</h1>
      <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(""); setSelectedChapter(""); }} disabled={mappingLoading}>
            <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
            {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
          </select>
          <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(""); }} disabled={!selectedClass || mappingLoading}>
            <option value="">বিষয়</option>
            {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
          </select>
          <select className="select select-bordered w-full text-sm" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} disabled={!selectedClass || !selectedSubject || mappingLoading}>
            <option value="">অধ্যায়</option>
            {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
          </select>
          <select className="select select-bordered w-full text-sm" value={questionType} onChange={e => setQuestionType(e.target.value)}>
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
            {memoizedAnswerContent}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoubtSolvePage;
