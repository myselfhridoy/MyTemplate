// Simple local dev proxy (Node >=18) if you are not using netlify dev
// Run: npm run dev:proxy (port 8888) then in another terminal `npm run dev` (Vite proxy maps /api/gemini)
/* eslint-env node */
/* global process, Buffer */
import http from 'http';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (avoid adding dependency). Reads root .env if present.
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!(key in process.env)) {
        const val = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('[devProxy] Failed loading .env:', e.message);
}

const PORT = 8888;
const MODEL = 'gemma-3-27b-it';
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('[devProxy] GEMINI_API_KEY missing. Set it before running.');
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }
  if (req.url === '/api/gemma' && req.method === 'POST') {
    if (!API_KEY) return json(res, 500, { error: 'GEMMA_API_KEY not set' });
    let body = '';
    const MAX_BODY = parseInt(process.env.DEV_PROXY_MAX_BODY || '3000000', 10); // ~3MB default
    req.on('data', c => { 
      body += c; 
      if (body.length > MAX_BODY) { 
        console.warn('[devProxy] Body exceeded limit', body.length, '>', MAX_BODY); 
        req.destroy(); 
      } 
    });
    req.on('end', async () => {
      if (!body) return json(res, 413, { error: 'Empty or too large request (truncated)' });
      let parsed; try { parsed = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      const { parts = [], model = MODEL } = parsed;
      if (!Array.isArray(parts) || !parts.length) return json(res, 400, { error: 'parts array required' });
      // Basic size diagnostics
      try {
        const sizeBytes = Buffer.byteLength(JSON.stringify(parts), 'utf8');
        if (sizeBytes > MAX_BODY) return json(res, 413, { error: 'Parts exceed dev limit', sizeBytes, limit: MAX_BODY });
  } catch { /* ignore size calc errors */ }
      try {
        const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${API_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({ contents: [{ parts }] })
        });
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(()=> '');
          return json(res, upstream.status, { error: 'Gemini upstream error', details: t.slice(0,500) });
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        while (true) { const { value, done } = await reader.read(); if (done) break; if (value) res.write(decoder.decode(value)); }
        res.end();
      } catch (e) { console.error('[devProxy] Error', e); json(res, 500, { error: 'Proxy failure', message: e.message }); }
    });
    return;
  }
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`[devProxy] Listening on http://localhost:${PORT}`));
