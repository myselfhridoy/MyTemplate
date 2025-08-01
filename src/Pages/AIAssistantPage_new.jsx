import React, { useState, useEffect } from "react";
import { MathJaxContext } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

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
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json")
      .then(res => res.json())
      .then(data => setMapping(Array.isArray(data) ? data : []))
      .catch(() => setMapping([]));
  }, []);

  // Dynamic options
  const classes = Array.from(new Set(mapping.map(m => m['শ্রেণি'])));
  const subjects = selectedClass
    ? Array.from(new Set(mapping.filter(m => m['শ্রেণি'] === selectedClass).map(m => m['বিষয়'])))
    : [];
  const chapters = (selectedClass && selectedSubject)
    ? Object.keys((mapping.find(m => m['শ্রেণি'] === selectedClass && m['বিষয়'] === selectedSubject)?.['অধ্যায়'] || {}))
    : [];

  // Get prompt based on question type
  const getPromptForQuestionType = (type, userQuestion) => {
    const basePrompt = `সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**`;
    
    switch(type) {
      case 'জ্ঞানমূলক':
        return basePrompt + ` এটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)। প্রশ্ন: ${userQuestion}`;
      
      case 'অনুধাবন':
        return basePrompt + ` এটি একটি অনুধাবনমূলক প্রশ্ন। বিস্তারিত ব্যাখ্যা সহ উত্তর দাও (৩-৪ লাইনে)। প্রশ্ন: ${userQuestion}`;
      
      case 'বহুনির্বাচনী':
        return basePrompt + ` এটি একটি বহুনির্বাচনী প্রশ্ন। দ্রুত সমাধানের কৌশল ও শর্টকাট ফর্মুলা সহ উত্তর দাও। প্রশ্ন: ${userQuestion}`;
      
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + ` এটি একটি গাণিতিক প্রশ্ন। ধাপে ধাপে পূর্ণাঙ্গ গাণিতিক সমাধান দাও। প্রশ্ন: ${userQuestion}`;
      
      case 'সৃজনশীল':
        return basePrompt + ` এটি একটি সৃজনশীল প্রশ্ন। ক, খ, গ, ঘ অংশের জন্য আলাদা আলাদা উত্তর দাও। প্রশ্ন: ${userQuestion}`;
      
      default:
        return basePrompt + ` প্রশ্ন: ${userQuestion}`;
    }
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAnswer("");
    try {
      let parts = [];
      
      // Get specific prompt based on question type
      if (questionText) {
        const prompt = getPromptForQuestionType(questionType, questionText);
        parts.push({ text: prompt });
      } else {
        parts.push({ text: "সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে `$...$` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**" });
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
      
      if (parts.length === 1) {
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
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] }
    }}>
      <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
        <h1 className="text-2xl font-extrabold mb-4">AI সহকারী</h1>
        <form className="bg-white dark:bg-base-200 rounded shadow p-4 sm:p-8 mb-6" onSubmit={handleAsk}>
          <div className="flex flex-wrap gap-4 mb-4">
            <select className="select select-bordered" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); }}>
              <option value="">শ্রেণি</option>
              {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
            </select>
            <select className="select select-bordered" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedChapter(''); }} disabled={!selectedClass}>
              <option value="">বিষয়</option>
              {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
            </select>
            <select className="select select-bordered" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} disabled={!selectedSubject}>
              <option value="">অধ্যায়</option>
              {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
            </select>
            <select className="select select-bordered" value={questionType} onChange={e => setQuestionType(e.target.value)}>
              <option value="">প্রশ্নের ধরণ</option>
              {questionTypes.map((type, i) => <option key={i} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <textarea
              className="textarea textarea-bordered w-full"
              rows={3}
              placeholder="প্রশ্ন লিখুন..."
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-semibold">অথবা ছবি আপলোড করুন:</label>
            <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={handleImageChange} />
            {imageFile && <div className="mt-2"><img src={URL.createObjectURL(imageFile)} alt="Uploaded" className="max-h-32 rounded shadow" /></div>}
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading || (!questionText && !imageFile)}>
            {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
          </button>
        </form>
        {answer && (
          <div className="bg-base-100 rounded shadow p-4 text-lg text-base-content prose max-w-none">
            <span className="font-bold">উত্তর:</span>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeMathjax]}
              components={{
                strong: ({...props}) => <strong className="font-bold text-primary" {...props} />,
                em: ({...props}) => <em className="italic text-secondary" {...props} />,
                h1: ({...props}) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                h2: ({...props}) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                h3: ({...props}) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                li: ({...props}) => <li className="ml-4 list-disc" {...props} />,
                code: ({...props}) => <code className="bg-base-200 px-1 rounded" {...props} />,
                math: ({value}) => <span style={{whiteSpace:'nowrap', display:'inline-block', verticalAlign:'middle', margin:'0 0.25em', wordBreak:'break-word', lineHeight:'2.1', padding:'0 2px'}}>{`\\displaystyle ${value}`}</span>,
                inlineMath: ({value}) => <span style={{whiteSpace:'nowrap', display:'inline-block', verticalAlign:'middle', margin:'0 0.15em', wordBreak:'break-word', lineHeight:'2.1', padding:'0 2px'}}>{value}</span>,
              }}
            >
              {answer
                // Add space before $ or \displaystyle if missing
                ?.replace(/([^\s])((\\displaystyle)|\$)/g, '$1 $2')
                // Add space after $ or \) if missing
                ?.replace(/(\$|\\\))([^\s])/g, '$1 $2')
              }
            </ReactMarkdown>
          </div>
        )}
      </div>
    </MathJaxContext>
  );
}

export default AIAssistantPage;
