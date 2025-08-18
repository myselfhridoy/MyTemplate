/* eslint-env node */
/* global process, Buffer */
// Netlify Function to proxy Gemini/Gemma API
// Deploy: ensure directory structure netlify/functions/gemma.js
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
    return {
      statusCode: 405,
      headers: { ...baseHeaders, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' })
    };
  }

  try {
    let parsed;
    try {
      parsed = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { parts = [], model = 'gemma-3-27b-it' } = parsed;
    if (!Array.isArray(parts) || parts.length === 0) {
      return {
        statusCode: 400,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'parts array required' })
      };
    }

    // Size limit check
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

    // Streaming SSE response for Gemma 3
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return {
        statusCode: upstream.status,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'Gemini upstream error', details: text.slice(0, 500) })
      };
    }

    // Netlify streaming API: aggregate SSE chunks to at least 5 words per chunk
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBody = '';
    let buffer = '';
    let chunk = '';
    let chunkWords = 0;
    const MIN_WORDS = 5;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Split into SSE events
      const events = buffer.split(/(?<=\n)\s*(?=data: )/);
      buffer = '';
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event.trim()) continue;
        // Extract text from JSON
        const match = event.match(/data: (.*)/);
        if (match) {
          try {
            const obj = JSON.parse(match[1]);
            const text = obj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            chunk += text;
            chunkWords += (text.match(/\S+/g) || []).length;
          } catch { /* ignore parse errors */ }
        }
        // If chunk has enough words, send SSE event
        if (chunkWords >= MIN_WORDS) {
          sseBody += `data: ${JSON.stringify({ text: chunk })}\n\n`;
          chunk = '';
          chunkWords = 0;
        }
      }
    }
    // Send any remaining chunk
    if (chunkWords > 0 && chunk.trim()) {
      sseBody += `data: ${JSON.stringify({ text: chunk })}\n\n`;
    }
    return {
      statusCode: 200,
      headers: { ...baseHeaders, 'Content-Type': 'text/event-stream' },
      body: sseBody,
      isBase64Encoded: false
    };

  } catch (err) {
    console.error('Netlify Gemini proxy error', err);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'Gemini proxy failure', message: err.message })
    };
  }
}
