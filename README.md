# Overview

React + Vite application with AI Assistant page. Gemini API key is protected using a serverless proxy so it is never shipped to the browser.

## Protecting the Gemini API Key

Never expose a Gemini (or any model) API key in client code. The frontend calls an internal endpoint which forwards the request to Gemini.

### Environment Variable

Create environment variable:

```
GEMINI_API_KEY=your_real_key
```

Add it in hosting provider dashboard (do not commit a real .env file).

### Vercel

1. File `api/gemini.js` acts as serverless function.
2. Add `GEMINI_API_KEY` in Project Settings -> Environment Variables.
3. Deploy. Frontend calls `/api/gemini`.

### Netlify

1. Function at `netlify/functions/gemini.js`.
2. Add `GEMINI_API_KEY` in Site Settings -> Environment Variables.
3. (Optional) Add redirect in `public/_redirects`:
```
/api/gemini /.netlify/functions/gemini 200
```
4. Builds: `npm run build` publish `dist`.

### Render (separate service)

Static site + separate Node service (example `server.js`):
```
import express from 'express';
import fetch from 'node-fetch';
const app = express();
app.use(express.json({ limit: '2mb' }));
app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing key' });
  const { parts = [], model = 'gemini-2.5-flash' } = req.body;
  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify({ contents: [{ parts }] })
  });
  res.setHeader('Content-Type', 'text/event-stream');
  if (!upstream.body) return res.status(500).end();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  while (true) { const { value, done } = await reader.read(); if (done) break; res.write(decoder.decode(value)); }
  res.end();
});
app.listen(3000);
```
Deploy that as a Web Service; configure static frontend to call it.

### Local Dev

Preferred (Netlify functions + frontend together):
```
npm install
npm run dev:netlify
```
This serves frontend and functions; `/api/gemini` works.

Alternative plain Vite (no functions):
```
npm run dev
```
Then separately run your own local serverless/express proxy on port 8888 (Vite proxy maps /api/gemini -> http://localhost:8888).

Use Vercel CLI (`vercel dev`) if deploying on Vercel.

### Frontend Contract

Request: `POST /api/gemini` JSON body:
```
{ parts: [...], model: 'gemini-2.5-flash' }
```
Response: SSE stream identical to Gemini (data: {json}).

## Security Notes

- Key never appears in build output.
- Consider rate limiting & size limits.
- Optional: require custom header (e.g., x-api-token) and validate.

## Hardening Ideas

- Rate limit (Upstash / in-memory counter)
- Basic auth or signed session tokens
- Logging minimal usage metrics for monitoring
- Reject very large images or text blocks

## License

Internal project template.
