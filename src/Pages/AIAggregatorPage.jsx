import React, { useState } from "react";
import AIAssistantPage from "./AIAssistantPage";
import UnlimitedAIQAPage from "./UnlimitedAIQAPage";
import HMTAIPage from "./HMTAI";
import AIChatPage from "./AIChatPage";
import DoubtSolvePage from "./DoubtSolvePage";
import BornoAIPage from "./BornoAIPage";
import AIChatBotPage from "./AIChatBotPage";
import LuziaChatBotPage from "./LuziaChatBotPage";
import GemmyAIPage from "./GemmyAIPage";
import MerlineAIPage from "./MerlineAIPage";
import HMTAiPage from "./HMTAiPage";
import PuterChatPage from "./PuterChatPage";
import MathGPTPage from "./MathGPTPage";
import NoteGPTPage from "./NoteGPTPage";

const pageOptions = [
  { label: "জেমি: দ্যা টিচার", value: "gemmy" },
  { label: "মিস মার্লিন: দ্যা টিউটর", value: "merlin" },
  { label: "ম্যাভিস: দ্যা ম্যাথ এক্সপার্ট", value: "mathgpt" },
  { label: "H.M. Tutoring AI", value: "notegpt" },
  { label: "Luzia: দ্যা প্রফেসর", value: "luzia" },
  { label: "HMT AI Assistant", value: "hmtai-puter" },
  { label: "Knowledge Master", value: "assistant" },
  { label: "Concept Builder", value: "doubt" },
  /*{ label: "H.M. Tutoring AI", value: "hmtai" },*/
  { label: "Study Buddy", value: "qa" },
  { label: "Academic Assistant", value: "borno" },
  { label: "AI Chat Bot", value: "chatbot" },
  { label: "Problem Solver", value: "chat" },
];

const pageMap = {
  gemmy: <GemmyAIPage />,
  merlin: <MerlineAIPage />,
  "hmtai-puter": <HMTAiPage />,
  assistant: <AIAssistantPage />,
  luzia: <LuziaChatBotPage />,
  doubt: <DoubtSolvePage />,
  hmtai: <UnlimitedAIQAPage />,
  qa: <HMTAIPage />,
  borno: <BornoAIPage />,
  chatbot: <AIChatBotPage />,
  chat: <AIChatPage />,
  mathgpt: <MathGPTPage />,
  notegpt: <NoteGPTPage />
};

export default function AIAggregatorPage() {
  const [selected, setSelected] = useState("gemmy"); // এখানে "gemmy" ডিফল্ট করে দেওয়া হয়েছে
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