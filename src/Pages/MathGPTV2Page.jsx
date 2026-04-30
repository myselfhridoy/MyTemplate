import React, { useCallback, useEffect, useMemo, useState } from "react";
import MathRendererWithContext from "../Components/MathRenderer/MathRenderer";

const MATHGPT_V2_BACKEND_URL = "https://geminiai-render.onrender.com/api/mathgpt/v2";

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const compressImageToBase64 = async (file, { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = {}) => {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  let { width, height } = image;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === "image/png" ? "image/jpeg" : file.type || "image/jpeg";
  const compressedDataUrl = canvas.toDataURL(mimeType, quality);
  return compressedDataUrl.split(",")[1] || "";
};

const normalizeMathGptV2Response = (data) => {
  if (typeof data === "string") {
    const trimmedText = data.trim();

    if (!trimmedText) {
      return "";
    }

    if (trimmedText.startsWith("data:")) {
      let fullText = "";

      for (const rawLine of trimmedText.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const chunkText =
            json?.choices?.[0]?.delta?.content ||
            json?.choices?.[0]?.message?.content ||
            json?.message?.content ||
            json?.result ||
            "";
          if (chunkText) fullText += chunkText;
        } catch {
          fullText += payload;
        }
      }

      return fullText || trimmedText;
    }

    try {
      return JSON.parse(trimmedText);
    } catch {
      return trimmedText;
    }
  }

  if (!data || typeof data !== "object") {
    return "উত্তর পাওয়া যায়নি।";
  }

  return (
    data?.data ||
    data?.result ||
    data?.reply ||
    data?.message?.content ||
    data?.message ||
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.delta?.content ||
    data?.choices?.[0]?.text ||
    JSON.stringify(data, null, 2)
  );
};

function MathGPTV2Page() {
  const questionTypes = [
    { value: "জ্ঞানমূলক", label: "জ্ঞানমূলক" },
    { value: "অনুধাবন", label: "অনুধাবন" },
    { value: "বহুনির্বাচনী", label: "বহুনির্বাচনী" },
    { value: "গাণিতিক প্রশ্ন", label: "গাণিতিক প্রশ্ন" },
    { value: "সৃজনশীল", label: "সৃজনশীল" }
  ];

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
    fetch("https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json?_=" + Date.now())
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => Array.isArray(data) ? setMapping(data) : setMapping([]))
      .catch(() => setMapping([]))
      .finally(() => setMappingLoading(false));
  }, []);

  const classes = Array.from(new Set(mapping.map((item) => item["শ্রেণি"]).filter(Boolean)));
  let subjects = [];
  if (selectedClass) {
    const filteredItems = mapping.filter((item) => item["শ্রেণি"] === selectedClass);
    subjects = filteredItems.map((item) => item["বিষয়"] || item.বিষয় || Object.values(item)[1]).filter(Boolean);
    subjects = Array.from(new Set(subjects));
  }

  const chapters = (selectedClass && selectedSubject)
    ? (() => {
        const selectedMapping = mapping.find((item) =>
          item["শ্রেণি"] === selectedClass &&
          (item["বিষয়"] || Object.values(item)[1]) === selectedSubject
        );
        const chapterObj = selectedMapping?.["অধ্যায়"] || selectedMapping && Object.values(selectedMapping)[2] || {};
        return Object.keys(chapterObj);
      })()
    : [];

  const buildPromptForQuestionType = useCallback((type, userQuestion, contextPrompt = null) => {
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

    switch (type) {
      case "জ্ঞানমূলক":
        return basePrompt + `\n\nএটি একটি জ্ঞানমূলক প্রশ্ন। অত্যন্ত সংক্ষিপ্ত ও সরাসরি উত্তর দাও (মাত্র ১-২ লাইনে)।\n\nপ্রশ্ন: ${userQuestion}`;
      case "অনুধাবন":
        return basePrompt + `\n\nএটি একটি অনুধাবনমূলক প্রশ্ন। **অবশ্যই** এই exact format এ উত্তর দাও:\n\n**সংজ্ঞা:** (প্রশ্নের মূল টপিকের সংক্ষিপ্ত ও সরাসরি সংজ্ঞা দাও - মাত্র ১-২ লাইনে।)\n\n**ব্যাখ্যা:** (প্রশ্নের নির্দিষ্ট অংশের ব্যাখ্যা দাও - মাত্র ৩-৫ বাক্যে।)\n\n**কঠোরভাবে এই দুটি section মাত্র রাখবে। অন্য কিছু লিখবে না।**\n\nপ্রশ্ন: ${userQuestion}`;
      case "বহুনির্বাচনী":
        return basePrompt + `\n\nএটি একটি বহুনির্বাচনী প্রশ্ন। এই format এ উত্তর দাও:\n\n**সঠিক উত্তর:** (প্রথমে সঠিক option উল্লেখ করো)\n\n**সমাধান:**\n- শর্টকাট ফর্মুলা থাকলে সেটি ব্যবহার করে দ্রুত সমাধান দেখাও\n- শর্টকাট ফর্মুলা না থাকলে ধাপে ধাপে ব্যাখ্যা করো\n- বাংলা টেক্সট এবং math একই লাইনে রাখো\n\n**Calculator Hacks:** (যদি কোনো ক্যালকুলেটর হ্যাকস/ট্রিকস থাকে তবে দাও)\n\nপ্রশ্ন: ${userQuestion}`;
      case "গাণিতিক প্রশ্ন":
        return basePrompt + `\n\nএটি একটি গাণিতিক প্রশ্ন। এই format এ ধাপে ধাপে সমাধান দাও:\n\n**প্রদত্ত তথ্য:**\n(প্রদত্ত সব তথ্য তালিকা আকারে লিখো)\n\n**প্রয়োজনীয় সূত্র:**\n(ব্যবহৃত সূত্রগুলো লিখো - বাংলা এবং math একসাথে)\n\n**সমাধান:**\n(প্রতিটি ধাপ আলাদা paragraph এ লিখো)\n\n**উত্তর:**\n(চূড়ান্ত উত্তর)\n\nপ্রশ্ন: ${userQuestion}`;
      case "সৃজনশীল":
        return basePrompt + `\n\nএটি একটি সৃজনশীল প্রশ্ন। প্রশ্নে যতগুলো অংশ আছে সেই অনুযায়ী উত্তর দাও।\n\nপ্রশ্ন: ${userQuestion}`;
      default:
        return basePrompt + `\n\nপ্রশ্ন: ${userQuestion}`;
    }
  }, []);

  const getChapterContextPrompt = useCallback(async () => {
    const selectedMapping = mapping.find((item) =>
      item["শ্রেণি"] === selectedClass &&
      (item["বিষয়"] || Object.values(item)[1]) === selectedSubject
    );
    const chapterObj = selectedMapping?.["অধ্যায়"] || selectedMapping && Object.values(selectedMapping)[2] || {};
    const chapterUrl = chapterObj[selectedChapter];

    let chapterContent = "";
    if (chapterUrl) {
      try {
        const chapterRes = await fetch(chapterUrl);
        if (chapterRes.ok) {
          chapterContent = await chapterRes.text();
          chapterContent = chapterContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 8000);
        }
      } catch {
        chapterContent = "";
      }
    }

    let contextPrompt = `আপনি MathGPT AI Assistant। আপনি ${selectedClass} ${selectedSubject} এর "${selectedChapter}" অধ্যায়ের একজন দক্ষ শিক্ষক।

সব প্রশ্নের উত্তর বাংলায় এবং শুধুমাত্র গাণিতিক অংশগুলো MathJax ফরম্যাটে \`$...$\` এর ভিতরে থাকবে। **বাংলা লেখাগুলো কখনোই $...$ এর ভিতরে থাকবে না।**

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

    if (chapterContent) {
      contextPrompt += `\n\nঅধ্যায়ের বিষয়বস্তু:\n${chapterContent.substring(0, 4000)}\n\n`;
    }

    return contextPrompt;
  }, [mapping, selectedClass, selectedSubject, selectedChapter]);

  const handleTextChange = useCallback((event) => {
    setQuestionText(event.target.value);
    if (answer) {
      setAnswer("");
    }
  }, [answer]);

  const handleImageChange = useCallback((event) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    const file = event.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      setAnswer("");
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  }, [imagePreviewUrl]);

  const canSubmit = useMemo(() => {
    return !loading && (questionText.trim().length > 0 || Boolean(imageFile));
  }, [imageFile, loading, questionText]);

  const memoizedAnswerContent = useMemo(() => {
    if (!answer || !answer.trim()) return null;
    return <MathRendererWithContext text={answer} />;
  }, [answer]);

  const handleAsk = useCallback(async (event) => {
    event.preventDefault();

    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion && !imageFile) {
      setAnswer("অনুগ্রহ করে একটি প্রশ্ন লিখুন বা একটি ছবি আপলোড করুন।");
      return;
    }

    if (!selectedClass || !selectedSubject || !selectedChapter || !questionType) {
      setAnswer("অনুগ্রহ করে শ্রেণি, বিষয়, অধ্যায় এবং প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const contextPrompt = await getChapterContextPrompt();
      const finalQuestion = imageFile
        ? `${trimmedQuestion || "ছবিটি লক্ষ্য করে প্রশ্নের উত্তর দাও।"}\n\nআরো তথ্যের জন্য দেওয়া ছবিটিও দেখুন এবং প্রশ্ন ও ছবি দুইটি মিলিয়ে সম্পূর্ণ উত্তর দিন।`
        : trimmedQuestion;
      const resolvedText = buildPromptForQuestionType(questionType, finalQuestion, contextPrompt);
      let imageBase64 = "";

      if (imageFile) {
        imageBase64 = await compressImageToBase64(imageFile, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8
        });
      }

      const response = await fetch(MATHGPT_V2_BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: resolvedText,
          image: imageBase64 || undefined,
          fileName: imageFile?.name || undefined
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const responseData = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const errorMessage = typeof responseData === "string"
          ? responseData
          : responseData?.error || responseData?.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      setAnswer(normalizeMathGptV2Response(responseData));
    } catch (error) {
      setAnswer(`Error: ${error?.message || "AI সার্ভারে সমস্যা হয়েছে।"}`);
    } finally {
      setLoading(false);
    }
  }, [imageFile, questionText]);

  return (
    <div className="container mx-auto p-4 max-w-3xl" style={{ fontFamily: "Hind Siliguri, sans-serif" }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center sm:text-left">মাষ্টার মশাই: দ্য স্যাভিয়র</h1>
      <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <select
            className="select select-bordered w-full text-sm"
            style={{ fontFamily: "Hind Siliguri, sans-serif" }}
            value={selectedClass}
            onChange={(event) => {
              setSelectedClass(event.target.value);
              setSelectedSubject("");
              setSelectedChapter("");
              if (answer) setAnswer("");
            }}
            disabled={mappingLoading}
          >
            <option value="">{mappingLoading ? "লোড হচ্ছে..." : "শ্রেণি"}</option>
            {classes.map((className, index) => <option key={index} value={className}>{className}</option>)}
          </select>
          {selectedClass ? (
            <select
              className="select select-bordered w-full text-sm"
              style={{ fontFamily: "Hind Siliguri, sans-serif" }}
              value={selectedSubject}
              onChange={(event) => {
                setSelectedSubject(event.target.value);
                setSelectedChapter("");
                if (answer) setAnswer("");
              }}
              disabled={mappingLoading}
            >
              <option value="">বিষয়</option>
              {subjects.map((subject, index) => <option key={index} value={subject}>{subject}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled>
              <option value="">প্রথমে শ্রেণি নির্বাচন করুন</option>
            </select>
          )}
          {selectedClass && selectedSubject ? (
            <select
              className="select select-bordered w-full text-sm"
              style={{ fontFamily: "Hind Siliguri, sans-serif" }}
              value={selectedChapter}
              onChange={(event) => {
                setSelectedChapter(event.target.value);
                if (answer) setAnswer("");
              }}
              disabled={mappingLoading}
            >
              <option value="">অধ্যায়</option>
              {chapters.map((chapter, index) => <option key={index} value={chapter}>{chapter}</option>)}
            </select>
          ) : (
            <select className="select select-bordered w-full text-sm" disabled>
              <option value="">প্রথমে বিষয় নির্বাচন করুন</option>
            </select>
          )}
          <select
            className="select select-bordered w-full text-sm"
            style={{ fontFamily: "Hind Siliguri, sans-serif" }}
            value={questionType}
            onChange={(event) => {
              setQuestionType(event.target.value);
              if (answer) setAnswer("");
            }}
          >
            <option value="">প্রশ্নের ধরণ</option>
            {questionTypes.map((type, index) => <option key={index} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-semibold text-sm">প্রশ্ন</label>
          <textarea
            className="textarea textarea-bordered w-full text-sm"
            rows={5}
            placeholder="প্রশ্ন লিখুন..."
            value={questionText}
            onChange={handleTextChange}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-semibold text-sm">অথবা ছবি আপলোড করুন:</label>
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full text-sm"
            onChange={handleImageChange}
          />
          {imagePreviewUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-base-300 bg-base-200/50 p-2">
              <img src={imagePreviewUrl} alt="Uploaded preview" className="mx-auto max-h-72 w-auto rounded-lg object-contain" />
              <p className="mt-2 truncate text-center text-xs text-base-content/60">{imageFile?.name}</p>
            </div>
          )}
        </div>

        <button className="btn btn-primary w-full text-sm sm:text-base" type="submit" disabled={!canSubmit}>
          {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
        </button>
      </form>

      {answer && (
        <div className="bg-base-100 rounded shadow p-3 sm:p-4 text-base sm:text-lg text-base-content overflow-hidden">
          <span className="font-bold">উত্তর:</span>
          <div
            className="answer-content overflow-x-auto"
            style={{ wordSpacing: "0.08em" }}
          >
            {memoizedAnswerContent}
          </div>
        </div>
      )}
    </div>
  );
}

export default MathGPTV2Page;