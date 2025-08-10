import React, { useEffect, useMemo, useRef, useState } from "react";
import "mathlive";
import MathRendererWithContext from "../Components/MathRenderer/MathRenderer";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemma-3n-e2b-it:free";

function Gemma3nSolvePage() {
  // Core state
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);

  // Math keyboard and caret insertion
  const questionTextareaRef = useRef(null);
  const mathFieldRef = useRef(null);
  const [useMathKeyboard, setUseMathKeyboard] = useState(false);
  const [mathKeyboardLatex, setMathKeyboardLatex] = useState("");

  const questionTypes = [
    { value: "জ্ঞানমূলক", label: "জ্ঞানমূলক" },
    { value: "অনুধাবন", label: "অনুধাবন" },
    { value: "বহুনির্বাচনী", label: "বহুনির্বাচনী" },
    { value: "গাণিতিক প্রশ্ন", label: "গাণিতিক প্রশ্ন" },
    { value: "সৃজনশীল", label: "সৃজনশীল" },
  ];

  // Fetch mapping
  useEffect(() => {
    let cancelled = false;
    setMappingLoading(true);
    fetch(
      "https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" +
        Date.now()
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMapping(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMapping([]);
      })
      .finally(() => {
        if (!cancelled) setMappingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute dynamic options
  const classes = useMemo(
    () => Array.from(new Set(mapping.map((m) => m["শ্রেণি"]).filter(Boolean))),
    [mapping]
  );

  let subjects = [];
  if (selectedClass) {
    const filteredItems = mapping.filter((m) => m["শ্রেণি"] === selectedClass);
    subjects = filteredItems
      .map((item) => item["বিষয়"] || item.বিষয় || Object.values(item)[1])
      .filter(Boolean);
    subjects = Array.from(new Set(subjects));
  }

  const chapters = selectedClass && selectedSubject
    ? (() => {
        const selectedMapping = mapping.find(
          (m) =>
            m["শ্রেণি"] === selectedClass &&
            (m["বিষয়"] || Object.values(m)[1]) === selectedSubject
        );
        const chapterObj =
          selectedMapping?.["অধ্যায়"] || (selectedMapping && Object.values(selectedMapping)[2]) || {};
        return Object.keys(chapterObj);
      })()
    : [];

  // Insert LaTeX into question at caret
  const insertIntoQuestion = (snippet) => {
    const input = questionTextareaRef.current;
    const value = questionText || "";
    const start = input ? input.selectionStart : value.length;
    const end = input ? input.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = before + snippet + after;
    setQuestionText(next);
    requestAnimationFrame(() => {
      if (!input) return;
      const caret = start + snippet.length;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  // Keep math-field value in sync when shown
  useEffect(() => {
    if (!useMathKeyboard || !mathFieldRef.current) return;
    const mf = mathFieldRef.current;
    try {
      if (typeof mf.setValue === "function") mf.setValue(mathKeyboardLatex || "");
  } catch {
      // no-op
    }
  }, [useMathKeyboard, mathKeyboardLatex]);

  // Prompt helper for types
  const buildPromptForType = (type, userQuestion, contextPrompt) => {
    const basePrompt =
      (contextPrompt ||
        `আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**\n\n` +
          `গুরুত্বপূর্ণ formatting নিয়ম:\n` +
          `- বাংলা টেক্সট এবং math expressions একই লাইনে লিখো\n` +
          `- শুধুমাত্র নতুন বিষয় বা section এর জন্য নতুন paragraph ব্যবহার করো\n` +
          `- Math expressions এর আগে বা পরে অনর্থক line break দিও না\n` +
          `- উদাহরণ: "অবস্থান ভেক্টরকে $\\vec{r}$ দ্বারা প্রকাশ করা হয়।" - এভাবে একই লাইনে লিখো\n\n` +
          `উত্তরের structure:\n- তালিকার জন্য proper markdown formatting ব্যবহার করো\n- প্রতিটি নতুন বিষয়ের জন্য নতুন paragraph শুরু করো\n\n` +
          `কখনোই কোনো AI মডেলের নাম উল্লেখ করবে না। কোনো সম্ভাষণ ব্যবহার করবে না, সরাসরি উত্তর দাও।`) +
      "\n\n";

    switch (type) {
      case "জ্ঞানমূলক":
        return (
          basePrompt +
          `এটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (১-২ লাইনে)।\n\nপ্রশ্ন: ${userQuestion}`
        );
      case "অনুধাবন":
        return (
          basePrompt +
          `এটি একটি অনুধাবনমূলক প্রশ্ন। এই exact format অনুসরণ করো:\n\n**সংজ্ঞা:** (১-২ লাইনে)\n\n**ব্যাখ্যা:** (৩-৫ বাক্যে)\n\nপ্রশ্ন: ${userQuestion}`
        );
      case "বহুনির্বাচনী":
        return (
          basePrompt +
          `এটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:**\n\n**সমাধান:**\n- শর্টকাট থাকলে ব্যবহার করো\n- না থাকলে ধাপে ধাপে দেখাও\n\n**Calculator Hacks:** (যদি থাকে)\n\nপ্রশ্ন: ${userQuestion}`
        );
      case "গাণিতিক প্রশ্ন":
        return (
          basePrompt +
          `এটি একটি গাণিতিক প্রশ্ন। ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n**প্রয়োজনীয় সূত্র:**\n**সমাধান:**\n**উত্তর:**\n\nপ্রশ্ন: ${userQuestion}`
        );
      case "সৃজনশীল":
        return (
          basePrompt +
          `এটি একটি সৃজনশীল প্রশ্ন। অংশ অনুযায়ী উত্তর দাও (ক/খ/গ/ঘ)।\n\nপ্রশ্ন: ${userQuestion}`
        );
      default:
        return basePrompt + `প্রশ্ন: ${userQuestion}`;
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ নির্বাচন করুন।");
      return;
    }
    if (!questionText.trim()) {
      setAnswer("প্রশ্ন লিখুন।");
      return;
    }

    setLoading(true);
    setAnswer("");
    try {
      // Find chapter content URL
      const selectedMapping = mapping.find(
        (m) =>
          m["শ্রেণি"] === selectedClass &&
          (m["বিষয়"] || Object.values(m)[1]) === selectedSubject
      );
      const chapterObj =
        selectedMapping?.["অধ্যায়"] || (selectedMapping && Object.values(selectedMapping)[2]) || {};
      const chapterUrl = chapterObj[selectedChapter];

      // Fetch chapter content (optional)
      let chapterContent = "";
      if (chapterUrl) {
        try {
          const chapterRes = await fetch(chapterUrl);
          if (chapterRes.ok) {
            chapterContent = await chapterRes.text();
            // Clean HTML safely using RegExp constructors (avoid JSX parsing issues)
            chapterContent = chapterContent
              .replace(new RegExp("<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>", "gi"), "")
              .replace(new RegExp("<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>", "gi"), "")
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .substring(0, 8000);
          }
  } catch {
          // ignore chapter fetch errors
        }
      }

      let contextPrompt = `আপনি H.M. Tutoring AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।`;
      if (chapterContent) {
        contextPrompt += `\n\nঅধ্যায়ের বিষয়বস্তু:\n${chapterContent.substring(0, 4000)}\n\n`;
      }

      const fullPrompt = buildPromptForType(questionType, questionText, contextPrompt);

      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      if (!apiKey) {
        setAnswer("OpenRouter API key সেট করা নেই।");
        setLoading(false);
        return;
      }

      const body = {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.4,
      };

  const resp = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "H.M. Tutoring",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`OpenRouter ${resp.status}: ${txt}`);
      }
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "কোনো উত্তর পাওয়া যায়নি।";
      setAnswer(content);
  } catch {
      setAnswer("দুঃখিত, কিছু ত্রুটি ঘটেছে। পরে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-3 sm:p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Gemma 3n DoubtSolve</h1>
      <form onSubmit={handleAsk} className="bg-base-100 rounded shadow p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); if (answer) setAnswer(''); }} disabled={mappingLoading}>
            <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
            {classes.map((cls, i) => <option key={i} value={cls}>{cls}</option>)}
          </select>

          {selectedClass ? (
            <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter(''); if (answer) setAnswer(''); }} disabled={mappingLoading}>
              <option value="">বিষয়</option>
              {subjects.map((subj, i) => <option key={i} value={subj}>{subj}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled><option value="">প্রথমে শ্রেণি নির্বাচন করুন</option></select>
          )}

          {selectedClass && selectedSubject ? (
            <select className="select select-bordered w-full text-sm" value={selectedChapter} onChange={(e) => { setSelectedChapter(e.target.value); if (answer) setAnswer(''); }} disabled={mappingLoading}>
              <option value="">অধ্যায়</option>
              {chapters.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled><option value="">প্রথমে বিষয় নির্বাচন করুন</option></select>
          )}

          <select className="select select-bordered w-full text-sm" value={questionType} onChange={(e) => { setQuestionType(e.target.value); if (answer) setAnswer(''); }}>
            <option value="">প্রশ্নের ধরণ</option>
            {questionTypes.map((t, i) => <option key={i} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <textarea
            ref={questionTextareaRef}
            className="textarea textarea-bordered w-full text-sm"
            rows={4}
            placeholder="প্রশ্ন লিখুন..."
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value);
              if (answer) setAnswer("");
            }}
          />
        </div>

  <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-xs"
            onClick={() => setUseMathKeyboard((v) => !v)}
            title="Equation keyboard"
          >
            {useMathKeyboard ? "কিবোর্ড লুকান" : "কিবোর্ড চালু"}
          </button>
        </div>

        {useMathKeyboard && (
          <div>
            <math-field
              ref={mathFieldRef}
              style={{ width: "100%", fontSize: "1rem", background: "var(--b2)", color: "inherit" }}
              virtual-keyboard-mode="manual"
              onInput={(e) => {
                const mf = e.currentTarget;
                const latex = typeof mf.getValue === "function" ? mf.getValue() : mf.value;
                setMathKeyboardLatex(latex || "");
              }}
            />
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => mathFieldRef.current?.executeCommand?.("showVirtualKeyboard")}
              >
                কিবোর্ড খুলুন
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => mathFieldRef.current?.executeCommand?.("hideVirtualKeyboard")}
              >
                কিবোর্ড বন্ধ
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => mathFieldRef.current?.executeCommand?.("toggleVirtualKeyboard")}
              >
                টগল
              </button>
              <button
                type="button"
                className="btn btn-primary btn-xs"
                disabled={!mathKeyboardLatex.trim()}
                onClick={() =>
                  mathKeyboardLatex &&
                  insertIntoQuestion(
                    /^\${1,2}[\s\S]*\${1,2}$/.test(mathKeyboardLatex)
                      ? mathKeyboardLatex
                      : `$${mathKeyboardLatex}$`
                  )
                }
              >
                প্রশ্নে যোগ করুন
              </button>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary w-full text-sm sm:text-base"
          type="submit"
          disabled={loading || !questionText.trim()}
        >
          {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
        </button>
      </form>

      {answer && (
        <div className="bg-base-100 rounded shadow p-3 sm:p-4 mt-3 text-base sm:text-lg text-base-content overflow-hidden">
          <span className="font-bold">উত্তর:</span>
          <div className="answer-content overflow-x-auto" style={{ lineHeight: "1.8", wordSpacing: "0.1em", marginTop: "0.5rem" }}>
            <MathRendererWithContext text={answer} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Gemma3nSolvePage;


