import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MathRenderer from '../MathRenderer/MathRenderer';
import { AI_MODELS, buildPrompt } from './ai-models';
import IOSButton from '../ios/iOSButton';
import IOSSelect from '../ios/iOSSelect';

const MAPPING_URL =
  'https://raw.githubusercontent.com/myselfhridoy/hmtutoring-database/refs/heads/main/bookcontentmapping.json';

const QUESTION_TYPES = [
  { value: 'জ্ঞানমূলক', label: 'জ্ঞানমূলক' },
  { value: 'অনুধাবন', label: 'অনুধাবন' },
  { value: 'বহুনির্বাচনী', label: 'বহুনির্বাচনী' },
  { value: 'গাণিতিক প্রশ্ন', label: 'গাণিতিক প্রশ্ন' },
  { value: 'সৃজনশীল', label: 'সৃজনশীল' },
];

export default function UnifiedAIPage({ modelId = 'gemmy' }) {
  const config = AI_MODELS[modelId];
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [question, setQuestion] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapping, setMapping] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [mappingError, setMappingError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setMappingLoading(true);
    fetch(`${MAPPING_URL}?_=${Date.now()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Mapping request failed (${response.status}).`);
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('The subject mapping has an unexpected format.');
        setMapping(data);
        setMappingError('');
      })
      .catch((requestError) => {
        if (requestError.name === 'AbortError') return;
        console.error('Unable to load AI subject mapping:', requestError);
        setMappingError('শ্রেণি ও বিষয়ের তালিকা লোড করা যায়নি।');
      })
      .finally(() => setMappingLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const classes = useMemo(
    () => Array.from(new Set(mapping.map((item) => item['শ্রেণি']).filter(Boolean))),
    [mapping]
  );
  const subjects = useMemo(() => {
    if (!selectedClass) return [];
    return Array.from(
      new Set(
        mapping
          .filter((item) => item['শ্রেণি'] === selectedClass)
          .map((item) => item['বিষয়'] || Object.values(item)[1])
          .filter(Boolean)
      )
    );
  }, [mapping, selectedClass]);
  const chapters = useMemo(() => {
    if (!selectedClass || !selectedSubject) return [];
    const found = mapping.find(
      (item) => item['শ্রেণি'] === selectedClass
        && (item['বিষয়'] || Object.values(item)[1]) === selectedSubject
    );
    const chapterMapping = found?.['অধ্যায়'] || found?.[Object.keys(found || {})[2]] || {};
    return Object.keys(chapterMapping);
  }, [mapping, selectedClass, selectedSubject]);

  const handleImage = useCallback((event) => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
    if (file) setAnswer('');
  }, [imagePreviewUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!question.trim() && !imageFile) {
      setError('প্রশ্ন লিখুন অথবা ছবি দিন।');
      return;
    }

    setLoading(true);
    setAnswer('');
    try {
      const context = selectedClass
        ? `আপনি ${selectedClass} ${selectedSubject || ''} এর "${selectedChapter || ''}" অধ্যায়ের একজন দক্ষ শিক্ষক।`
        : '';
      const prompt = buildPrompt(
        questionType,
        question || 'ছবিতে দেওয়া প্রশ্নটি দেখুন',
        context
      );
      const requestContext = {
        className: selectedClass,
        subjectName: selectedSubject,
        chapterName: selectedChapter,
      };
      let text;
      if (config.complete) {
        text = await config.complete(prompt, imageFile, requestContext);
      } else {
        const { url, options } = await config.buildRequest(prompt, imageFile, requestContext);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`API request failed (${response.status}).`);
        text = await config.parse(response);
      }
      setAnswer(text || 'কোনো উত্তর পাওয়া যায়নি।');
    } catch (requestError) {
      console.error(`AI request failed for ${modelId}:`, requestError);
      setError(requestError.message || 'সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const answerContent = useMemo(
    () => (answer ? <MathRenderer text={answer} /> : null),
    [answer]
  );

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
            style={{ background: `${config.color}15`, color: config.color }}
            aria-hidden="true"
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="ios-title-lg truncate">{config.label}</h1>
            <p className="ios-caption">AI-powered assistant</p>
          </div>
        </div>

        {mappingError && (
          <div role="alert" className="text-sm text-error bg-error/10 rounded-lg p-2.5 mb-3">
            {mappingError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="ios-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {React.createElement(IOSSelect, {
              label: 'শ্রেণি',
              placeholder: mappingLoading ? 'লোড হচ্ছে…' : 'শ্রেণি',
              options: classes,
              value: selectedClass,
              onChange: (event) => {
                setSelectedClass(event.target.value);
                setSelectedSubject('');
                setSelectedChapter('');
              },
              disabled: mappingLoading,
            })}
            {React.createElement(IOSSelect, {
              label: 'বিষয়',
              placeholder: selectedClass ? 'বিষয়' : 'প্রথমে শ্রেণি',
              options: subjects,
              value: selectedSubject,
              onChange: (event) => {
                setSelectedSubject(event.target.value);
                setSelectedChapter('');
              },
              disabled: !selectedClass,
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {React.createElement(IOSSelect, {
              label: 'অধ্যায়',
              placeholder: selectedSubject ? 'অধ্যায়' : 'প্রথমে বিষয়',
              options: chapters,
              value: selectedChapter,
              onChange: (event) => setSelectedChapter(event.target.value),
              disabled: !selectedSubject,
            })}
            {React.createElement(IOSSelect, {
              label: 'ধরণ',
              placeholder: 'প্রশ্নের ধরণ',
              options: QUESTION_TYPES,
              value: questionType,
              onChange: (event) => setQuestionType(event.target.value),
            })}
          </div>

          <div>
            <label htmlFor="ai-question" className="block text-[13px] font-semibold text-base-content/60 mb-1.5 px-1 uppercase tracking-wide">
              প্রশ্ন
            </label>
            <textarea
              id="ai-question"
              className="ios-input min-h-[110px] resize-none"
              placeholder="এখানে আপনার প্রশ্ন লিখুন…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </div>

          {config.supportsImage && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
                aria-label="Upload question image"
              />
              {!imagePreviewUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-base-content/20 text-base-content/60 text-sm font-medium flex items-center justify-center gap-2 ios-pressable"
                >
                  📷 ছবি যোগ করুন
                </button>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreviewUrl}
                    alt="প্রশ্নের ছবির প্রিভিউ"
                    className="w-full max-h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreviewUrl(null);
                      setImageFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    aria-label="Remove uploaded image"
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center ios-pressable"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="text-sm text-error bg-error/10 rounded-lg p-2.5">
              {error}
            </div>
          )}

          {React.createElement(
            IOSButton,
            {
              type: 'submit',
              fullWidth: true,
              loading,
              disabled: !question.trim() && !imageFile,
            },
            loading ? 'উত্তর তৈরি হচ্ছে…' : 'উত্তর জানুন'
          )}
        </form>

        {answer && (
          <div className="ios-card mt-4 p-4 ios-fade">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-success" />
              <h3 className="ios-headline">উত্তর</h3>
            </div>
            <div className="answer-content text-[15px] leading-relaxed">{answerContent}</div>
          </div>
        )}
      </div>
    </div>
  );
}
