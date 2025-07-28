import React from 'react';
import { MathJax } from 'better-react-mathjax';
import { useState } from 'react';

const CQWithAnswer = ({ data, showUddipak = true }) => {
  if (!data || !data.উদ্দীপক) return null;

  // Bengali numerals for any number
  const getBengaliNum = (num) => String(num).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');
  const [openIdx, setOpenIdx] = useState(null);

  // Helper to render mixed text and math
  const renderWithMathJax = (text) => {
    if (!text) return null;
    // Split by $...$
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (/^\$[^$]+\$$/.test(part)) {
            // MathJax inline
            return <span key={i} style={{display: 'inline'}}><MathJax inline dynamic>{part}</MathJax></span>;
          }
          // Split text by line breaks and render with <br />
          const lines = part.split(/\r?\n/);
          return lines.map((line, idx) => (
            <span key={i + '-' + idx}>
              {line}
              {idx < lines.length - 1 ? <br /> : null}
            </span>
          ));
        })}
      </span>
    );
  };

  return (
    <div className="card bg-base-100 shadow-xl my-4 overflow-x-auto">
      <div className="card-body p-4 sm:p-6" style={{wordBreak: 'break-word', overflowX: 'auto'}}>
        {/* কার্ড টাইটেল ও সোর্স সবসময় দেখাবে */}
        <div className={showUddipak ? "border-b pb-4 mb-4" : "mb-4"}>
          <div className="flex items-center gap-2">
            <h2 className="card-title text-xl font-bold mb-0">
              {data.index ? `${getBengaliNum(data.index)}। ` : ''}{data.উদ্দীপক.title || 'Untitled'}
            </h2>
            {/* কার্ড টাইটেলের পাশে সোর্স */}
            {typeof data.showSource !== 'undefined' && data.showSource && (
              <span className="text-sm text-gray-500 font-normal">সোর্স: {data.source || 'N/A'}</span>
            )}
          </div>
          {/* Stimulus description/image শুধু showUddipak=true হলে দেখাবে */}
          {showUddipak && (
            <>
              {data.উদ্দীপক.description && (
                <div>{renderWithMathJax(data.উদ্দীপক.description)}</div>
              )}
              {data.উদ্দীপক.image && data.উদ্দীপক.image.trim() !== '' && (
                <div className="flex justify-center items-center mt-4">
                  <img 
                    src={data.উদ্দীপক.image} 
                    alt={data.উদ্দীপক.title}
                    className="rounded-lg max-w-xs h-auto"
                    style={{ maxHeight: '180px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
        {/* Questions & Answers Accordion */}
        {data.প্রশ্নাবলী && (
          <div className="space-y-4 mt-6">
            {data.প্রশ্নাবলী.map((question, index) => (
              <div key={index} className="border-l-4 border-primary pl-4">
                <div className="flex items-start">
                  <span className="font-bold mr-2">{question.ক্রমিক || getBengaliNum(index)}.</span>
                  <div>
                    {question.প্রশ্ন && (
                      <div>{renderWithMathJax(question.প্রশ্ন)}</div>
                    )}
                  </div>
                </div>
                {/* Answer Accordion */}
                {question.উত্তর && (
                  <div className="mt-2">
                    <button
                      className="btn btn-sm btn-outline btn-success mb-2"
                      onClick={() => setOpenIdx(openIdx === index ? null : index)}
                    >
                      {openIdx === index ? 'উত্তর লুকান' : 'উত্তর দেখুন'}
                    </button>
                    {openIdx === index && (
                      <div className="p-3 bg-gray-50 rounded border border-gray-200 animate-fade-in" style={{maxWidth: '100vw', wordBreak: 'break-word', overflowX: 'auto'}}>
                        <span className="font-semibold text-success">উত্তর:</span>
                        <div className="mt-1 text-gray-700" style={{overflow: 'visible'}}>
                          {renderWithMathJax(question.উত্তর)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CQWithAnswer;
