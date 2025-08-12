/* eslint-env node */
/* global process */
// Vercel serverless function to proxy Gemini API without exposing the key
// Place in /api to deploy on Vercel. Expects env var GEMINI_API_KEY configured in project settings.

export const config = { runtime: 'nodejs18.x' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  try {
    const { parts = [], model = 'gemini-2.5-flash' } = req.body || {};
    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'parts array required' });
    }
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ contents: [{ parts }] })
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({ error: 'Gemini upstream error', details: text.slice(0, 1000) });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) res.write(decoder.decode(chunk.value, { stream: !done }));
    }
    res.end();
  } catch (err) {
    console.error('Gemini proxy error', err);
    res.status(500).json({ error: 'Gemini proxy failure' });
  }
}
