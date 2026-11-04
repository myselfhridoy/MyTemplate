// Bengali number utility
function getBengaliNum(num) {
  return String(num).split('').map(d => '০১২৩৪৫৬৭৮৯'[d] ?? d).join('');
}
import React from 'react';
import { MathJax } from 'better-react-mathjax';

const CQCard = ({ data, showUddipak = true, showSource = false }) => {
  // Check if data exists and has the expected structure
  if (!data || !data.উদ্দীপক) return null;

  return (
    <div className="card bg-base-100 shadow-xl my-4">
      <div className="card-body">
        {/* Stimulus Section */}
        {/* কার্ড টাইটেল ও সোর্স সবসময় দেখাবে */}
        <div className={showUddipak ? "border-b pb-4 mb-4" : "mb-4"}>
          <div className="flex items-center gap-2">
            <h2 className="card-title text-xl font-bold mb-0">
              {data.index ? `${getBengaliNum(data.index)}। ` : ''}{data.উদ্দীপক.title || 'Untitled'}
            </h2>
            {/* কার্ড টাইটেলের পাশে সোর্স */}
            {showSource && (
              <span className="text-sm text-gray-500 font-normal">সোর্স: {data.source || 'N/A'}</span>
            )}
          </div>
          {/* Stimulus description/image শুধু showUddipak=true হলে দেখাবে */}
          {showUddipak && (
            <>
              {data.উদ্দীপক.description && (
                <MathJax dynamic>{data.উদ্দীপক.description}</MathJax>
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

        {/* Questions Section */}
        {data.প্রশ্নাবলী && (
          <div className="space-y-4">
            {data.প্রশ্নাবলী.map((question, index) => (
              <div key={index} className="border-l-4 border-primary pl-4 mb-2">
                <div className="flex items-start">
                  <span className="font-bold mr-2">{question.ক্রমিক || 'Q'}.</span>
                  <div>
                    {question.প্রশ্ন && (
                      <MathJax dynamic>{question.প্রশ্ন}</MathJax>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CQCard;
