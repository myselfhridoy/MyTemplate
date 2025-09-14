import React, { useState } from "react";
import AIAssistantPage from "./AIAssistantPage";
import UnlimitedAIQAPage from "./UnlimitedAIQAPage";
import HMTAIPage from "./HMTAI";
import AIChatPage from "./AIChatPage";
import DoubtSolvePage from "./DoubtSolvePage";
import BornoAIPage from "./BornoAIPage";

const pageOptions = [
  { label: "H.M. Tutoring AI", value: "hmtai", Comp: UnlimitedAIQAPage },
  { label: "Study Buddy", value: "qa", Comp: HMTAIPage },
  { label: "Knowledge Master", value: "assistant", Comp: AIAssistantPage },
  { label: "Problem Solver", value: "chat", Comp: AIChatPage },
  { label: "Concept Builder", value: "doubt", Comp: DoubtSolvePage },
  { label: "Academic Assistant", value: "borno", Comp: BornoAIPage },
];


export default function AIAggregatorPage2() {
  const [selected, setSelected] = useState("hmtai"); // এখানে "hmtai" ডিফল্ট করে দেওয়া হয়েছে
  const [classOverride, setClassOverride] = useState("");
  const [subjectOverride, setSubjectOverride] = useState("");
  const [chapterOverride, setChapterOverride] = useState("");
  const [questionTypeOverride, setQuestionTypeOverride] = useState("");

  const questionTypes = [
    { value: '', label: 'প্রশ্নের ধরণ' },
    { value: 'জ্ঞানমূলক', label: 'জ্ঞানমূলক' },
    { value: 'অনুধাবন', label: 'অনুধাবন' },
    { value: 'বহুনির্বাচনী', label: 'বহুনির্বাচনী' },
    { value: 'গাণিতিক প্রশ্ন', label: 'গাণিতিক প্রশ্ন' },
    { value: 'সৃজনশীল', label: 'সৃজনশীল' }
  ];

  const selectedOption = pageOptions.find(opt => opt.value === selected);
  const Comp = selectedOption?.Comp;
  let renderedPage = null;
  if (Comp) {
    renderedPage = <Comp 
      classOverride={classOverride}
      subjectOverride={subjectOverride}
      chapterOverride={chapterOverride}
      questionTypeOverride={questionTypeOverride}
      hideSelectors={true}
    />;
  }

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
        {renderedPage}
      </div>
    </div>
  );
}
