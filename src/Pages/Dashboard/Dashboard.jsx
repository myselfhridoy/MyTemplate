import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import {
  iOSCard as IOSCard,
  iOSCardHeader as IOSCardHeader,
  iOSCardBody as IOSCardBody,
} from '../../Components/ios/iOSCard';

const FEATURES = [
  { to: '/board-cq', emoji: '📚', title: 'বোর্ড প্রশ্নব্যাংক', desc: 'বিগত বছরের বোর্ড প্রশ্ন', color: '#ff2d55' },
  { to: '/creative-cq', emoji: '📖', title: 'প্রশ্ন ব্যাংক', desc: 'সৃজনশীল প্রশ্ন ও উত্তর', color: '#007aff', adminOnly: true },
  { to: '/selftest', emoji: '📝', title: 'সেলফ টেস্ট', desc: 'নিজেকে যাচাই করুন', color: '#34c759', adminOnly: true },
  { to: '/bookcontent', emoji: '📕', title: 'পাঠ্যবই', desc: 'NCTB পাঠ্যবই', color: '#ffcc00', adminOnly: true },
  { to: '/ai-models', emoji: '🎓', title: 'AI টিউটর', desc: '১৪টি AI মডেল', color: '#5856d6' },
  { to: '/newsfeed', emoji: '📰', title: 'News Feed', desc: 'সোশ্যাল ফিড', color: '#5ac8fa' },
  { to: '/tools', emoji: '🛠️', title: 'টুলস', desc: 'Graph, Results, Bot', color: '#af52de' },
  { to: '/chapter-pdf', emoji: '🖨️', title: 'PDF Generator', desc: 'অধ্যায় PDF', color: '#ff9500', adminOnly: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const isAdmin = user?.isAdmin || user?.username === 'admin';

  useEffect(() => {
    if (!user?._id || isAdmin) return undefined;
    const controller = new AbortController();
    fetch(`https://geminiai-render.onrender.com/api/attendance/summary/${user._id}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Attendance request failed (${response.status}).`);
        return response.json();
      })
      .then((data) => {
        if (data.success) setSummary(data.summary);
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          console.error('Error fetching attendance summary:', requestError);
        }
      });
    return () => controller.abort();
  }, [user, isAdmin]);

  const todayStatus = () => {
    if (!summary?.classSchedule) return null;
    const { todayClass, nextClass } = summary.classSchedule;
    if (todayClass?.hasClass) {
      return {
        variant: todayClass.isFinished ? 'done' : 'live',
        text: todayClass.isFinished ? 'আজকের ক্লাস সম্পন্ন ✅' : `আজ ক্লাস আছে · ${todayClass.time}`,
      };
    }
    if (nextClass) {
      const dayMap = { Sat: 'শনি', Sun: 'রবি', Mon: 'সোম', Tue: 'মঙ্গল', Wed: 'বুধ', Thu: 'বৃহঃ', Fri: 'শুক্র' };
      return { variant: 'next', text: `পরবর্তী ক্লাস: ${dayMap[nextClass.day] || nextClass.day} · ${nextClass.time}` };
    }
    return { variant: 'none', text: 'রুটিন সেট করা নেই' };
  };

  const status = todayStatus();
  const statusColor = {
    done: 'bg-success/15 text-success',
    live: 'bg-primary/15 text-primary',
    next: 'bg-info/15 text-info',
    none: 'bg-base-content/10 text-base-content/60',
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        <div>
          <p className="ios-caption">স্বাগতম</p>
          <h1 className="ios-title">{user?.username || 'শিক্ষার্থী'}</h1>
        </div>

        {!isAdmin && status && (
          <div className={`rounded-2xl p-4 ${statusColor[status.variant]}`}>
            <p className="text-sm font-semibold">{status.text}</p>
          </div>
        )}

        {!isAdmin && summary && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'এই সপ্তাহে', value: summary.thisWeek || 0, color: '#007aff' },
              { label: 'এই মাসে', value: summary.thisMonth || 0, color: '#5856d6' },
              {
                label: 'Extra',
                value: summary.totalExtra >= 0 ? `+${summary.totalExtra}` : summary.totalExtra,
                color: '#34c759',
              },
            ].map((stat) => React.createElement(
                IOSCard,
                { key: stat.label, className: 'p-4' },
                <>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-base-content/50 mt-1">{stat.label}</p>
                </>
              ))}
          </div>
        )}

        {!isAdmin && summary?.latestWork && React.createElement(
            IOSCard,
            null,
            React.createElement(IOSCardHeader, {
              title: '📝 সর্বশেষ ক্লাসের পড়া',
              subtitle: new Date(summary.latestWork.date).toLocaleDateString('bn-BD'),
            }),
            React.createElement(
              IOSCardBody,
              null,
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-base-content/50 uppercase mb-1">Classwork</p>
                  <p className="text-sm whitespace-pre-wrap">{summary.latestWork.classwork || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-base-content/50 uppercase mb-1">Homework</p>
                  <p className="text-sm whitespace-pre-wrap">{summary.latestWork.homework || '—'}</p>
                </div>
              </div>
            )
        )}

        <div>
          <h2 className="ios-headline mb-3 px-1">Explore</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.filter((feature) => !feature.adminOnly || isAdmin).map((feature) => (
              <button
                key={feature.to}
                type="button"
                onClick={() => navigate(feature.to)}
                className="ios-card ios-pressable p-4 text-left w-full"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: `${feature.color}20`, color: feature.color }}
                  aria-hidden="true"
                >
                  {feature.emoji}
                </div>
                <p className="font-semibold text-[15px] leading-tight">{feature.title}</p>
                <p className="text-xs text-base-content/50 mt-0.5">{feature.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
