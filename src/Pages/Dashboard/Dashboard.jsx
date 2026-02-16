import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';


function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);



  useEffect(() => {
    if (user && user._id) { // Ensure user has ID
      // Fetch summary if student
      const fetchSummary = async () => {
        try {
          // Use user._id if available, fallback to verify
          // Authenticated user object should have _id
          if (!user._id) return;

          const response = await fetch(`https://geminiai-render.onrender.com/api/attendance/summary/${user._id}`);
          const data = await response.json();
          if (data.success) {
            setSummary(data.summary);
          }
        } catch (error) {
          console.error("Error fetching summary:", error);
        } finally {
          setLoadingSummary(false);
        }
      };
      fetchSummary();
    } else {
      setLoadingSummary(false);
    }
  }, [user]);

  // Logic for Today's Status
  const getTodayStatus = () => {
    if (!summary || !summary.classSchedule) return null;

    const { todayClass, nextClass } = summary.classSchedule;

    if (todayClass && todayClass.hasClass) {
      if (todayClass.isFinished) {
        return (
          <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-bold">আজকে হৃদয় স্যারের পড়া শেষ হয়েছে ✅</p>
            <p>সময়: {todayClass.time}</p>
          </div>
        );
      }
      return (
        <div className="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 mb-6 rounded shadow-sm" role="alert">
          <p className="font-bold">আজকে হৃদয় স্যারের পড়া আছে</p>
          <p>সময়: {todayClass.time}</p>
        </div>
      );
    } else if (nextClass) {
      const dayMapping = {
        'Sat': 'শনি', 'Sun': 'রবি', 'Mon': 'সোম', 'Tue': 'মঙ্গল', 'Wed': 'বুধ', 'Thu': 'বৃহঃ', 'Fri': 'শুক্র'
      };
      const banglaDay = dayMapping[nextClass.day] || nextClass.day;

      const { upcomingMakeup } = summary.classSchedule;
      // Show upcoming makeup if exists and NOT today
      let makeupMsg = null;
      if (upcomingMakeup && !summary.classSchedule.todayClass?.isMakeup) {
        const mkDate = new Date(upcomingMakeup.date).toLocaleDateString('en-GB');
        makeupMsg = (
          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-800/30 rounded border border-blue-200 dark:border-blue-700">
            <p className="font-bold text-sm">🔔 এর আগে Makeup Class আছে:</p>
            <p className="text-sm">{mkDate} ({upcomingMakeup.time})</p>
          </div>
        );
      }

      return (
        <div className="bg-blue-100 dark:bg-blue-900 border-l-4 border-blue-500 text-blue-700 dark:text-blue-200 p-4 mb-6 rounded shadow-sm" role="alert">
          <p className="font-bold">আজকে হৃদয় স্যারের পড়া নেই</p>
          <p>পরবর্তী পড়া: {banglaDay}বার ({nextClass.time})</p>
          {makeupMsg}
        </div>
      );
    } else {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-500 text-gray-700 dark:text-gray-300 p-4 mb-6 rounded shadow-sm" role="alert">
          <p>কোনো রুটিন সেট করা নেই</p>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-10 px-4" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>

      {/* Student Specific Section */}
      {user && !user.isAdmin && user.username !== 'admin' && (
        <>
          {/* 1. Today's Status */}
          {getTodayStatus()}

          {/* 2. Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="stats shadow bg-base-100 border border-base-200">
              <div className="stat">
                <div className="stat-title text-sm">এই সপ্তাহে পড়েছো</div>
                <div className="stat-value text-primary">{loadingSummary ? '...' : (summary?.thisWeek || 0)} <span className="text-sm font-normal text-base-content/60">দিন</span></div>
              </div>
            </div>
            <div className="stats shadow bg-base-100 border border-base-200">
              <div className="stat">
                <div className="stat-title text-sm">এই মাসে পড়েছো</div>
                <div className="stat-value text-secondary">{loadingSummary ? '...' : (summary?.thisMonth || 0)} <span className="text-sm font-normal text-base-content/60">দিন</span></div>
              </div>
            </div>
            <div className="stats shadow bg-base-100 border border-base-200">
              <div className="stat">
                <div className="stat-title text-sm">সর্বমোট Extra ক্লাস</div>
                <div className={`stat-value ${(summary?.totalExtra || 0) >= 0 ? 'text-accent' : 'text-error'}`}>
                  {loadingSummary ? '...' : (
                    (summary?.totalExtra || 0) >= 0
                      ? `+${summary?.totalExtra || 0}`
                      : `${summary?.totalExtra || 0}`
                  )} <span className="text-sm font-normal text-base-content/60">দিন</span>
                </div>
                <div className="stat-desc">
                  এই মাসে নির্ধারিত: {summary?.thisMonthExpected || (summary?.scheduleStats?.daysPerMonth || 0)} ক্লাস
                </div>
              </div>
            </div>
          </div>

          {/* 3. Classwork / Homework */}
          {summary?.latestWork && (
            <div className="card bg-base-100 shadow-xl border border-base-200 mb-10">
              <div className="card-body">
                <h2 className="card-title text-lg mb-2 flex justify-between">
                  <span>📝 সর্বশেষ ক্লাসের পড়া</span>
                  <span className="text-xs font-normal opacity-60 badge badge-ghost">
                    {new Date(summary.latestWork.date).toLocaleDateString('en-GB')}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <h3 className="font-bold text-sm opacity-70 mb-1">Classwork</h3>
                    <p className="whitespace-pre-wrap">{summary.latestWork.classwork || "কোনো ক্লাসওয়ার্ক নেই"}</p>
                  </div>
                  <div className="bg-base-200/50 p-4 rounded-lg">
                    <h3 className="font-bold text-sm opacity-70 mb-1">Homework</h3>
                    <p className="whitespace-pre-wrap">{summary.latestWork.homework || "কোনো হোমওয়ার্ক নেই"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="divider my-8">অন্যান্য ফিচার</div>
        </>
      )}

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">

        {/* প্রশ্ন ব্যাংক ফিচার কার্ড - Admin Only */}
        {(user?.isAdmin || user?.username === 'admin') && (
          <div
            className="group relative bg-gradient-to-br from-blue-100 via-blue-50 to-white dark:from-blue-900 dark:via-blue-950 dark:to-gray-900 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={() => navigate('/creative-cq')}
          >
            <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📚</div>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="bg-blue-600/90 dark:bg-blue-700/80 rounded-full p-2 mb-1 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
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
        )}

        {/* বোর্ড পরীক্ষার প্রশ্নব্যাংক কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-rose-100 via-rose-50 to-white dark:from-rose-900 dark:via-rose-950 dark:to-gray-900 rounded-xl shadow-lg border border-rose-200 dark:border-rose-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/board-cq')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">🏛️</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-rose-600/90 dark:bg-rose-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m5-12h4m-4 4h4" /></svg>
            </div>
            <span className="text-lg font-bold text-rose-800 dark:text-rose-200 tracking-tight">বোর্ড পরীক্ষার প্রশ্নব্যাংক</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">বিভিন্ন বোর্ড পরীক্ষার বিগত বছরের প্রশ্ন ব্রাউজ করুন ও AI দিয়ে সমাধান করুন।</span>
          </div>
          <button
            className="btn mt-4 w-full group-hover:scale-105 transition-transform text-base bg-rose-600 hover:bg-rose-700 text-white border-none"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/board-cq'); }}
          >বোর্ড প্রশ্নব্যাংক দেখুন</button>
        </div>

        {/* পাঠ্যবই ফিচার কার্ড - Admin Only */}
        {(user?.isAdmin || user?.username === 'admin') && (
          <div
            className="group relative bg-gradient-to-br from-yellow-100 via-yellow-50 to-white dark:from-yellow-900 dark:via-yellow-950 dark:to-gray-900 rounded-xl shadow-lg border border-yellow-200 dark:border-yellow-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={() => navigate('/bookcontent')}
          >
            <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📖</div>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="bg-yellow-500/90 dark:bg-yellow-600/80 rounded-full p-2 mb-1 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
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
        )}

        {/* সেলফ টেস্ট ফিচার কার্ড - Admin Only */}
        {(user?.isAdmin || user?.username === 'admin') && (
          <div
            className="group relative bg-gradient-to-br from-green-100 via-green-50 to-white dark:from-green-900 dark:via-green-950 dark:to-gray-900 rounded-xl shadow-lg border border-green-200 dark:border-green-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={() => navigate('/selftest')}
          >
            <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📝</div>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="bg-green-600/90 dark:bg-green-700/80 rounded-full p-2 mb-1 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
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
        )}

        {/* AI টিউটর ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-indigo-100 via-indigo-50 to-white dark:from-indigo-900 dark:via-indigo-950 dark:to-gray-900 rounded-xl shadow-lg border border-indigo-200 dark:border-indigo-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/ai-aggregator')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">🎓</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-indigo-600/90 dark:bg-indigo-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
            </div>
            <span className="text-lg font-bold text-indigo-800 dark:text-indigo-200 tracking-tight">AI টিউটর</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">বিষয়ভিত্তিক AI টিউটর, শ্রেণি ও বিষয় সিলেক্ট করে পড়ুন।</span>
          </div>
          <button
            className="btn btn-primary mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/ai-aggregator'); }}
          >AI টিউটর খুলুন</button>
        </div>

        {/* AI টিউটর (সকল শ্রেণি) ফিচার কার্ড - Admin Only */}
        {(user?.isAdmin || user?.username === 'admin') && (
          <div
            className="group relative bg-gradient-to-br from-cyan-100 via-cyan-50 to-white dark:from-cyan-900 dark:via-cyan-950 dark:to-gray-900 rounded-xl shadow-lg border border-cyan-200 dark:border-cyan-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={() => navigate('/ai-aggregator-2')}
          >
            <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">🎓</div>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="bg-cyan-600/90 dark:bg-cyan-700/80 rounded-full p-2 mb-1 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
              </div>
              <span className="text-lg font-bold text-cyan-800 dark:text-cyan-200 tracking-tight">AI টিউটর (সকল শ্রেণি)</span>
              <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">সব ক্লাসের জন্য AI টিউটর, ফ্রি ফরম ইনপুট সহ।</span>
            </div>
            <button
              className="btn btn-info mt-4 w-full group-hover:scale-105 transition-transform text-base"
              style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
              onClick={e => { e.stopPropagation(); navigate('/ai-aggregator-2'); }}
            >AI টিউটর (সকল শ্রেণি) খুলুন</button>
          </div>
        )}

        {/* ChatPDF ফিচার কার্ড - Admin Only */}
        {(user?.isAdmin || user?.username === 'admin') && (
          <div
            className="group relative bg-gradient-to-br from-fuchsia-100 via-fuchsia-50 to-white dark:from-fuchsia-900 dark:via-fuchsia-950 dark:to-gray-900 rounded-xl shadow-lg border border-fuchsia-200 dark:border-fuchsia-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={() => navigate('/chatpdf')}
          >
            <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">📄</div>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="bg-fuchsia-600/90 dark:bg-fuchsia-700/80 rounded-full p-2 mb-1 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span className="text-lg font-bold text-fuchsia-800 dark:text-fuchsia-200 tracking-tight">ChatPDF</span>
              <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">PDF বা যেকোনো ফাইল আপলোড করে AI-এর সাথে আলাপ করুন।</span>
            </div>
            <button
              className="btn btn-primary mt-4 w-full group-hover:scale-105 transition-transform text-base"
              style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
              onClick={e => { e.stopPropagation(); navigate('/chatpdf'); }}
            >ChatPDF খুলুন</button>
          </div>
        )}

        {/* প্রয়োজনীয় টুলস ফিচার কার্ড */}
        <div
          className="group relative bg-gradient-to-br from-cyan-100 via-cyan-50 to-white dark:from-cyan-900 dark:via-cyan-950 dark:to-gray-900 rounded-xl shadow-lg border border-cyan-200 dark:border-cyan-800 p-4 flex flex-col items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden min-h-[220px]"
          style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
          onClick={() => navigate('/tools')}
        >
          <div className="absolute top-0 right-0 opacity-10 text-[5rem] pointer-events-none select-none">🛠️</div>
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="bg-cyan-600/90 dark:bg-cyan-700/80 rounded-full p-2 mb-1 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0H3m9 0a9 9 0 100-18 9 9 0 000 18z" /></svg>
            </div>
            <span className="text-lg font-bold text-cyan-800 dark:text-cyan-200 tracking-tight">প্রয়োজনীয় টুলস</span>
            <span className="text-gray-700 dark:text-gray-200 text-center text-sm font-medium">বিভিন্ন টুলস ব্যবহার করুন, যেমন গ্রাফ ক্যালকুলেটর।</span>
          </div>
          <button
            className="btn btn-info mt-4 w-full group-hover:scale-105 transition-transform text-base"
            style={{ fontFamily: 'Hind Siliguri, sans-serif' }}
            onClick={e => { e.stopPropagation(); navigate('/tools'); }}
          >টুলস দেখুন</button>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;