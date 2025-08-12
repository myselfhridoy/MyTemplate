/* eslint-env node */
/* global process */
// Netlify Function to proxy Gemini API
// Deploy: ensure directory structure netlify/functions/gemini.js
// Set GEMINI_API_KEY in Netlify site environment variables.

export async function handler(event) {
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: baseHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...baseHeaders, Allow: 'POST' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }) };
  }
  try {
    let parsed;
    try {
      parsed = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }
    const { parts = [], model = 'gemini-2.5-flash' } = parsed;
    if (!Array.isArray(parts) || parts.length === 0) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'parts array required' }) };
    }
    if (JSON.stringify(parts).length > 25000) {
      return { statusCode: 413, headers: baseHeaders, body: JSON.stringify({ error: 'Request too large' }) };
    }
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ contents: [{ parts }] })
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return { statusCode: upstream.status, headers: baseHeaders, body: JSON.stringify({ error: 'Gemini upstream error', details: text.slice(0, 500) }) };
    }
    // Aggregate fallback (no true streaming in standard Netlify functions)
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let aggregated = '';
    let total = 0;
    const limit = 120000;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        aggregated += chunk;
        total += chunk.length;
        if (total > limit) break;
      }
    }
    return { statusCode: 200, headers: { ...baseHeaders, 'Content-Type': 'text/event-stream' }, body: aggregated };
  } catch (err) {
    console.error('Netlify Gemini proxy error', err);
    return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: 'Gemini proxy failure', message: err.message }) };
  }
}

