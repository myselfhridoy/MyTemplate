import React, { useState } from "react";
import DesmosGraphPage from "./DesmosGraphPage";
import BoardResultPage from "./BoardResultPage";

const CopyTelegramLink = () => {
  const [copied, setCopied] = useState(false);
  const link = "https://t.me/HMTutoringAI_bot";

  const handleCopy = async () => {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <>
      <button className="btn btn-ghost" onClick={handleCopy} title="Copy Telegram link">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none">
          <path d="M3 12v8a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 3v8a2 2 0 0 1-2 2h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 12l10-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Copy Link
      </button>
      {copied && <span className="ml-2 text-green-600">Copied!</span>}
    </>
  );
};

const toolOptions = [
  { value: "", label: "টুল সিলেক্ট করুন" },
  { value: "board-result", label: "বোর্ড পরীক্ষার ফলাফল" },
  { value: "desmos", label: "গ্রাফ ক্যালকুলেটর" },
  { value: "telegram", label: "টেলিগ্রাম বট" }
  ,{ value: "facebook", label: "Facebook পেজ" }
  
];

const ToolsPage = () => {
  const [selectedTool, setSelectedTool] = useState("");

  return (
    <div className="container mx-auto p-4" style={{ fontFamily: "'Hind Siliguri', 'Kalpurush', 'Noto Sans Bengali', 'SolaimanLipi', 'Arial', sans-serif" }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center">প্রয়োজনীয় টুলস</h1>
      <div className="flex justify-center mb-8">
        <select
          className="select select-bordered"
          value={selectedTool}
          onChange={e => setSelectedTool(e.target.value)}
          style={{ minWidth: 180 }}
        >
          {toolOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {selectedTool === "desmos" && (
        <div className="mt-2">
          <DesmosGraphPage />
        </div>
      )}
      {selectedTool === "telegram" && (
        <div className="mt-2 flex flex-col items-center">
          <div className="bg-base-100 rounded shadow p-4 text-center max-w-md">
            <h2 className="text-lg font-bold mb-2">টেলিগ্রাম বট</h2>
            <p className="mb-3">H.M. Tutoring AI-এর টেলিগ্রাম বট ব্যবহার করতে নিচের অপশনগুলো দেখুন:</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
              <a
                href="tg://resolve?domain=HMTutoringAI_bot"
                className="btn btn-info flex items-center"
                title="Open in Telegram app"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 240 240" fill="none">
                  <circle cx="120" cy="120" r="120" fill="#0088cc" />
                  <path d="M49 118l144-46c6-2 9 1 8 7l-26 122c-2 8-8 10-16 6l-44-32-21 21c-2 2-4 4-8 4l3-44L188 94" fill="#fff" />
                </svg>
                Open in App
              </a>

              <a
                href="https://t.me/HMTutoringAI_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                title="Open in browser"
              >
                Open in Browser
              </a>
            </div>

            <div className="mt-3 flex gap-2 justify-center items-center">
              <CopyTelegramLink />
            </div>
            <p className="text-sm text-gray-500 mt-3">Tip: If the app link doesn't open, use the browser link above.</p>
          </div>
        </div>
      )}
      {selectedTool === "facebook" && (
        <div className="mt-2 flex flex-col items-center">
          <div className="bg-base-100 rounded shadow p-4 text-center max-w-md">
            <h2 className="text-lg font-bold mb-2">H.M. Tutoring — Facebook</h2>
            <p className="mb-3">Visit our official Facebook page for updates, posts and community discussions.</p>
            <a
              href="https://www.facebook.com/HMTutoring.Official/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Open Facebook Page
            </a>
          </div>
        </div>
      )}
      {selectedTool === "board-result" && (
        <div className="mt-2">
          <BoardResultPage />
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
