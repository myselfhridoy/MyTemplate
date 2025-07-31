
import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto max-w-4xl py-10 px-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      {/* <h1 className="text-4xl font-extrabold mb-10 text-center tracking-tight text-gray-900 dark:text-white drop-shadow">Dashboard</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* প্রশ্ন ব্যাংক ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-blue-100 via-blue-50 to-white dark:from-blue-900 dark:via-blue-950 dark:to-gray-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/creative-cq')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📚</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-blue-600/90 dark:bg-blue-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z"/></svg>
            </div>
            <span className="text-lg font-bold text-blue-800 dark:text-blue-200 tracking-tight">প্রশ্ন ব্যাংক</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">বিভিন্ন শ্রেণি ও বিষয়ের সৃজনশীল প্রশ্ন ও উত্তর ব্রাউজ করুন।</span>
          </div>
          <button
            className="btn btn-primary mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/creative-cq'); }}
          >প্রশ্ন ব্যাংক দেখুন</button>
        </div>
        {/* পাঠ্যবই ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-yellow-100 via-yellow-50 to-white dark:from-yellow-900 dark:via-yellow-950 dark:to-gray-900 rounded-xl shadow-lg border border-yellow-200 dark:border-yellow-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/bookcontent')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📖</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-yellow-500/90 dark:bg-yellow-600/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z"/></svg>
            </div>
            <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200 tracking-tight">পাঠ্যবই</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">বিভিন্ন শ্রেণি ও বিষয়ের পাঠ্যবইয়ের অধ্যায়সমূহ দেখুন ও পড়ুন।</span>
          </div>
          <button
            className="btn btn-warning mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/bookcontent'); }}
          >পাঠ্যবই দেখুন</button>
        </div>
        {/* সেলফ টেস্ট ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-green-100 via-green-50 to-white dark:from-green-900 dark:via-green-950 dark:to-gray-900 rounded-xl shadow-lg border border-green-200 dark:border-green-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/selftest')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📝</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-green-600/90 dark:bg-green-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z"/></svg>
            </div>
            <span className="text-lg font-bold text-green-800 dark:text-green-200 tracking-tight">সেলফ টেস্ট</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">নিজেকে যাচাই করুন MCQ সেলফ টেস্ট দিয়ে, রেজাল্ট ও বিশ্লেষণসহ।</span>
          </div>
          <button
            className="btn btn-success mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/selftest'); }}
          >সেলফ টেস্ট দিন</button>
        </div>
        {/* AI সহকারী ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-indigo-100 via-indigo-50 to-white dark:from-indigo-900 dark:via-indigo-950 dark:to-gray-900 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/ai-assistant')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">🤖</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-indigo-600/90 dark:bg-indigo-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z"/></svg>
            </div>
            <span className="text-lg font-bold text-indigo-800 dark:text-indigo-200 tracking-tight">AI সহকারী</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">প্রশ্ন করুন (লিখে বা ছবি দিয়ে), উত্তর বাংলায় ও মুসলিম দৃষ্টিকোণ থেকে জানুন।</span>
          </div>
          <button
            className="btn btn-info mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/ai-assistant'); }}
          >AI সহকারী ব্যবহার করুন</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
