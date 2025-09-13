import React, { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import MathRenderer from "../Components/MathRenderer/MathRenderer";

// Use a server-side proxy to avoid exposing token or token-source URL to the client.
const API_URL = "https://hmtutoring-backend.onrender.com/api/ai-free-chatpdf";

const ChatPDFPage = ({
  classOverride = undefined,
  subjectOverride = undefined,
  chapterOverride = undefined,
  questionTypeOverride = undefined,
  hideSelectors = false
}) => {
  const [selectedClass, setSelectedClass] = useState(classOverride ?? "");
  const [selectedSubject, setSelectedSubject] = useState(subjectOverride ?? "");
  const [selectedChapter, setSelectedChapter] = useState(chapterOverride ?? "");
  const [questionType, setQuestionType] = useState(questionTypeOverride ?? "");
  useEffect(() => { if (classOverride !== undefined) setSelectedClass(classOverride); }, [classOverride]);
  useEffect(() => { if (subjectOverride !== undefined) setSelectedSubject(subjectOverride); }, [subjectOverride]);
  useEffect(() => { if (chapterOverride !== undefined) setSelectedChapter(chapterOverride); }, [chapterOverride]);
  useEffect(() => { if (questionTypeOverride !== undefined) setQuestionType(questionTypeOverride); }, [questionTypeOverride]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = React.useRef();
  // conversation_id and idToken should persist for the session (until page refresh)
  const [conversationId] = useState(() => uuidv4());
  const [idToken, setIdToken] = useState(null);

  // Fetch idToken on page load/refresh
  useEffect(() => {
    fetch("https://hmtutoring-backend.onrender.com/api/ai-free/ai-free")
      .then(res => res.json())
      .then(data => setIdToken(data.idToken || null))
      .catch(() => setIdToken(null));
  }, []);
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const memoizedAnswerContent = useMemo(() => {
    if (!answer || !answer.trim()) return null;
    return <MathRenderer text={answer} />;
  }, [answer]);

  useEffect(() => {
    setMappingLoading(true);
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" + Date.now())
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMapping(data);
        } else {
          setMapping([]);
        }
      })
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
        const selectedMapping = mapping.find(m =>
          m['শ্রেণি'] === selectedClass &&
          (m['বিষয়'] || Object.values(m)[1]) === selectedSubject
        );
        const chapterObj = selectedMapping?.['অধ্যায়'] || selectedMapping && Object.values(selectedMapping)[2] || {};
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

  const handleFileChange = (e) => {
    if (answer) setAnswer("");
    const selected = e.target.files[0];
    setFile(selected);
    if (selected && selected.type.startsWith('image/')) {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      const previewUrl = URL.createObjectURL(selected);
      setImagePreviewUrl(previewUrl);
    } else {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
    }
  };

  const getPromptForQuestionType = (type, userQuestion, contextPrompt = null) => {
    const safeQuestion = userQuestion && userQuestion.trim() ? userQuestion : "ছবিতে দেওয়া প্রশ্নটি দেখুন।";
    const formattingBlock = `আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** \n\n**গুরুত্বপূর্ণ formatting নিয়ম:**\n- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো\n- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো\n- Math expressions এর আগে বা পরে অনর্থক line break দিও না\n- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো\n\nউত্তরের structure:\n- তালিকার জন্য proper markdown formatting ব্যবহার করো\n- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো\n\n**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তর বা পরিচয়ে উল্লেখ করবে না।**\n**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।**`;
    const basePrompt = formattingBlock + (contextPrompt ? ("\n\n" + contextPrompt) : "");
    switch(type) {
      case 'জ্ঞানমূলক':
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)।\n\nপ্রশ্ন: ${safeQuestion}`;
      case 'অনুধাবন':
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। **অবশ্যই** এই exact format এ উত্তর দাও:\n\n**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে। যেমন: "বেগ কী?" প্রশ্নে "নির্দিষ্ট দিকে কোনো বস্তুর সরণের হারকে বেগ বলে।")\n\n**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে। প্রশ্নে যা জানতে চাওয়া হয়েছে সেটার সরাসরি উত্তর দাও।)\n\n**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**\n\nপ্রশ্ন: ${safeQuestion}`;
      case 'বহুনির্বাচনী':
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)\n\n**সমাধান:**\n- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও\n- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো\n- বাংলা টেক্সট এবং math একই লাইনে রাখো\n\n**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)\n\nপ্রশ্ন: ${safeQuestion}`;
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)\n\n**প্রয়োজনীয় সূত্র:**\n(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)\n\n**সমাধান:**\n(প্রতিটি ধাপ আলাদা paragraph এ লিখো)\n\n**উত্তর:**\n(চূড়ান্ত উত্তর)\n\nপ্রশ্ন: ${safeQuestion}`;
      case 'সৃজনশীল':
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রশ্নে যতগুলো অংশ আছে সেই অনুযায়ী উত্তর দাও। উদাহরণ:\n\n**যদি ক, খ, গ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর)\n**গ অংশ:** (গাণিতিক সমাধান)\n\n**যদি ক, খ, গ, ঘ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর)\n**গ অংশ:** (গাণিতিক সমাধান)\n**ঘ অংশ:** (বিশ্লেষণ ও মূল্যায়ন)\n\nপ্রশ্ন: ${safeQuestion}`;
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${safeQuestion}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setError("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      setLoading(false);
      return;
    }
    if (!question.trim() && !file) {
      setError("প্রশ্ন লিখুন অথবা ফাইল দিন।");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setAnswer("");
    try {
  const message_id = uuidv4();
  const formData = new FormData();
  formData.append("conversation_id", conversationId);
  formData.append("message_id", message_id);
      const context = `আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
      const prompt = getPromptForQuestionType(questionType, question, context);
      formData.append("content", prompt);
      formData.append("model", "gemini-2.5-flash");
      if (file) {
        formData.append("attachments", file);
      }
      formData.append("max_mode", "false");
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: idToken ? { "authorization": `Bearer ${idToken}` } : {},
      });
      if (!response.ok) {
        setLoading(false);
        // Only clear preview on error, keep file and file input so user can retry in same conversation
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
        }
        setImagePreviewUrl(null);
        throw new Error("API Error: " + response.status);
      }
      const reader = response.body.getReader();
      let result = "";
      const decoder = new TextDecoder('utf-8');
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setAnswer(result);
      }
      result += decoder.decode();
      setAnswer(result);
      // Clear file input and preview after success
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">ChatPDF</h1>
      <form 
        className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" 
        onSubmit={handleSubmit}
        style={{ contain: 'layout', willChange: 'contents' }}
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
            rows={4}
            placeholder="প্রশ্ন লিখুন..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold text-sm">অথবা ফাইল আপলোড করুন:</label>
          <input type="file" className="file-input file-input-bordered w-full text-sm" onChange={handleFileChange} ref={fileInputRef} />
          {imagePreviewUrl && <div className="mt-2"><img src={imagePreviewUrl} alt="Uploaded" className="max-h-32 w-auto rounded shadow mx-auto block" /></div>}
          {file && !file.type.startsWith('image/') && <div className="mt-2 text-xs text-gray-600">ফাইল যুক্ত হয়েছে: {file.name}</div>}
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full text-sm sm:text-base"
          disabled={loading || (!question.trim() && !file)}
        >
          {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
        </button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
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
            {memoizedAnswerContent}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPDFPage;
