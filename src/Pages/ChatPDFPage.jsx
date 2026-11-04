import { useState, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import MathRenderer from "../Components/MathRenderer/MathRenderer";
import IOSButton from "../Components/ios/iOSButton";
import IOSCard from "../Components/ios/iOSCard";

const API_URL = "https://geminiai-render.onrender.com/api/ai-free-chatpdf";
const TOKEN_URL = "https://geminiai-render.onrender.com/api/ai-free/ai-free";
const QUESTION_TYPES = [
  { value: 'জ্ঞানমূলক', label: 'জ্ঞানমূলক', icon: '📌' },
  { value: 'অনুধাবন', label: 'অনুধাবন', icon: '💡' },
  { value: 'বহুনির্বাচনী', label: 'বহুনির্বাচনী', icon: '📝' },
  { value: 'গাণিতিক প্রশ্ন', label: 'গাণিতিক', icon: '🧮' },
  { value: 'সৃজনশীল', label: 'সৃজনশীল', icon: '🎯' },
];

const ChatPDFPage = ({
  questionTypeOverride = undefined,
  hideSelectors = false
}) => {
  const [questionType, setQuestionType] = useState(questionTypeOverride ?? "");
  useEffect(() => { if (questionTypeOverride !== undefined) setQuestionType(questionTypeOverride); }, [questionTypeOverride]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const fileInputRef = useRef(null);
  // conversation_id and idToken should persist for the session (until page refresh)
  const [conversationId] = useState(() => uuidv4());
  const [idToken, setIdToken] = useState(null);

  // Fetch idToken on page load/refresh
  useEffect(() => {
    const controller = new AbortController();
    const fetchToken = async () => {
      setTokenLoading(true);
      setTokenError("");
      try {
        const response = await fetch(TOKEN_URL, { signal: controller.signal });
        if (!response.ok) throw new Error(`Token request failed (${response.status})`);
        const data = await response.json();
        if (!data.idToken) throw new Error('Token response did not include an ID token');
        setIdToken(data.idToken);
      } catch (requestError) {
        if (requestError.name === 'AbortError') return;
        console.error("Error fetching ChatPDF token:", requestError);
        setIdToken(null);
        setTokenError("AI token লোড করা যায়নি। পৃষ্ঠাটি refresh করে আবার চেষ্টা করুন।");
      } finally {
        if (!controller.signal.aborted) setTokenLoading(false);
      }
    };
    fetchToken();
    return () => controller.abort();
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

  // Removed mappingLoading and mapping fetch for class/subject/chapter

  // Removed classes, subjects, chapters variables
  const handleFileChange = (e) => {
    if (answer) setAnswer("");
    setError("");
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setImagePreviewUrl(selected?.type.startsWith('image/') ? URL.createObjectURL(selected) : null);
  };

  const removeFile = () => {
    setFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit = !loading && !tokenLoading && Boolean(idToken) && (question.trim() || file);

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
    setError("");
    if (!questionType) {
      setError("প্রশ্নের ধরণ সিলেক্ট করুন।");
      return;
    }
    if (!question.trim() && !file) {
      setError("প্রশ্ন লিখুন অথবা ফাইল দিন।");
      return;
    }
    if (!idToken) {
      setError(tokenError || "AI token প্রস্তুত নয়। পৃষ্ঠাটি refresh করে আবার চেষ্টা করুন।");
      return;
    }
    setLoading(true);
    setAnswer("");
    try {
      const formData = new FormData();
      formData.append("conversation_id", conversationId);
      formData.append("message_id", uuidv4());
      const prompt = getPromptForQuestionType(questionType, question);
      formData.append("content", prompt);
      formData.append("model", "gemini-2.5-flash");
      if (file) {
        formData.append("attachments", file);
      }
      formData.append("max_mode", "true");
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: idToken ? { "authorization": `Bearer ${idToken}` } : {},
      });
      if (!response.ok) throw new Error("API Error: " + response.status);
      if (!response.body) throw new Error("AI response did not include a readable stream.");
      const reader = response.body.getReader();
      let answerText = "";
      let buffer = "";
      const decoder = new TextDecoder('utf-8');
      const readLine = (line) => {
        let content = line.trim();
        if (!content || content.startsWith(':')) return;
        if (content.startsWith('data:')) content = content.slice(5).trim();
        if (!content || content === '[DONE]') return;

        let event;
        try {
          event = JSON.parse(content);
        } catch (parseError) {
          throw new Error("AI response stream was not valid JSON.", { cause: parseError });
        }
        if (event.type === "text_delta" && event.data) answerText += event.data;
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        lines.forEach(readLine);
        if (done) break;
      }
      if (buffer.trim()) readLine(buffer);
      setAnswer(answerText || 'কোনো উত্তর পাওয়া যায়নি।');
      removeFile();
    } catch (err) {
      console.error("ChatPDF request failed:", err);
      setError(err.message || "সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <header className="mb-7 text-center sm:text-left">
        <p className="mb-2 text-sm font-semibold text-primary">পড়াশোনার সহায়ক</p>
        <h1 className="text-3xl font-bold tracking-tight text-base-content">ChatPDF</h1>
        <p className="mt-2 text-base-content/65">প্রশ্ন লিখুন অথবা ছবি/PDF যোগ করে উত্তর নিন।</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {(!hideSelectors || questionTypeOverride === undefined) && (
          <section aria-label="প্রশ্নের ধরণ" className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setQuestionType(value);
                  if (answer) setAnswer("");
                }}
                aria-pressed={questionType === value}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  questionType === value
                    ? "border-primary bg-primary text-primary-content"
                    : "border-base-300 bg-base-100 text-base-content hover:border-primary/50"
                }`}
              >
                <span aria-hidden="true" className="mr-1.5">{icon}</span>{label}
              </button>
            ))}
          </section>
        )}

        <IOSCard className="space-y-4 p-4 sm:p-6">
          <label htmlFor="chatpdf-question" className="block text-sm font-semibold text-base-content">
            আপনার প্রশ্ন
          </label>
          <textarea
            id="chatpdf-question"
            className="min-h-36 w-full resize-y rounded-2xl border border-base-300 bg-base-100 p-4 text-base text-base-content outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="এখানে প্রশ্ন লিখুন..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="chatpdf-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-base-300 px-4 py-2 text-sm font-medium text-base-content transition hover:bg-base-200"
            >
              <span aria-hidden="true">＋</span>
              ছবি বা PDF যোগ করুন
            </label>
            <input
              id="chatpdf-file"
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
            <span className="text-xs text-base-content/55">ছবি বা PDF</span>
          </div>

          {file && (
            <div className="flex items-start gap-3 rounded-2xl bg-base-200/70 p-3">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="আপলোড করা ছবির প্রিভিউ" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-base-300 text-2xl">📄</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-base-content">{file.name}</p>
                <p className="mt-1 text-xs text-base-content/60">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                aria-label="ফাইল সরান"
                className="rounded-full px-3 py-1 text-sm text-base-content/65 hover:bg-base-300"
              >
                সরান
              </button>
            </div>
          )}

          {tokenLoading && <p role="status" className="text-sm text-base-content/60">AI প্রস্তুত হচ্ছে...</p>}
          {tokenError && <p role="alert" className="text-sm text-error">{tokenError}</p>}
          {error && <p role="alert" className="text-sm text-error">{error}</p>}

          <IOSButton type="submit" className="w-full" disabled={!canSubmit || !questionType}>
            {loading ? "উত্তর তৈরি হচ্ছে..." : "উত্তর জানুন"}
          </IOSButton>
        </IOSCard>
      </form>

      {answer && (
        <IOSCard className="mt-6 p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-base-content">উত্তর</h2>
          <div className="answer-content overflow-x-auto text-base text-base-content" style={{ lineHeight: 1.8, wordSpacing: '0.1em' }}>
            {memoizedAnswerContent}
          </div>
        </IOSCard>
      )}
    </main>
  );
};

export default ChatPDFPage;