import React, { useState } from "react";
import DesmosGraphPage from "./DesmosGraphPage";

const toolOptions = [
  { value: "", label: "টুল সিলেক্ট করুন" },
  { value: "desmos", label: "গ্রাফ ক্যালকুলেটর" },
  { value: "telegram", label: "টেলিগ্রাম বট" }
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
            <p className="mb-3">H.M. Tutoring AI-এর টেলিগ্রাম বট ব্যবহার করতে নিচের লিঙ্কে ক্লিক করুন:</p>
            <a
              href="https://t.me/HMTutoringAI_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-info"
            >
              @HMTutoringAI_bot
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
