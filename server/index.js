import express from 'express';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import process from 'process';
const app = express();
app.use(express.json());

// Gemini endpoint
app.post('/api/gemini', async (req, res) => {
  const { parts = [], model = 'gemini-2.5-flash', generationConfig = {} } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const MAX_PARTS_BYTES = parseInt(process.env.GEMINI_MAX_PARTS_BYTES || '800000', 10);
  if (Buffer.byteLength(JSON.stringify(parts), 'utf8') > MAX_PARTS_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const genConfig = {
    maxOutputTokens: generationConfig.maxOutputTokens ?? 2048,
    temperature: generationConfig.temperature ?? 0.7,
    topP: generationConfig.topP ?? 0.95
  };

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig })
    }
  );
  const data = await upstream.json();
  res.json(data);
});

// Gemma endpoint
app.post('/api/gemma', async (req, res) => {
  const { parts = [], model = 'gemma-3-27b-it', generationConfig = {} } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const MAX_PARTS_BYTES = parseInt(process.env.GEMINI_MAX_PARTS_BYTES || '800000', 10);
  if (Buffer.byteLength(JSON.stringify(parts), 'utf8') > MAX_PARTS_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const genConfig = {
    maxOutputTokens: generationConfig.maxOutputTokens ?? 2048,
    temperature: generationConfig.temperature ?? 0.7,
    topP: generationConfig.topP ?? 0.95
  };

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig })
    }
  );
  const data = await upstream.json();
  res.json(data);
});

const PORT = process?.env?.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
