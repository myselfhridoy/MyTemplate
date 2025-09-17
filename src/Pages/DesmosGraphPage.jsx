import React, { useRef, useEffect, useState } from "react";
const DESMOS_API_KEY = import.meta.env.VITE_DESMOS_API_KEY || "";
const DESMOS_API = `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${DESMOS_API_KEY}`;

const DesmosGraphPage = () => {
  const calculatorRef = useRef(null);
  const calculatorInstance = useRef(null);
  const [savedState, setSavedState] = useState(null);
  const [screenshot, setScreenshot] = useState(null);

  // Save graph state to localStorage
  const handleSave = () => {
    if (calculatorInstance.current) {
      const state = calculatorInstance.current.getState();
      setSavedState(state);
      window.localStorage.setItem("desmosGraphState", JSON.stringify(state));
    }
  };

  // Load graph state from localStorage
  const handleLoad = () => {
    if (calculatorInstance.current) {
      let state = savedState;
      if (!state) {
        const stored = window.localStorage.getItem("desmosGraphState");
        if (stored) state = JSON.parse(stored);
      }
      if (state) calculatorInstance.current.setState(state);
    }
  };

  // Reset graph to blank
  const handleReset = () => {
    if (calculatorInstance.current) {
      calculatorInstance.current.setBlank();
      setScreenshot(null);
    }
  };

  // Take screenshot and display below
  const handleScreenshot = () => {
    if (calculatorInstance.current) {
      const imgData = calculatorInstance.current.screenshot();
      setScreenshot(imgData);
    }
  };

  useEffect(() => {
    let script;
    function createCalculator() {
      if (calculatorRef.current && window.Desmos) {
        // Always use light theme
        if (calculatorInstance.current) {
          calculatorInstance.current.destroy();
        }
        calculatorInstance.current = window.Desmos.GraphingCalculator(calculatorRef.current, {
          keypad: true,
          invertedColors: false
        });
      }
    }
    if (!window.Desmos) {
      script = document.createElement("script");
      script.src = DESMOS_API;
      script.async = true;
      script.onload = createCalculator;
      document.body.appendChild(script);
    } else {
      createCalculator();
    }
    return () => {
      // Cleanup calculator instance
      if (calculatorInstance.current) {
        calculatorInstance.current.destroy();
        calculatorInstance.current = null;
      }
      // Remove script if it was added
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 600, margin: "0 auto", fontFamily: "'Hind Siliguri', 'Kalpurush', 'Noto Sans Bengali', 'SolaimanLipi', 'Arial', sans-serif" }}>
  <div className="desmos-card" style={{ marginBottom: 18 }}>
        <h2
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: 700,
            margin: "22px 0 18px 0",
            letterSpacing: 1
          }}
          className="desmos-title"
        >গ্রাফ ক্যালকুলেটর</h2>
        <style>{`
          .desmos-card {
            background: transparent;
            box-shadow: none;
            border-radius: 0;
            padding: 0;
          }
          @media (prefers-color-scheme: dark) {
            .desmos-card {
              background: transparent;
              box-shadow: none;
              border-radius: 0;
              padding: 0;
            }
          }
          .desmos-btn {
            font-size: 15px;
            color: #222;
            background: #e3f2fd;
            border: 1px solid #90caf9;
            border-radius: 8px;
            padding: 7px 12px;
            font-weight: 600;
            min-width: 90px;
            box-shadow: 0 2px 8px #90caf955;
            transition: background 0.2s, box-shadow 0.2s, color 0.2s;
          }
          @media (max-width: 480px) {
            .desmos-btn {
              font-size: 13px;
              padding: 5px 8px;
              min-width: 70px;
            }
          }
          .desmos-btn:hover, .desmos-btn:focus {
            background: #bbdefb;
            color: #1565c0;
            box-shadow: 0 4px 16px #90caf9aa;
            outline: none;
          }
          body[data-theme='light'] .desmos-title {
            color: #111 !important;
          }
          body[data-theme='dark'] .desmos-title {
            color: #fff !important;
            text-shadow: 0 2px 8px #222, 0 0 2px #1976d2;
          }
            body[data-theme='dark'] .desmos-title, .dark .desmos-title {
              color: #fff !important;
              text-shadow: 0 2px 8px #222, 0 0 2px #1976d2;
            }
            .desmos-btn {
              color: #fff;
              background: #263238;
              border: 1px solid #90caf9;
              box-shadow: 0 2px 8px #222a;
            }
            .desmos-btn:hover, .desmos-btn:focus {
              background: #1976d2;
              color: #e3f2fd;
              box-shadow: 0 4px 16px #1976d2aa;
            }
          }
        `}</style>
        
      </div>
      <div style={{ width: '100%', height: 0, borderBottom: '1.5px solid #90caf9', marginBottom: 1, opacity: 0.5 }}></div>
      <div
        id="calculator"
        ref={calculatorRef}
        style={{
          width: "100%",
          height: "450px",
          minHeight: "320px",
          boxSizing: "border-box"
        }}
      ></div>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 10,
          justifyContent: "center",
          margin: "18px 0 0 0",
          overflowX: "auto"
        }}
      >
        <button className="desmos-btn" onClick={handleSave}>সংরক্ষণ করুন</button>
        <button className="desmos-btn" onClick={handleLoad}>লোড করুন</button>
        <button className="desmos-btn" onClick={handleReset}>রিসেট করুন</button>
        <button className="desmos-btn" onClick={handleScreenshot}>স্ক্রিনশট</button>
      </div>
      {screenshot && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: '#1976d2' }}>স্ক্রিনশট</div>
          <img src={screenshot} alt="Graph Screenshot" style={{ maxWidth: "100%", border: "1px solid #ccc", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
};

export default DesmosGraphPage;

