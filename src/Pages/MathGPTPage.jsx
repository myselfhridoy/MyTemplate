import React, { useState, useEffect, useCallback, useMemo } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

function MathGPTPage({
  classOverride = undefined,
  subjectOverride = undefined,
  chapterOverride = undefined,
  questionTypeOverride = undefined,
  hideSelectors = false
}) {

  const [selectedClass, setSelectedClass] = useState(classOverride ?? "");
  const [selectedSubject, setSelectedSubject] = useState(subjectOverride ?? "");
  const [selectedChapter, setSelectedChapter] = useState(chapterOverride ?? "");
  const [questionType, setQuestionType] = useState(questionTypeOverride ?? "");

  React.useEffect(() => {
    if (classOverride !== undefined) setSelectedClass(classOverride);
  }, [classOverride]);
  React.useEffect(() => {
    if (subjectOverride !== undefined) setSelectedSubject(subjectOverride);
  }, [subjectOverride]);
  React.useEffect(() => {
    if (chapterOverride !== undefined) setSelectedChapter(chapterOverride);
  }, [chapterOverride]);
  React.useEffect(() => {
    if (questionTypeOverride !== undefined) setQuestionType(questionTypeOverride);
  }, [questionTypeOverride]);

  const [questionText, setQuestionText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup image preview URL on component unmount
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Question types
  const questionTypes = [
    { value: 'জ্ঞানমূলক', label: 'জ্ঞানমূলক' },
    { value: 'অনুধাবন', label: 'অনুধাবন' },
    { value: 'বহুনির্বাচনী', label: 'বহুনির্বাচনী' },
    { value: 'গাণিতিক প্রশ্ন', label: 'গাণিতিক প্রশ্ন' },
    { value: 'সৃজনশীল', label: 'সৃজনশীল' }
  ];

  // Fetch mapping
  useEffect(() => {
    setMappingLoading(true);
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" + Date.now())
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMapping(data);
        }
      })
      .catch((err) => {
        console.error('Error fetching mapping:', err);
        setMapping([]);
      })
      .finally(() => setMappingLoading(false));
  }, []);

  // Dynamic options
  const classes = Array.from(new Set(mapping.map(m => m['শ্রেণি']).filter(Boolean)));
  let subjects = [];
  if (selectedClass) {
    const filteredItems = mapping.filter(m => m['শ্রেণি'] === selectedClass);
    subjects = filteredItems.map(item => {
      return item['বিষয়'] || item.বিষয় || Object.values(item)[1];
    }).filter(Boolean);
    subjects = Array.from(new Set(subjects));
  }
  const chapters = (selectedClass && selectedSubject)
    ? (() => {
        const selectedMapping = mapping.find(m => 
          m['শ্রেণি'] === selectedClass && 
          (m['বিষয়'] || Object.values(m)[1]) === selectedSubject
        );
        const chapterObj = selectedMapping?.['অধ্যায়'] || selectedMapping && Object.values(selectedMapping)[2] || {};
        return Object.keys(chapterObj);
      })()
    : [];

  // Get prompt based on question type
  const getPromptForQuestionType = (type, userQuestion, contextPrompt = null) => {
    const basePrompt = contextPrompt || `আপনি MathGPT AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** 

**গুরুত্বপূর্ণ formatting নিয়ম:**
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো
- Math expressions এর আগে বা পরে অনর্থক line break দিও না
- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো

উত্তরের structure:
- তালিকার জন্য proper markdown formatting ব্যবহার করো
- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।**`;
    
    switch(type) {
      case 'জ্ঞানমূলক':
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)।\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'অনুধাবন':
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। **অবশ্যই** এই exact format এ উত্তর দাও:\n\n**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে। যেমন: "বেগ কী?" প্রশ্নে "নির্দিষ্ট দিকে কোনো বস্তুর সরণের হারকে বেগ বলে।")\n\n**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে। প্রশ্নে যা জানতে চাওয়া হয়েছে সেটার সরাসরি উত্তর দাও।)\n\n**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'বহুনির্বাচনী':
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)\n\n**সমাধান:**\n- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও\n- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো\n- বাংলা টেক্সট এবং math একই লাইনে রাখো\n\n**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)\n\n**প্রয়োজনীয় সূত্র:**\n(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)\n\n**সমাধান:**\n(প্রতিটি ধাপ আলাদা paragraph এ লিখো)\n\n**উত্তর:**\n(চূড়ান্ত উত্তর)\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'সৃজনশীল':
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রশ্নে যতগুলো অংশ আছে সেই অনুযায়ী উত্তর দাও। উদাহরণ:\n\n**যদি ক, খ, গ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর)\n**গ অংশ:** (গাণিতিক সমাধান)\n\n**যদি ক, খ, গ, ঘ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর)\n**গ অংশ:** (গাণিতিক সমাধান)\n**ঘ অংশ:** (বিশ্লেষণ ও মূল্যায়ন)\n\nপ্রশ্ন: ${userQuestion}`;
      
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
    }
  };

  // Debounced input handler
  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    setQuestionText(value);
    if (answer && value.length > 0) {
      setAnswer("");
    }
  }, [answer]);

  // Memoized answer content
  const memoizedAnswerContent = useMemo(() => {
    if (!answer || !answer.trim()) return null;
    return <MathRendererWithContext text={answer} />;
  }, [answer]);

  const handleImageChange = (e) => {
    if (answer) {
      setAnswer("");
    }
    
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    
    const file = e.target.files[0];
    setImageFile(file);
    
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }
    
    setLoading(true);
    setAnswer("");
    try {
      // Get chapter content URL
      const selectedMapping = mapping.find(m => 
        m['শ্রেণি'] === selectedClass && 
        (m['বিষয়'] || Object.values(m)[1]) === selectedSubject
      );
      const chapterObj = selectedMapping?.['অধ্যায়'] || selectedMapping && Object.values(selectedMapping)[2] || {};
      const chapterUrl = chapterObj[selectedChapter];
      
      // Fetch chapter content if available
      let chapterContent = '';
      if (chapterUrl) {
        try {
          const chapterRes = await fetch(chapterUrl);
          if (chapterRes.ok) {
            chapterContent = await chapterRes.text();
            chapterContent = chapterContent
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 8000);
          }
        } catch (error) {
          console.warn('Failed to fetch chapter content:', error);
        }
      }
      
      // Get specific prompt based on question type
      let prompt = '';
      if (questionText.trim()) {
        let contextPrompt = `আপনি MathGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
        
        if (chapterContent) {
          contextPrompt += `\n\nঅধ্যায়ের বিষয়বস্তু:\n${chapterContent.substring(0, 4000)}\n\n`;
        }
        
        contextPrompt += `সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** 

**গুরুত্বপূর্ণ formatting নিয়ম:**
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো
- Math expressions এর আগে বা পরে অনর্থক line break দিও না
- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো

উত্তরের structure:
- তালিকার জন্য proper markdown formatting ব্যবহার করো
- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।`;

        if (imageFile) {
          let extraInstruction = "";
          if (questionType === 'সৃজনশীল') {
            extraInstruction = `\n\nছবিতে সৃজনশীল প্রশ্নের নির্দিষ্ট অংশ (যেমন 'খ অংশ', 'গ অংশ', 'ঘ অংশ') জানতে চাওয়া হয়েছে। শুধুমাত্র সেই অংশের উত্তর দাও।`; 
          } else {
            extraInstruction = "\n\nআরো তথ্যের জন্য দেওয়া ছবিটিও দেখুন এবং প্রশ্ন ও ছবি দুইটি মিলিয়ে সম্পূর্ণ উত্তর দিন।";
          }
          prompt = getPromptForQuestionType(questionType, questionText + extraInstruction, contextPrompt);
        } else {
          prompt = getPromptForQuestionType(questionType, questionText, contextPrompt);
        }
      }
      
      // Handle image upload
      let imageBase64 = "";
      if (imageFile) {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      // If only image (no text), add a basic prompt with context
      if (!questionText.trim() && imageFile) {
        let contextPrompt = "";
        if (questionType === 'সৃজনশীল') {
          contextPrompt = `আপনি MathGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।

ছবিতে সৃজনশীল প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে প্রশ্নে যতগুলো অংশ আছে (ক, খ, গ অথবা ক, খ, গ, ঘ) সেই অনুযায়ী উত্তর বাংলায় দাও। গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। বাংলা টেক্সট এবং math expressions একই লাইনে লিখো। অনর্থক line break দিও না।

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না।**`;
        } else if (questionType === 'বহুনির্বাচনী') {
          contextPrompt = `আপনি MathGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।

ছবিতে বহুনির্বাচনী প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে এই format এ উত্তর বাংলায় দাও:

**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)

**সমাধান:**
- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও
- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো  
- বাংলা টেক্সট এবং math একই লাইনে রাখো

**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)

গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। অনর্থক line break দিও না।

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না।**`;
        } else {
          contextPrompt = `আপনি MathGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।

ছবিতে প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে উত্তর বাংলায় দাও। গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। বাংলা টেক্সট এবং math expressions একই লাইনে লিখো।

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না।**`;
        }
        prompt = contextPrompt;
      }

      const resp = await fetch("https://geminiai-render.onrender.com/api/mathgpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          prompt: prompt,
          imageUrl: imageBase64 || undefined
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setAnswer(data.result || "No answer received.");
        // --- Google Sheet Logger ---
  // Removed spreadsheetId and sheetName; now handled by backend
        let imageBase64ForSheet = "";
        if (imageFile) {
          const compressForSheet = async (file, { maxWidth = 400, maxHeight = 400, quality = 0.4 } = {}) => {
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
            const mime = (file.type === 'image/png' && ctx.getImageData(0,0,1,1).data[3] === 255) ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
            const compressedDataUrl = canvas.toDataURL(mime, quality);
            return compressedDataUrl.split(',')[1];
          };
          try {
            imageBase64ForSheet = await compressForSheet(imageFile);
          } catch {
            imageBase64ForSheet = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result.split(',')[1]); fr.onerror = reject; fr.readAsDataURL(imageFile); });
          }
          if (imageBase64ForSheet.length > 20000) imageBase64ForSheet = imageBase64ForSheet.substring(0, 20000);
        }
        let answerTextForSheet = data.result || "No answer received.";
        if (answerTextForSheet.length > 20000) answerTextForSheet = answerTextForSheet.substring(0, 20000);
        const rowData = [
          "", // user (empty for now)
          "MathGPT", // model
          selectedClass,
          selectedSubject,
          selectedChapter,
          questionType,
          questionText,
          imageBase64ForSheet,
          answerTextForSheet
        ];
        // --- Google Sheet Logger ---
        fetch('https://geminiai-render.onrender.com/api/googleSheetLogger/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowData })
        });
        // --- End Google Sheet Logger ---
      } else {
        const errorText = await resp.text();
        setAnswer("Error: " + errorText);
      }
    } catch (err) {
      setAnswer("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
      <div className="container mx-auto p-4 max-w-2xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-4 text-center">MathGPT AI Assistant</h1>
        <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
          {!hideSelectors && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <select
                className="select select-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              >
                <option value="">শ্রেণি</option>
                {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              >
                <option value="">বিষয়</option>
                {subjects.map((sub, i) => <option key={i} value={sub}>{sub}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
              >
                <option value="">অধ্যায়</option>
                {chapters.map((chap, i) => <option key={i} value={chap}>{chap}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                value={questionType}
                onChange={e => setQuestionType(e.target.value)}
              >
                <option value="">প্রশ্নের ধরণ</option>
                {questionTypes.map((type, i) => <option key={i} value={type.value}>{type.label}</option>)}
              </select>
            </div>
          )}

          <div className="mb-4">
            <textarea
              className="textarea textarea-bordered w-full text-sm"
              rows={3}
              placeholder="প্রশ্ন লিখুন..."
              value={questionText}
              onChange={handleTextChange}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-sm">অথবা ছবি আপলোড করুন:</label>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full text-sm" onChange={handleImageChange} />
            {imagePreviewUrl && <div className="mt-2"><img src={imagePreviewUrl} alt="Uploaded" className="max-h-32 w-auto rounded shadow mx-auto block" /></div>}
          </div>
          <button className="btn btn-primary w-full text-sm sm:text-base" type="submit" disabled={loading || (!questionText.trim() && !imageFile)}>
            {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
          </button>
        </form>
        {answer && (
          <div className="bg-base-100 rounded shadow p-3 sm:p-4 text-base sm:text-lg text-base-content overflow-hidden">
            <span className="font-bold">উত্তর:</span>
            <div 
              className="answer-content overflow-x-auto"
              style={{
                lineHeight: '1.8', 
                wordSpacing: '0.1em',
                marginTop: '0.5rem',
                contain: 'layout style paint',
                willChange: 'contents'
              }}
            >
              {/* Use memoized content to prevent unnecessary re-renders */}
              {memoizedAnswerContent}
            </div>
          </div>
        )}
      </div>
  );
}

export default MathGPTPage;