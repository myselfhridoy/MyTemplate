import React, { useState, useEffect, useCallback, useMemo } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

function AIChatPage({
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

  // Fetch mapping (same as BookContentPage)
  useEffect(() => {
    setMappingLoading(true);
    console.log('Starting to fetch mapping data...');
    
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" + Date.now())
      .then((res) => {
        console.log('Fetch response status:', res.status, res.statusText);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Mapping data fetched successfully:', data.length, 'items');
        if (Array.isArray(data) && data.length > 0) {
          setMapping(data);
        } else {
          console.warn('Invalid data structure received:', data);
          throw new Error('Invalid data structure');
        }
      })
      .catch((err) => {
        console.error('Error fetching mapping:', err);
        setMapping([]);
      })
      .finally(() => setMappingLoading(false));
  }, []);

  // Sync override props to state if they change
  useEffect(() => { if (classOverride !== undefined) setSelectedClass(classOverride); }, [classOverride]);
  useEffect(() => { if (subjectOverride !== undefined) setSelectedSubject(subjectOverride); }, [subjectOverride]);
  useEffect(() => { if (chapterOverride !== undefined) setSelectedChapter(chapterOverride); }, [chapterOverride]);
  useEffect(() => { if (questionTypeOverride !== undefined) setQuestionType(questionTypeOverride); }, [questionTypeOverride]);

  // Dynamic options (same logic as BookContentPage)
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
    const formattingBlock = `আপনি H.M. Tutoring AI Chat Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** \n\n**গুরুত্বপূর্ণ formatting নিয়ম:**\n- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো\n- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো\n- Math expressions এর আগে বা পরে অনর্থক line break দিও না\n- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো\n\nউত্তরের structure:\n- তালিকার জন্য proper markdown formatting ব্যবহার করো\n- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো\n\n**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।**`;
    const basePrompt = formattingBlock + (contextPrompt ? ("\n\n" + contextPrompt) : "");
    
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

  // Debounced input handler to prevent frequent re-renders
  const handleTextChange = useCallback((e) => {
    const value = e.target.value;
    setQuestionText(value);
    // Clear previous answer immediately when user starts typing to reduce lag
    if (answer && value.length > 0) {
      setAnswer("");
    }
  }, [answer]);

  // Memoized answer content to prevent unnecessary re-renders
  const memoizedAnswerContent = useMemo(() => {
    if (!answer || !answer.trim()) return null;
    return <MathRendererWithContext text={answer} />;
  }, [answer]);

  const handleImageChange = (e) => {
    // Clear previous answer when new image is selected to reduce lag
    if (answer) {
      setAnswer("");
    }
    
    // Clean up previous image URL to prevent memory leaks
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    
    const file = e.target.files[0];
    setImageFile(file);
    
    // Create new preview URL
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    }
  };

  // Convert image file to data URL for EaseMate API
  const convertImageToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    
    // Validation: Check if all required fields are selected
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ দিন।");
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
            // Clean up HTML content - remove tags and extra whitespace
            chapterContent = chapterContent
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 8000); // Limit content size
          }
        } catch (error) {
          console.warn('Failed to fetch chapter content:', error);
        }
      }
      
      // Prepare prompt with context
      let contextPrompt = `আপনি H.M. Tutoring AI Chat Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
      
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

**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।**`;

      let finalPrompt = "";
      let imageUrl = null;

      // Prepare the final prompt based on input
      if (questionText.trim()) {
        // If both text and image are provided, mention both in the prompt
        if (imageFile) {
          let extraInstruction = "";
          if (questionType === 'সৃজনশীল') {
            extraInstruction = `\n\nছবিতে সৃজনশীল প্রশ্নের নির্দিষ্ট অংশ (যেমন 'খ অংশ', 'গ অংশ', 'ঘ অংশ') জানতে চাওয়া হয়েছে। শুধুমাত্র সেই অংশের উত্তর দাও।`; 
          } else {
            extraInstruction = "\n\nআরো তথ্যের জন্য দেওয়া ছবিটিও দেখুন এবং প্রশ্ন ও ছবি দুইটি মিলিয়ে সম্পূর্ণ উত্তর দিন।";
          }
          finalPrompt = getPromptForQuestionType(questionType, questionText + extraInstruction, contextPrompt);
        } else {
          finalPrompt = getPromptForQuestionType(questionType, questionText, contextPrompt);
        }
      } else if (imageFile) {
        // If only image (no text), add a basic prompt with context
        if (questionType === 'সৃজনশীল') {
          finalPrompt = contextPrompt + `

ছবিতে সৃজনশীল প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে প্রশ্নে যতগুলো অংশ আছে (ক, খ, গ অথবা ক, খ, গ, ঘ) সেই অনুযায়ী উত্তর বাংলায় দাও। গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। বাংলা টেক্সট এবং math expressions একই লাইনে লিখো। অনর্থক line break দিও না।`;
        } else if (questionType === 'বহুনির্বাচনী') {
          finalPrompt = contextPrompt + `

ছবিতে বহুনির্বাচনী প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে এই format এ উত্তর বাংলায় দাও:

**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)

**সমাধান:**
- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও
- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো  
- বাংলা টেক্সট এবং math একই লাইনে রাখো

**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)

গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। অনর্থক line break দিও না।`;
        } else if (questionType === 'অনুধাবন') {
          finalPrompt = contextPrompt + `

ছবিতে অনুধাবনমূলক প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে **অবশ্যই** এই exact format এ উত্তর বাংলায় দাও:

**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে। যেমন: "বেগ কী?" প্রশ্নে "নির্দিষ্ট দিকে কোনো বস্তুর সরণের হারকে বেগ বলে।")

**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে। প্রশ্নে যা জানতে চাওয়া হয়েছে সেটার সরাসরি উত্তর দাও।)

**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**

গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। বাংলা টেক্সট এবং math expressions একই লাইনে লিখো। অনর্থক line break দিও না।`;
        } else if (questionType === 'গাণিতিক প্রশ্ন') {
          finalPrompt = contextPrompt + `

ছবিতে গাণিতিক প্রশ্ন আছে। ছবির সব অংশ বিশ্লেষণ করে এই format এ ধাপে ধাপে সমাধান বাংলায় দাও:

**প্রদত্ত তথ্য:**
(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)

**প্রয়োজনীয় সূত্র:**
(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)

**সমাধান:**
(প্রতিটি ধাপ আলাদা paragraph এ লিখো)

**উত্তর:**
(চূড়ান্ত উত্তর)

গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও। বাংলা টেক্সট এবং math expressions একই লাইনে লিখো।`;
        } else {
          finalPrompt = contextPrompt + `

আপনার কাজ:
- ছবির সব লেখা, চিত্র, প্রশ্ন, গাণিতিক অংশ, এবং context বিশ্লেষণ করো
- ছবির প্রতিটি relevant অংশ বাংলায় ব্যাখ্যা করো
- গাণিতিক অংশ MathJax ফরম্যাটে \`$...$\` এর ভিতরে দাও
- উদাহরণ: "ছবিতে যদি গাণিতিক প্রশ্ন থাকে, তাহলে ধাপে ধাপে সমাধান দাও"
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- অনর্থক line break দিও না

ছবির সম্পূর্ণ বিশ্লেষণ করে উত্তর বাংলায় দাও।`;
        }
      } else {
        setAnswer("প্রশ্ন লিখুন বা ছবি দিন।");
        setLoading(false);
        return;
      }

      // Handle image upload if present
      if (imageFile) {
        const dataUrl = await convertImageToDataUrl(imageFile);
        imageUrl = dataUrl;
      }

      // Call EaseMate API
      const requestBody = {
        action: 'chat',
        prompt: finalPrompt,
        imageUrl: imageUrl
      };

      console.log("Calling EaseMate API...");
      const response = await fetch('https://hmtutoring-backend.onrender.com/api/easemate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EaseMate API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.answer && data.answer.trim()) {
        setAnswer(data.answer);
      } else {
        setAnswer('কোনো উত্তর পাওয়া যায়নি।');
      }

    } catch (error) {
      console.error('API Error:', error);
      setAnswer("উত্তর আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">AI Chat</h1>
        <form 
          className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" 
          onSubmit={handleAsk}
          style={{
            // Optimize form rendering
            contain: 'layout',
            willChange: 'contents'
          }}
        >
          {!hideSelectors ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={e => { 
                setSelectedClass(e.target.value); 
                setSelectedSubject(''); 
                setSelectedChapter(''); 
                if (answer) setAnswer('');
              }} disabled={mappingLoading}>
                <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
                {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
              </select>
              {selectedClass && (
                <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={e => { 
                  setSelectedSubject(e.target.value); 
                  setSelectedChapter(''); 
                  if (answer) setAnswer('');
                }} disabled={mappingLoading}>
                  <option value="">বিষয়</option>
                  {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
                </select>
              )}
              {!selectedClass && (
                <select className="select select-bordered w-full text-sm" disabled>
                  <option value="">প্রথমে শ্রেণি নির্বাচন করুন</option>
                </select>
              )}
              {selectedClass && selectedSubject && (
                <select className="select select-bordered w-full text-sm" value={selectedChapter} onChange={e => {
                  setSelectedChapter(e.target.value);
                  if (answer) setAnswer('');
                }} disabled={mappingLoading}>
                  <option value="">অধ্যায়</option>
                  {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
                </select>
              )}
              {(!selectedClass || !selectedSubject) && (
                <select className="select select-bordered w-full text-sm" disabled>
                  <option value="">প্রথমে বিষয় নির্বাচন করুন</option>
                </select>
              )}
              <select className="select select-bordered w-full text-sm" value={questionType} onChange={e => {
                setQuestionType(e.target.value);
                if (answer) setAnswer('');
              }}>
                <option value="">প্রশ্নের ধরণ</option>
                {questionTypes.map((type, i) => <option key={i} value={type.value}>{type.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <input
                className="input input-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                placeholder="শ্রেণি"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
              />
              <input
                className="input input-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                placeholder="বিষয়"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              />
              <input
                className="input input-bordered w-full text-sm"
                style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
                placeholder="অধ্যায়"
                value={selectedChapter}
                onChange={e => setSelectedChapter(e.target.value)}
              />
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
              style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
              placeholder="প্রশ্ন লিখুন..."
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
            />
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

export default AIChatPage;
