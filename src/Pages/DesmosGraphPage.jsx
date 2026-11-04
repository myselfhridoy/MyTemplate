import { useCallback, useEffect, useRef, useState } from 'react';
import IOSButton from '../Components/ios/iOSButton';
import IOSCard from '../Components/ios/iOSCard';

const DESMOS_API_KEY = import.meta.env.VITE_DESMOS_API_KEY || '';
const DESMOS_API = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${DESMOS_API_KEY}`;
const STORAGE_KEY = 'desmosGraphState';

export default function DesmosGraphPage() {
  const calcRef = useRef(null);
  const calcInstance = useRef(null);
  const [savedState, setSavedState] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [scriptLoading, setScriptLoading] = useState(true);
  const [scriptError, setScriptError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showScreenshot, setShowScreenshot] = useState(false);

  const handleSave = useCallback(() => {
    if (!calcInstance.current) return;
    try {
      const state = calcInstance.current.getState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSavedState(state);
      setActionError('');
    } catch (error) {
      console.error('Desmos graph save failed:', error);
      setActionError('গ্রাফ সংরক্ষণ করা যায়নি। ব্রাউজারের storage সেটিংস পরীক্ষা করে আবার চেষ্টা করুন।');
    }
  }, []);

  const handleLoad = useCallback(() => {
    if (!calcInstance.current) return;
    let state = savedState;
    if (!state) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) state = JSON.parse(stored);
      } catch (error) {
        console.error('Saved Desmos graph could not be read:', error);
        setActionError('সংরক্ষিত গ্রাফ পড়া যায়নি। সংরক্ষিত ডেটা নষ্ট বা unavailable হতে পারে।');
        return;
      }
    }
    if (!state) {
      setActionError('লোড করার মতো কোনো সংরক্ষিত গ্রাফ নেই।');
      return;
    }
    try {
      calcInstance.current.setState(state);
      setActionError('');
    } catch (error) {
      console.error('Desmos graph load failed:', error);
      setActionError('সংরক্ষিত গ্রাফ লোড করা যায়নি।');
    }
  }, [savedState]);

  const handleReset = useCallback(() => {
    if (!calcInstance.current) return;
    try {
      calcInstance.current.setBlank();
      setScreenshot(null);
      setShowScreenshot(false);
      setActionError('');
    } catch (error) {
      console.error('Desmos graph reset failed:', error);
      setActionError('গ্রাফ রিসেট করা যায়নি। আবার চেষ্টা করুন।');
    }
  }, []);

  const handleScreenshot = useCallback(() => {
    if (!calcInstance.current) return;
    try {
      const imageData = calcInstance.current.screenshot();
      if (!imageData) throw new Error('Desmos returned an empty screenshot.');
      setScreenshot(imageData);
      setShowScreenshot(true);
      setActionError('');
    } catch (error) {
      console.error('Desmos screenshot failed:', error);
      setActionError('স্ক্রিনশট নেওয়া যায়নি। আবার চেষ্টা করুন।');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let script;
    let createdScript = false;

    const createCalculator = () => {
      if (!mounted || !calcRef.current || !window.Desmos) return;
      try {
        calcInstance.current?.destroy();
        calcInstance.current = window.Desmos.GraphingCalculator(calcRef.current, {
          keypad: true,
          invertedColors: false,
        });
        setScriptError('');
      } catch (error) {
        console.error('Desmos initialization failed:', error);
        setScriptError('গ্রাফ ক্যালকুলেটর চালু করা যায়নি। পৃষ্ঠাটি refresh করে আবার চেষ্টা করুন।');
      } finally {
        setScriptLoading(false);
      }
    };

    const handleScriptError = () => {
      if (!mounted) return;
      const error = new Error('Failed to load Desmos script.');
      console.error('Desmos script loading failed:', error);
      setScriptError('Desmos ক্যালকুলেটর লোড হয়নি। ইন্টারনেট সংযোগ এবং API key পরীক্ষা করে আবার চেষ্টা করুন।');
      setScriptLoading(false);
    };

    if (window.Desmos) {
      createCalculator();
    } else if (!DESMOS_API_KEY) {
      console.error('Desmos API key is missing (VITE_DESMOS_API_KEY).');
      setScriptError('Desmos API key সেট করা নেই। VITE_DESMOS_API_KEY কনফিগার করুন।');
      setScriptLoading(false);
    } else {
      script = document.querySelector('script[data-desmos-api]');
      if (!script) {
        script = document.createElement('script');
        script.src = DESMOS_API;
        script.async = true;
        script.dataset.desmosApi = 'true';
        document.body.appendChild(script);
        createdScript = true;
      }
      script.addEventListener('load', createCalculator);
      script.addEventListener('error', handleScriptError);
      if (window.Desmos) createCalculator();
    }

    return () => {
      mounted = false;
      script?.removeEventListener('load', createCalculator);
      script?.removeEventListener('error', handleScriptError);
      if (calcInstance.current) {
        try {
          calcInstance.current.destroy();
        } catch (error) {
          console.error('Desmos cleanup failed:', error);
        }
        calcInstance.current = null;
      }
      if (createdScript) script?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-base-200 pb-24" style={{ fontFamily: 'Hind Siliguri, sans-serif' }}>
      <div className="mx-auto max-w-2xl px-3 pt-4 sm:px-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl text-primary shadow-md">
            📈
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="ios-title-lg truncate">গ্রাফ ক্যালকুলেটর</h1>
            <p className="ios-caption">Desmos · ইন্টারঅ্যাকটিভ গ্রাফ</p>
          </div>
        </div>

        <IOSCard className="mb-3 overflow-hidden !p-0">
          <div className="px-4 pb-1 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/40">
              Graph
            </span>
          </div>
          <div className="relative">
            {scriptLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100">
                <div className="flex flex-col items-center gap-2 text-sm text-base-content/60">
                  <span
                    className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent"
                    style={{ animation: 'spin 0.7s linear infinite' }}
                    aria-hidden="true"
                  />
                  ক্যালকুলেটর লোড হচ্ছে...
                </div>
              </div>
            )}
            {scriptError && !scriptLoading && (
              <div role="alert" className="absolute inset-0 z-10 flex items-center justify-center bg-base-100 p-6 text-center text-sm text-error">
                {scriptError}
              </div>
            )}
            <div
              id="calculator"
              ref={calcRef}
              style={{ width: '100%', height: 450, minHeight: 320, boxSizing: 'border-box' }}
            />
          </div>
        </IOSCard>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <IOSButton onClick={handleSave} variant="secondary" disabled={scriptLoading || Boolean(scriptError)}>
            💾 সংরক্ষণ
          </IOSButton>
          <IOSButton onClick={handleLoad} variant="secondary" disabled={scriptLoading || Boolean(scriptError)}>
            📂 লোড
          </IOSButton>
          <IOSButton onClick={handleReset} variant="secondary" disabled={scriptLoading || Boolean(scriptError)}>
            🔄 রিসেট
          </IOSButton>
          <IOSButton onClick={handleScreenshot} disabled={scriptLoading || Boolean(scriptError)}>
            📸 স্ক্রিনশট
          </IOSButton>
        </div>

        {actionError && (
          <p role="alert" className="mb-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {actionError}
          </p>
        )}

        {screenshot && showScreenshot && (
          <IOSCard className="ios-fade p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-base-content/60">
                স্ক্রিনশট
              </span>
              <button
                type="button"
                onClick={() => setShowScreenshot(false)}
                className="ios-pressable flex h-7 w-7 items-center justify-center rounded-full bg-base-content/10 text-[11px] text-base-content/60"
                aria-label="স্ক্রিনশট লুকান"
              >
                ✕
              </button>
            </div>
            <img
              src={screenshot}
              alt="Graph screenshot"
              className="w-full rounded-lg border border-base-content/10"
            />
            <p className="mt-2 text-center text-[10px] text-base-content/40">
              ছবি সংরক্ষণ করতে চেপে ধরে রাখুন
            </p>
          </IOSCard>
        )}

        <p className="mt-4 text-center text-[11px] text-base-content/40">
          সংরক্ষণ, লোড ও রিসেট আপনার ব্রাউজারেই থাকে।
        </p>
      </div>
    </div>
  );
}
