import React, { useState } from "react";
import AIAssistantPage from "./AIAssistantPage";
import UnlimitedAIQAPage from "./UnlimitedAIQAPage";
import AIChatPage from "./AIChatPage";
import DoubtSolvePage from "./DoubtSolvePage";

const pageOptions = [
  { label: "AI সহকারী", value: "assistant" },
  { label: "Unlimited AI Q&A", value: "qa" },
  { label: "AI Chat", value: "chat" },
  { label: "Doubt Solve", value: "doubt" },
];

const pageMap = {
  assistant: <AIAssistantPage />,
  qa: <UnlimitedAIQAPage />,
  chat: <AIChatPage />,
  doubt: <DoubtSolvePage />,
};

export default function AIAggregatorPage() {
  const [selected, setSelected] = useState("assistant");
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
