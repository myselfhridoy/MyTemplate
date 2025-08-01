import React, { useState, useEffect } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

function AIAssistantPage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);

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

  // Dynamic options (same logic as BookContentPage)
  const classes = Array.from(new Set(mapping.map(m => m['শ্রেণি']).filter(Boolean)));
  
  // Try alternative approach for subjects
  let subjects = [];
  if (selectedClass) {
    const filteredItems = mapping.filter(m => m['শ্রেণি'] === selectedClass);
    subjects = filteredItems.map(item => {
      // Try multiple ways to get the subject
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

  // Manual test for subjects when class is selected
  // (Removed for cleaner console)

  // Debug (can be removed)
  // console.log('Current mapping state:', mapping);
  // console.log('Classes available:', classes);
  // console.log('Selected class:', selectedClass);
  // console.log('Subjects for selected class:', subjects);
  // console.log('Selected subject:', selectedSubject);
  // console.log('Chapters for selected subject:', chapters);
  
  // Additional debug for subjects
  // (Removed for cleaner console)

  // useEffect(() => {
  //   console.log('Mapping changed:', mapping.length, 'items');
  //   if (mapping.length > 0) {
  //     console.log('Sample item:', mapping[0]);
  //   }
  // }, [mapping]);

  // Get prompt based on question type
  const getPromptForQuestionType = (type, userQuestion, contextPrompt = null) => {
    const basePrompt = contextPrompt || `আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** 

**গুরুত্বপূর্ণ formatting নিয়ম:**
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো
- Math expressions এর আগে বা পরে অনর্থক line break দিও না
- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো

উত্তরের structure:
- তালিকার জন্য proper markdown formatting ব্যবহার করো
- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো`;
    
    switch(type) {
      case 'জ্ঞানমূলক':
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)।\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'অনুধাবন':
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। বিস্তারিত ব্যাখ্যা সহ উত্তর দাও:\n- প্রথম paragraph এ সংজ্ঞা দাও\n- দ্বিতীয় paragraph এ বিস্তারিত ব্যাখ্যা দাও\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'বহুনির্বাচনী':
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সমাধান:**\n- প্রথমে দ্রুত সমাধানের কৌশল লিখো\n- তারপর শর্টকাট ফর্মুলা দাও (বাংলা টেক্সট এবং math একই লাইনে রাখো)\n- শেষে সঠিক উত্তর নির্বাচন করো\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)\n\n**প্রয়োজনীয় সূত্র:**\n(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)\n\n**সমাধান:**\n(প্রতিটি ধাপ আলাদা paragraph এ লিখো)\n\n**উত্তর:**\n(চূড়ান্ত উত্তর)\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'সৃজনশীল':
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। এই format এ উত্তর দাও:\n\n**ক অংশ:** (সংক্ষিপ্ত উত্তর)\n\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর)\n\n**গ অংশ:** (গাণিতিক সমাধান)\n\n**ঘ অংশ:** (বিশ্লেষণ ও মূল্যায়ন)\n\nপ্রশ্ন: ${userQuestion}`;
      
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
    }
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    
    // Validation: Check if all required fields are selected
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }
    
    setLoading(true);
    setAnswer("");
    try {
      let parts = [];
      
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
      
      // Get specific prompt based on question type
      if (questionText.trim()) {
        let contextPrompt = `আপনি H.M. Tutoring AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
        
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
- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো`;

        // If both text and image are provided, mention both in the prompt
        if (imageFile) {
          const prompt = getPromptForQuestionType(questionType, questionText + "\n\nআরো তথ্যের জন্য দেওয়া ছবিটিও দেখুন এবং প্রশ্ন ও ছবি দুইটি মিলিয়ে সম্পূর্ণ উত্তর দিন।", contextPrompt);
          parts.push({ text: prompt });
        } else {
          const prompt = getPromptForQuestionType(questionType, questionText, contextPrompt);
          parts.push({ text: prompt });
        }
      }
      
      if (imageFile) {
        // Convert image to base64
        const toBase64 = file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64 = await toBase64(imageFile);
        parts.push({
          inlineData: {
            mimeType: imageFile.type,
            data: base64
          }
        });
      }
      
      // If only image (no text), add a basic prompt with context
      if (!questionText.trim() && imageFile) {
        let contextPrompt = `আপনি H.M. Tutoring AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** বাংলা টেক্সট এবং math expressions একই লাইনে লিখো। অনর্থক line break দিও না। এই ছবিতে থাকা প্রশ্নের উত্তর দাও।`;
        // Replace the first part with image-only prompt
        parts[0] = { text: contextPrompt };
      }
      
      // Check if we have content to process
      if (parts.length === 0) {
        setAnswer("প্রশ্ন লিখুন বা ছবি দিন।");
        setLoading(false);
        return;
      }
      
      const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyANzU0ppDAFbXSVvwssbEAjJVpU_GPFSM4";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [ { parts } ] })
      });
      const data = await res.json();
      setAnswer(
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "কোনো উত্তর পাওয়া যায়নি।"
      );
    } catch (error) {
      console.error('API Error:', error);
      setAnswer("উত্তর আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">AI সহকারী</h1>
        <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); }} disabled={mappingLoading}>
              <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
              {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
            </select>
            {selectedClass && (
              <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); }} disabled={mappingLoading}>
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
              <select className="select select-bordered w-full text-sm" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} disabled={mappingLoading}>
                <option value="">অধ্যায়</option>
                {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
              </select>
            )}
            {(!selectedClass || !selectedSubject) && (
              <select className="select select-bordered w-full text-sm" disabled>
                <option value="">প্রথমে বিষয় নির্বাচন করুন</option>
              </select>
            )}
            <select className="select select-bordered w-full text-sm" value={questionType} onChange={e => setQuestionType(e.target.value)}>
              <option value="">প্রশ্নের ধরণ</option>
              {questionTypes.map((type, i) => <option key={i} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <textarea
              className="textarea textarea-bordered w-full text-sm"
              rows={3}
              placeholder="প্রশ্ন লিখুন..."
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold text-sm">অথবা ছবি আপলোড করুন:</label>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full text-sm" onChange={handleImageChange} />
            {imageFile && <div className="mt-2"><img src={URL.createObjectURL(imageFile)} alt="Uploaded" className="max-h-32 w-auto rounded shadow mx-auto block" /></div>}
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
                marginTop: '0.5rem'
              }}
            >
              <MathRendererWithContext text={answer} />
            </div>
          </div>
        )}
      </div>
  );
}

export default AIAssistantPage;
