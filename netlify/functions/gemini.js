/* eslint-env node */
/* global process, Buffer */
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
  const { parts = [], model = 'gemma-3-12b-it', generationConfig = {} } = parsed;
    if (!Array.isArray(parts) || parts.length === 0) {
      return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: 'parts array required' }) };
    }
    // Dynamically size‑limit request (default 800kB JSON for parts). Allows reasonable inlineData image.
    try {
      const serialized = JSON.stringify(parts);
      const partsSize = Buffer.byteLength(serialized, 'utf8');
      const MAX_PARTS_BYTES = parseInt(process.env.GEMINI_MAX_PARTS_BYTES || '800000', 10); // ~0.8MB
      if (partsSize > MAX_PARTS_BYTES) {
        return { 
          statusCode: 413, 
            headers: baseHeaders, 
            body: JSON.stringify({ 
              error: 'Request too large', 
              sizeBytes: partsSize, 
              limitBytes: MAX_PARTS_BYTES, 
              hint: 'Resize/compress image or increase GEMINI_MAX_PARTS_BYTES (Netlify env var).' 
            }) 
        };
      }
    } catch { /* ignore size calc errors */ }
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          maxOutputTokens: generationConfig.maxOutputTokens ?? 2048,
          temperature: generationConfig.temperature ?? 0.7,
          topP: generationConfig.topP ?? 0.95
        }
      })
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

