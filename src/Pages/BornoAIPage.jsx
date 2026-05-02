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

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append("userText", question || "Solve");
      formData.append("gradeValue", selectedClass);
      formData.append("subject", selectedSubject);
      
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const resp = await fetch("https://geminiai-render.onrender.com/api/bornoai/chat", {
        method: "POST",
        body: formData
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status}`);
      }

      // Handle SSE stream response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let answerText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            if (data) {
              try {
                const parsed = JSON.parse(data);
                
                // Only process content messages, skip thought/ping/connected
                if (parsed.type === 'content' && parsed.delta) {
                  answerText += parsed.delta;
                } else if (parsed.type === 'done' && parsed.content) {
                  // Use done message as fallback if no content accumulated
                  if (!answerText) {
                    answerText = parsed.content;
                  }
                }
                // Ignore: thought, ping, connected types
              } catch {
                // If not JSON, ignore
              }
            }
          }
        }
      }

      setAnswer(answerText || "কোন উত্তর পাওয়া যায়নি।");

      // --- Google Sheet Logger ---
      let imageBase64 = "";
      if (imageFile) {
        // Compress image for Google Sheet logging (lower resolution & quality)
        const compressForSheet = async (file, { maxWidth = 400, maxHeight = 400, quality = 0.4 } = {}) => {
          if (!file.type.startsWith('image/')) throw new Error('Not an image');
          const dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
          });
          const img = await new Promise((resolve, reject) => {
            const i = new window.Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = dataUrl;
          });
          let { width, height } = img;
          const scale = Math.min(1, maxWidth / width, maxHeight / height);
          if (scale < 1) { width = Math.round(width * scale); height = Math.round(height * scale); }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const mime = (file.type === 'image/png' && ctx.getImageData(0,0,1,1).data[3] === 255) ? 'image/jpeg' : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
          const compressedDataUrl = canvas.toDataURL(mime, quality);
          return compressedDataUrl.split(',')[1];
        };
        try {
          imageBase64 = await compressForSheet(imageFile);
        } catch {
          // fallback to original if compression fails
          imageBase64 = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result.split(',')[1]); fr.onerror = reject; fr.readAsDataURL(imageFile); });
        }
        // Limit base64 string to 20,000 chars for Google Sheet safety
        if (imageBase64.length > 20000) imageBase64 = imageBase64.substring(0, 20000);
      }
      // Limit answerText to 20,000 chars for Google Sheet safety
      let answerTextForSheet = answerText;
      if (answerTextForSheet.length > 20000) answerTextForSheet = answerTextForSheet.substring(0, 20000);
      const rowData = [
        "", // user (empty for now)
        "BornoAI", // model
        selectedClass,
        selectedSubject,
        "", // chapter (not available)
        "", // question type (not available)
        question,
        imageBase64,
        answerTextForSheet
      ];
      fetch('https://geminiai-render.onrender.com/api/googleSheetLogger/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowData })
      });
      // --- End Google Sheet Logger ---
    } catch (error) {
      console.error("Error:", error);
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
        <div className="bg-base-100 rounded shadow p-3 sm:p-4 text-base sm:text-lg text-base-content" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
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