import React, { useState } from "react";
import AIAssistantPage from "./AIAssistantPage";
import UnlimitedAIQAPage from "./UnlimitedAIQAPage";
import HMTAIPage from "./HMTAI";
import AIChatPage from "./AIChatPage";
import DoubtSolvePage from "./DoubtSolvePage";
import BornoAIPage from "./BornoAIPage";
import AIChatBotPage from "./AIChatBotPage";
import LuziaChatBotPage from "./LuziaChatBotPage";

const pageOptions = [
  { label: "H.M. Tutoring AI", value: "hmtai" },
  { label: "Study Buddy", value: "qa" },
  { label: "Knowledge Master", value: "assistant" },
  { label: "Problem Solver", value: "chat" },
  { label: "Concept Builder", value: "doubt" },
  { label: "Academic Assistant", value: "borno" },
  { label: "AI Chat Bot", value: "chatbot" },
  { label: "Luzia: দ্যা প্রফেসর", value: "luzia" }
];

const pageMap = {
  hmtai: <UnlimitedAIQAPage />,
  qa: <HMTAIPage />,
  assistant: <AIAssistantPage />,
  chat: <AIChatPage />,
  doubt: <DoubtSolvePage />,
  borno: <BornoAIPage />,
  chatbot: <AIChatBotPage />,
  luzia: <LuziaChatBotPage />
};

export default function AIAggregatorPage() {
  const [selected, setSelected] = useState("hmtai"); // এখানে "hmtai" ডিফল্ট করে দেওয়া হয়েছে
  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="mb-4">
        <label className="block mb-1 font-semibold text-base" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>মডেল</label>
        <select
          className="select select-bordered w-full text-base"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {pageOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        {pageMap[selected]}
      </div>
    </div>
  );
}