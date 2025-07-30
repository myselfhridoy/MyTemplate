import React, { useState } from 'react';

function ExamStartForm({ loading, onStart, selfTestId, testStatus }) {
  const [examName, setExamName] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!examName.trim()) return;
    onStart(examName);
  };
  return (
    <div className="flex flex-col justify-center text-center text-gray-900 dark:text-gray-100 px-2 md:px-6 py-6 md:py-20">
      <div className="flex justify-center py-4">
        <img
          alt=""
          width={120}
          height={120}
          className="w-14 h-14 md:w-28 md:h-28"
          src="/vite.svg"
          style={{ color: 'transparent' }}
        />
      </div>
      <div className="xl:mx-60 md:mx-52 sm:mx-36 mx-10">
        <p className="text-left font-bold text-[21px]">পরীক্ষার নাম দিন</p>
        <input
          type="text"
          className="w-full p-2 border border-green-600 rounded-md my-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          placeholder="পরীক্ষার নাম দিন"
          value={examName}
          onChange={e => setExamName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="xl:mx-60 md:mx-52 sm:mx-36 mx-10">
        <button
          className="btn bg-green-600 hover:bg-green-700 font-bold text-[21px] text-white rounded-md my-3 w-full"
          type="button"
          onClick={handleSubmit}
          disabled={loading || !examName.trim() || !selfTestId}
        >
          পরীক্ষা শুরু করো
        </button>
        {testStatus && <div className="mt-2 text-center text-blue-700 dark:text-blue-300">{testStatus}</div>}
      </div>
    </div>
  );
}

export default ExamStartForm;
