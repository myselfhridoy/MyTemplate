import React, { useState } from 'react';
import DesmosGraphPage from './DesmosGraphPage';
import BoardResultPage from './BoardResultPage';
import { iOSCard as IOSCard } from '../Components/ios/iOSCard';

const TOOLS = [
  { value: 'board-result', label: 'বোর্ড পরীক্ষার ফলাফল', emoji: '🎓', desc: 'বোর্ড রেজাল্ট চেক করুন', color: '#ff2d55' },
  { value: 'desmos', label: 'গ্রাফ ক্যালকুলেটর', emoji: '📈', desc: 'Desmos graph calculator', color: '#007aff' },
  { value: 'telegram', label: 'টেলিগ্রাম বট', emoji: '💬', desc: 'HMTutoringAI Bot', color: '#34c759' },
  { value: 'facebook', label: 'Facebook পেজ', emoji: '📘', desc: 'আমাদের Facebook পেজ', color: '#5ac8fa' },
];

export default function ToolsPage() {
  const [selected, setSelected] = useState('');
  const [copied, setCopied] = useState(false);

  const copyTelegramLink = async () => {
    const link = 'https://t.me/HMTutoringAI_bot';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const didCopy = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!didCopy) throw new Error('Clipboard copy was not permitted.');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Unable to copy Telegram link:', error);
    }
  };

  const telegramCard = React.createElement(
    IOSCard,
    { className: 'p-5 text-center' },
    <>
      <div className="text-4xl mb-3">💬</div>
      <h2 className="ios-headline mb-2">H.M. Tutoring Bot</h2>
      <p className="ios-subhead mb-4">Open in Telegram app or browser</p>
      <div className="space-y-2">
        <a href="tg://resolve?domain=HMTutoringAI_bot" className="ios-btn ios-btn-primary w-full">
          Open in App
        </a>
        <a
          href="https://t.me/HMTutoringAI_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="ios-btn ios-btn-secondary w-full"
        >
          Open in Browser
        </a>
        <button type="button" onClick={copyTelegramLink} className="ios-btn ios-btn-ghost w-full">
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </>
  );

  const facebookCard = React.createElement(
    IOSCard,
    { className: 'p-5 text-center' },
    <>
      <div className="text-4xl mb-3">📘</div>
      <h2 className="ios-headline mb-2">H.M. Tutoring</h2>
      <p className="ios-subhead mb-4">Our official Facebook page</p>
      <a
        href="https://www.facebook.com/HMTutoring.Official/"
        target="_blank"
        rel="noopener noreferrer"
        className="ios-btn ios-btn-primary w-full"
      >
        Open Facebook
      </a>
    </>
  );

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <h1 className="ios-title mb-1">Tools</h1>
        <p className="ios-subhead mb-5">প্রয়োজনীয় টুলস</p>

        {!selected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOLS.map((tool) => (
              <button
                key={tool.value}
                type="button"
                onClick={() => setSelected(tool.value)}
                className="ios-card ios-pressable p-4 text-left w-full flex items-center gap-3"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${tool.color}20`, color: tool.color }}
                  aria-hidden="true"
                >
                  {tool.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">{tool.label}</p>
                  <p className="text-xs text-base-content/50 mt-0.5 truncate">{tool.desc}</p>
                </div>
                <svg className="w-4 h-4 text-base-content/30 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div>
            <button
              type="button"
              onClick={() => setSelected('')}
              className="mb-4 flex items-center gap-1 text-primary font-semibold text-sm ios-pressable"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back
            </button>

            {selected === 'desmos' && <DesmosGraphPage />}
            {selected === 'board-result' && <BoardResultPage />}
            {selected === 'telegram' && telegramCard}
            {selected === 'facebook' && facebookCard}
          </div>
        )}
      </div>
    </div>
  );
}
