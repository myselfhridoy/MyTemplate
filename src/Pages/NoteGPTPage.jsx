import React, { useState, useEffect, useCallback, useMemo } from "react";
import MathRendererWithContext from '../Components/MathRenderer/MathRenderer';

const NOTEGPT_BACKEND_URL = 'https://geminiai-render.onrender.com/api/notegpt/v1';

const NOTEGPT_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gpt-5.4', label: 'ChatGPT 5.4' },
  { value: 'gpt-5.2', label: 'ChatGPT 5.2' },
  { value: 'gpt-5-mini', label: 'ChatGPT 5 Mini' },
  { value: 'gpt-4.1-mini', label: 'ChatGPT 4.1 Mini' },
  { value: 'gpt-4o-mini', label: 'ChatGPT 4o Mini' },

];

const NOTEGPT_TONES = [
  { value: 'default', label: 'Default' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'academic', label: 'Academic' },
];

const NOTEGPT_LENGTHS = [
  { value: 'brief', label: 'Brief' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'detailed', label: 'Detailed' },
];

const NOTEGPT_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
];

const buildNoteGptPrompt = (selectedClass, selectedSubject, selectedChapter, taskType) => {
  const contextMap = {
    'notes': 'নোট তৈরি করো',
    'summary': 'সংক্ষিপ্ত সারাংশ তৈরি করো',
    'flashcards': 'Flashcards তৈরি করো',
    'quiz': 'কুইজ প্রশ্ন তৈরি করো',
    'revision': 'রিভিশন পয়েন্ট তৈরি করো',
  };

  let basePrompt = `আপনি NoteGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের উপর একজন দক্ষ শিক্ষক।`;

  if (taskType && contextMap[taskType]) {
    basePrompt += `\n\nআপনার কাজ হলো ${contextMap[taskType]}।`;
  }

  basePrompt += `

**গুরুত্বপূর্ণ নিয়মাবলী:**
- সব প্রশ্নের উত্তর বাংলায় দাও
- গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে লিখো
- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো
- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো

**কখনোই Gemini বা কোনো AI মডেলের নাম উত্তরে উল্লেখ করবে না।**
**কোনো ধরনের সম্ভাষণ (নমস্কার, হ্যালো, etc.) ব্যবহার করবে না, সরাসরি উত্তর দাও।`;

  return basePrompt;
};

const parseNoteGptResponse = async (resp) => {
  const text = await resp.text();
  const trimmedText = text.trim();

  if (!trimmedText) {
    return '';
  }

  try {
    return JSON.parse(trimmedText);
  } catch {
    return trimmedText;
  }
};

function NoteGPTPage({
  classOverride = undefined,
  subjectOverride = undefined,
  chapterOverride = undefined,
  hideSelectors = false
}) {

  const [selectedClass, setSelectedClass] = useState(classOverride ?? "");
  const [selectedSubject, setSelectedSubject] = useState(subjectOverride ?? "");
  const [selectedChapter, setSelectedChapter] = useState(chapterOverride ?? "");
  const [taskType, setTaskType] = useState("notes");
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [selectedTone, setSelectedTone] = useState("default");
  const [selectedLength, setSelectedLength] = useState("moderate");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

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
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Task types
  const taskTypes = [
    { value: 'notes', label: '📝 Study Notes' },
    { value: 'summary', label: '📋 Summary' },
    { value: 'flashcards', label: '🃏 Flashcards' },
    { value: 'quiz', label: '❓ Quiz Questions' },
    { value: 'revision', label: '🔄 Revision Points' },
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

  // Override effects
  useEffect(() => {
    if (classOverride !== undefined) setSelectedClass(classOverride);
  }, [classOverride]);
  useEffect(() => {
    if (subjectOverride !== undefined) setSelectedSubject(subjectOverride);
  }, [subjectOverride]);
  useEffect(() => {
    if (chapterOverride !== undefined) setSelectedChapter(chapterOverride);
  }, [chapterOverride]);

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

    setLoading(true);
    setAnswer("");
    try {
      // Build prompt based on context
      let fullPrompt = questionText;

      if (selectedClass && selectedSubject && selectedChapter) {
        const contextPrompt = buildNoteGptPrompt(selectedClass, selectedSubject, selectedChapter, taskType);
        fullPrompt = `${contextPrompt}\n\n${questionText}`;
      }

      // Handle image upload
      let imageBase64 = "";
      if (imageFile) {
        const compressImage = async (file, { maxWidth = 800, maxHeight = 800, quality = 0.7 } = {}) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
              try {
                const dataUrl = e.target.result;
                const img = await new Promise((res, rej) => {
                  const i = new window.Image();
                  i.onload = () => res(i);
                  i.onerror = rej;
                  i.src = dataUrl;
                });
                let { width, height } = img;
                const scale = Math.min(1, maxWidth / width, maxHeight / height);
                if (scale < 1) {
                  width = Math.round(width * scale);
                  height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const mime = file.type === 'image/png' ? 'image/jpeg' : file.type;
                const compressedDataUrl = canvas.toDataURL(mime, quality);
                resolve(compressedDataUrl.split(',')[1]); // Return base64 without data URL prefix
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        const fileSizeMB = imageFile.size / (1024 * 1024);
        if (fileSizeMB > 1) {
          imageBase64 = await compressImage(imageFile);
        } else {
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
        }
      }

      // Build request body
      const requestBody = {
        userMessage: fullPrompt,
        lang: selectedLanguage,
        model: selectedModel,
        tone: selectedTone,
        length: selectedLength,
      };

      if (imageBase64) {
        requestBody.imageBase64 = imageBase64;
      }

      const resp = await fetch(NOTEGPT_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (resp.ok) {
        const data = await parseNoteGptResponse(resp);
        const answerText = data?.reply || data?.message || "No answer received.";
        setAnswer(answerText);
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
      <h1 className="text-2xl font-extrabold mb-4 text-center">H.M. Tutoring AI</h1>
      <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
        {!hideSelectors && (
          <>
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
                value={taskType}
                onChange={e => setTaskType(e.target.value)}
              >
                {taskTypes.map((type, i) => <option key={i} value={type.value}>{type.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
              <select
                className="select select-bordered w-full text-sm"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
              >
                {NOTEGPT_MODELS.map((m, i) => <option key={i} value={m.value}>{m.label}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                value={selectedTone}
                onChange={e => setSelectedTone(e.target.value)}
              >
                {NOTEGPT_TONES.map((t, i) => <option key={i} value={t.value}>{t.label}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                value={selectedLength}
                onChange={e => setSelectedLength(e.target.value)}
              >
                {NOTEGPT_LENGTHS.map((l, i) => <option key={i} value={l.value}>{l.label}</option>)}
              </select>
              <select
                className="select select-bordered w-full text-sm"
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
              >
                {NOTEGPT_LANGUAGES.map((lang, i) => <option key={i} value={lang.value}>{lang.label}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="mb-4">
          <textarea
            className="textarea textarea-bordered w-full text-sm"
            rows={4}
            placeholder="আপনার প্রশ্ন বা নোট টাইপ করুন... (যেমন: এই অধ্যায়ের সংক্ষিপ্ত নোট তৈরি করো, কুইজ প্রশ্ন তৈরি করো ইত্যাদি)"
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
          {loading ? "লোড হচ্ছে..." : "নোট/উত্তর জানুন"}
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
            {memoizedAnswerContent}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteGPTPage;
