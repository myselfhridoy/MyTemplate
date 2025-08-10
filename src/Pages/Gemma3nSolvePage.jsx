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

  // Normalize alternate math delimiters to inline MathJax `$...$` without touching the renderer
  const normalizeMathDelimiters = (text) => {
    if (!text) return text;
    try {
      let out = String(text);
      // Convert \( ... \) and \[ ... \] to $ ... $
      out = out.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$');
      out = out.replace(/\\\[([\s\S]*?)\\\]/g, '$$$1$');
      // Convert $$ ... $$ blocks to inline $ ... $
      out = out.replace(/\$\$([\s\S]*?)\$\$/g, '$$$1$');
      return out;
    } catch {
      return text;
    }
  };

  // Prompt helper for types (aligned with AIAssistantPage)
  const buildPromptForType = (type, userQuestion, contextPrompt = null) => {
    const basePrompt = contextPrompt || `আপনি H.M. Tutoring AI Assistant। সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।** 

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

    switch (type) {
      case 'জ্ঞানমূলক':
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)। গাণিতিক সংজ্ঞা, সূত্র বা মান থাকলে অবশ্যই $...$ এর মধ্যে লিখবে।\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'অনুধাবন':
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। **অবশ্যই** এই format এ উত্তর দাও:\n\n**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে। যেমন: "বেগ কী?" প্রশ্নে "নির্দিষ্ট দিকে কোনো বস্তুর সরণের হারকে বেগ বলে, যা $v = \\frac{ds}{dt}$ সূত্র দ্বারা প্রকাশ করা হয়।")\n\n**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে। গাণিতিক চিহ্ন, সূত্র বা সমীকরণ অবশ্যই $...$ এর মধ্যে লিখবে।)\n\n**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'বহুনির্বাচনী':
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো। যদি গাণিতিক মান হয় তবে $...$ এর মধ্যে লিখবে)\n\n**সমাধান:**\n- শর্টকাট ফর্মুলা থাকলে সেটি $...$ এর মধ্যে লিখে ব্যবহার করে দ্রুত সমাধান দেখাও\n- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো\n- প্রতিটি গাণিতিক সূত্র, মান বা এক্সপ্রেশন $...$ এর মধ্যে লিখবে\n- বাংলা টেক্সট এবং math একই লাইনে রাখো\n\n**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও। কোড বা sequence $...$ এর মধ্যে লিখবে)\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'গাণিতিক প্রশ্ন':
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n- প্রদত্ত সব তথ্য তালিকা আকারে লিখো\n- সব গাণিতিক মান $...$ এর মধ্যে লিখবে\n- উদাহরণ: বস্তুর ভর $m = 5$ kg\n\n**প্রয়োজনীয় সূত্র:**\n- ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে\n- প্রতিটি সূত্র অবশ্যই $...$ এর মধ্যে লিখবে\n- উদাহরণ: বল $F = ma$ যেখানে $F$ হল বল, $m$ হল ভর, $a$ হল ত্বরণ\n\n**সমাধান:**\n- প্রতিটি ধাপ আলাদা paragraph এ লিখো\n- সব গাণিতিক এক্সপ্রেশন $...$ এর মধ্যে লিখবে\n- প্রতিটি ধাপে কী করা হচ্ছে তা বাংলায় ব্যাখ্যা করে তারপর গাণিতিক সমাধান দেখাও\n\n**উত্তর:**\n- চূড়ান্ত উত্তর $...$ এর মধ্যে লিখবে\n- উত্তরের একক (unit) থাকলে সেটাও $...$ এর মধ্যে লিখবে\n\nপ্রশ্ন: ${userQuestion}`;
      
      case 'সৃজনশীল':
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রশ্নে যতগুলো অংশ আছে সেই অনুযায়ী উত্তর দাও। মনে রাখবে:\n- সব গাণিতিক সূত্র, মান ও সমীকরণ $...$ এর মধ্যে লিখতে হবে\n- বাংলা ব্যাখ্যা ও গাণিতিক এক্সপ্রেশন একই লাইনে থাকবে\n- প্রতি ধাপে কী করা হচ্ছে তা ব্যাখ্যা করে গাণিতিক সমাধান দেখাতে হবে\n\n**যদি ক, খ, গ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর - গাণিতিক অংশ $...$ এ)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর - গাণিতিক অংশ $...$ এ)\n**গ অংশ:** (গাণিতিক সমাধান - সব স্টেপ $...$ এ)\n\n**যদি ক, খ, গ, ঘ অংশ থাকে:**\n**ক অংশ:** (সংক্ষিপ্ত উত্তর - গাণিতিক অংশ $...$ এ)\n**খ অংশ:** (ব্যাখ্যামূলক উত্তর - গাণিতিক অংশ $...$ এ)\n**গ অংশ:** (গাণিতিক সমাধান - সব স্টেপ $...$ এ)\n**ঘ অংশ:** (বিশ্লেষণ ও মূল্যায়ন - গাণিতিক তথ্য $...$ এ)\n\nপ্রশ্ন: ${userQuestion}`;
      
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
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
          {
            role: "system",
            content: "You are H.M. Tutoring AI Assistant, an expert teaching assistant specializing in mathematics and science education. You must always format mathematical expressions using LaTeX/MathJax with $...$ delimiters. Present step-by-step solutions with clear Bengali explanations followed by mathematical expressions on the same line. Never use $$ $$ for centered equations."
          },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        stop: ["Human:", "Assistant:"],
        stream: true,
        frequency_penalty: 0.5,
        presence_penalty: 0.2,
      };

      const resp = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
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

      const contentType = resp.headers.get("content-type") || "";
      if (!resp.body || !contentType.includes("text/event-stream")) {
        // Fallback to non-stream JSON
  const data = await resp.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "কোনো উত্তর পাওয়া যায়নি।";
  setAnswer(normalizeMathDelimiters(content));
      } else {
        // Stream SSE
        const reader = resp.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || "";
          for (const evt of events) {
            const lines = evt.split(/\r?\n/);
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const dataStr = line.slice(5).trim();
              if (dataStr === "[DONE]") continue;
              try {
                const json = JSON.parse(dataStr);
                // Try multiple shapes (OpenRouter/OpenAI-like)
                const delta = json?.choices?.[0]?.delta?.content
                  ?? json?.choices?.[0]?.message?.content
                  ?? json?.choices?.[0]?.text
                  ?? json?.delta
                  ?? json?.content
                  ?? "";
                if (typeof delta === "string" && delta.length > 0) {
                  acc += delta;
      setAnswer(normalizeMathDelimiters(acc));
                }
              } catch {
                // ignore parse errors (keep-alives, comments)
              }
            }
          }
        }
        if (!acc) setAnswer("কোনো উত্তর পাওয়া যায়নি।");
      }
  } catch {
      setAnswer("দুঃখিত, কিছু ত্রুটি ঘটেছে। পরে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-3 sm:p-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
  <h1 className="text-xl sm:text-2xl font-bold mb-3">ডাউট সলভ</h1>
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
        {loading && (
          <div className="mt-2 text-xs opacity-70">AI লিখছে…</div>
        )}
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


