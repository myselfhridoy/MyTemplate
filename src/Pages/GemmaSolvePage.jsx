import React, { useState, useRef } from "react";
import MathRenderer from "../Components/MathRenderer/MathRenderer";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemma-3-27b-it:free";

export default function GemmaSolvePage() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAnswer("");
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer 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`, // Replace with your key
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages: [
            { role: "system", content: "You are a helpful math and science assistant. Answer in Bengali if the question is in Bengali. Use LaTeX for math." },
            { role: "user", content: input },
          ],
          stream: true,
        }),
        signal: abortRef.current.signal,
      });
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      let result = "";
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // OpenRouter streams as lines of JSON (SSE-like)
        chunk.split("\n").forEach((line) => {
          if (line.startsWith("data:")) {
            const data = line.replace("data:", "").trim();
            if (data && data !== "[DONE]") {
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content || "";
                result += delta;
                setAnswer((prev) => prev + delta);
              } catch {}
            }
          }
        });
      }
    } catch (err) {
      setAnswer("[Error] " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Doubt Solve (Gemma 3 27B via OpenRouter)</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="প্রশ্ন লিখুন বা paste করুন..."
          disabled={loading}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Loading..." : "Solve"}
        </button>
        {loading && (
          <button
            type="button"
            className="ml-2 text-red-500 underline"
            onClick={handleStop}
          >
            Stop
          </button>
        )}
      </form>
      <div className="border rounded p-4 min-h-[120px] bg-gray-50">
        {answer ? <MathRenderer content={answer} /> : <span className="text-gray-400">উত্তর এখানে দেখাবে...</span>}
      </div>
    </div>
  );
}
