import React, { useState, useEffect, useRef } from "react";
import KatexRenderer from "../Components/MathRenderer/KatexRenderer";

// NCTB class-subject mapping (partial, add more as needed)
const nctbSubjects = {
  "প্রথম-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত"],
  "দ্বিতীয়-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত"],
  "তৃতীয়-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
  "চতুর্থ-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
  "পঞ্চম-শ্রেণী": ["আমার বাংলা বই", "English For Today", "প্রাথমিক গণিত", "প্রাথমিক বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "ইসলাম শিক্ষা"],
  "ষষ্ঠ-শ্রেণী": ["চারুপাঠ", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar & Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
  "সপ্তম-শ্রেণী": ["সপ্তবর্ণা", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
  "অষ্টম-শ্রেণী": ["সাহিত্য কণিকা", "আনন্দপাঠ", "বাংলা ব্যাকরণ ও নির্মিতি", "বাংলা ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "বিজ্ঞান", "বাংলাদেশ ও বিশ্বপরিচয়", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা", "কৃষিশিক্ষা", "শারীরিক শিক্ষা ও স্বাস্থ্য", "কর্ম ও জীবনমুখী শিক্ষা"],
  "নবম-শ্রেণী": ["বাংলা সাহিত্য", "বাংলা সহপাঠ", "বাংলা ভাষার ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "উচ্চতর গণিত", "রসায়ন", "পদার্থবিজ্ঞান", "জীববিজ্ঞান", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা"],
  "দশম-শ্রেণী": ["বাংলা সাহিত্য", "বাংলা সহপাঠ", "বাংলা ভাষার ব্যাকরণ ও নির্মিতি", "English For Today", "English Grammar and Composition", "গণিত", "উচ্চতর গণিত", "রসায়ন", "পদার্থবিজ্ঞান", "জীববিজ্ঞান", "তথ্য ও যোগাযোগ প্রযুক্তি", "ইসলাম শিক্ষা"],
  "একাদশ-শ্রেণী": [
    "পদার্থবিজ্ঞান প্রথম পত্র", "পদার্থবিজ্ঞান দ্বিতীয় পত্র",
    "রসায়ন প্রথম পত্র", "রসায়ন দ্বিতীয় পত্র",
    "জীববিজ্ঞান প্রথম পত্র", "জীববিজ্ঞান দ্বিতীয় পত্র",
    "উচ্চতর গণিত প্রথম পত্র", "উচ্চতর গণিত দ্বিতীয় পত্র",
    "বাংলা প্রথম পত্র", "বাংলা দ্বিতীয় পত্র",
    "ইংরেজি প্রথম পত্র", "ইংরেজি দ্বিতীয় পত্র",
    "তথ্য ও যোগাযোগ প্রযুক্তি"
  ],
  "দ্বাদশ-শ্রেণী": [
    "পদার্থবিজ্ঞান প্রথম পত্র", "পদার্থবিজ্ঞান দ্বিতীয় পত্র",
    "রসায়ন প্রথম পত্র", "রসায়ন দ্বিতীয় পত্র",
    "জীববিজ্ঞান প্রথম পত্র", "জীববিজ্ঞান দ্বিতীয় পত্র",
    "উচ্চতর গণিত প্রথম পত্র", "উচ্চতর গণিত দ্বিতীয় পত্র",
    "বাংলা প্রথম পত্র", "বাংলা দ্বিতীয় পত্র",
    "ইংরেজি প্রথম পত্র", "ইংরেজি দ্বিতীয় পত্র",
    "তথ্য ও যোগাযোগ প্রযুক্তি"
  ]
};

const classList = Object.keys(nctbSubjects);

const DEFAULT_TOKEN = "fvRLQNCpxUVIGeqCn45iW59CIzD3";

function BornoAIPage() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  // Reset subject if class changes
  useEffect(() => {
    if (selectedClass && !nctbSubjects[selectedClass].includes(selectedSubject)) {
      setSelectedSubject("");
    }
    // eslint-disable-next-line
  }, [selectedClass, selectedSubject]);

  // Revoke image preview URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Handle image file selection
  const handleImageChange = (e) => {
    if (answer) setAnswer("");
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const file = e.target.files[0];
    setImageFile(file);
    if (file) setImagePreviewUrl(URL.createObjectURL(file));
    else setImagePreviewUrl(null);
  };

  // Handle form submit
  const handleAsk = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || (!question.trim() && !imageFile)) {
      setAnswer("দয়া করে শ্রেণি, বিষয় এবং প্রশ্ন/ছবি দিন।");
      return;
    }
    setLoading(true);
    setAnswer("");
    let imageData = "";
    if (imageFile) {
      imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // full data URI
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }
    const body = [question, imageData, DEFAULT_TOKEN, selectedClass, selectedSubject];
    try {
      const resp = await fetch("https://geminiai-render.onrender.com/api/bornoai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const text = await resp.text();
      let answerText = "";

      // First try to extract content from 2: pattern (main content)
      const match2 = text.match(/2:[^,]*,\s*([\s\S]*?)(?=\d+:\{|$)/);
      if (match2) {
        answerText = match2[1].trim();
      } else {
        // Fallback: try to extract JSON content from 1:{"content":"..."} pattern
        const jsonMatch = text.match(/1:\s*\{\s*"content"\s*:\s*"([\s\S]*?)"\s*\}/);
        if (jsonMatch) {
          answerText = jsonMatch[1]
            .replace(/\\n/g, '\n')    // Fix escaped newlines
            .replace(/\\"/g, '"')     // Fix escaped quotes
            .replace(/\\\\/g, '\\');  // Fix double backslashes
        } else {
        // Fallback: manual line-by-line extraction
        const lines = text.split(/\r?\n/);
        let found = false;
        let contentLines = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();
          
          if (!found && trimmed.startsWith('2:')) {
            // Extract content after comma in 2: line
            const colonIndex = line.indexOf(':');
            const content = line.substring(colonIndex + 1);
            const commaIndex = content.indexOf(',');
            if (commaIndex !== -1) {
              const afterComma = content.substring(commaIndex + 1).trim();
              if (afterComma) contentLines.push(afterComma);
            }
            found = true;
            continue;
          }
          
          if (found) {
            // Stop at any digit: pattern
            if (/^\d+:/.test(trimmed)) {
              break;
            }
            contentLines.push(line);
          }
        }
        
          answerText = contentLines.join('\n');
        }
      }
      
      // Clean up the extracted content
      answerText = answerText
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          // Remove empty lines and placeholder patterns
          return trimmed && 
                 !trimmed.match(/^\d+:\{.*\}$/) && // Remove any 1:{"content":"$2"} patterns
                 !trimmed.match(/\{"content":"\$\d+"\}/) && // Remove {"content":"$2"}
                 trimmed !== '$2'; // Remove standalone $2
        })
        .join('\n')
        .trim();
      
      // Additional cleanup: remove any trailing JSON content patterns
      answerText = answerText.replace(/\{"content":"\$\d+"\}$/g, '').trim();
      
      // Normalize LaTeX for proper rendering
      answerText = answerText
        .replace(/\\\\/g, '\\') // Fix double backslashes
        .replace(/\\n/g, '\n') // Fix escaped newlines
        .replace(/\\"/g, '"');  // Fix escaped quotes
      
      // Fallback: try JSON content extraction if no 2: pattern found
      if (!answerText) {
        const contentMatch = text.match(/"content"\s*:\s*"([\s\S]+?)"/);
        if (contentMatch) {
          answerText = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
      
      setAnswer(answerText);
  // If you want to reset file input after submit, uncomment below:
  // setImageFile(null);
  // setImagePreviewUrl(null);
  // if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setAnswer("উত্তর আনতে সমস্যা হয়েছে। দয়া করে পরে আবার চেষ্টা করুন।");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <h1 className="text-2xl font-extrabold mb-4 text-center">একাডেমিক সহকারী</h1>
      <form className="bg-white dark:bg-base-200 rounded shadow p-3 sm:p-8 mb-6" onSubmit={handleAsk}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <select className="select select-bordered w-full text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">শ্রেণি</option>
            {classList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
          </select>
          <select className="select select-bordered w-full text-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={!selectedClass}>
            <option value="">বিষয়</option>
            {selectedClass && nctbSubjects[selectedClass].map(subj => <option key={subj} value={subj}>{subj}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <textarea className="textarea textarea-bordered w-full text-sm" rows={3} placeholder="প্রশ্ন লিখুন..." value={question} onChange={e => setQuestion(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold text-sm">অথবা ছবি আপলোড করুন:</label>
          <input ref={fileInputRef} type="file" accept="image/*" className="file-input file-input-bordered w-full text-sm" onChange={handleImageChange} />
          {imagePreviewUrl && <div className="mt-2"><img src={imagePreviewUrl} alt="Uploaded" className="max-h-32 w-auto rounded shadow mx-auto block" /></div>}
        </div>
        <button className="btn btn-primary w-full text-sm sm:text-base" type="submit" disabled={loading || (!question.trim() && !imageFile)}>
          {loading ? "লোড হচ্ছে..." : "উত্তর জানুন"}
        </button>
      </form>
      {answer && (
        <div className="bg-base-100 rounded shadow p-3 sm:p-4 text-base sm:text-lg text-base-content overflow-x-auto">
          <span className="font-bold">উত্তর:</span>
          <div style={{ marginTop: '0.5rem', lineHeight: '1.8', wordSpacing: '0.1em' }}>
            <KatexRenderer text={answer} />
          </div>
        </div>
      )}
    </div>
  );
}

export default BornoAIPage;