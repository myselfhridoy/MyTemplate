// Simple local dev proxy for Cloudflare Gemma (Node >=18)
// Run: node server/gemmaProxy.js
import http from 'http';

const PORT = 5001;
const API_KEY = '4AnWo_Yz7hpPKcrAJ5vqp0daTg64bGmP75MQxKhl';
const GEMMA_URL = 'https://api.cloudflare.com/client/v4/accounts/9c3c8818b68b330e43454a4e3401c63f/ai/run/@cf/google/gemma-3-12b-it';

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
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      if (!body) return json(res, 400, { error: 'Empty request body' });
      try {
        const upstream = await fetch(GEMMA_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: body
        });
        if (upstream.headers.get('content-type')?.includes('text/event-stream')) {
          res.writeHead(upstream.status, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
          if (upstream.body) {
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            while (!done) {
              const { value, done: streamDone } = await reader.read();
              done = streamDone;
              if (value) res.write(decoder.decode(value));
            }
          }
          res.end();
        } else {
          const text = await upstream.text();
          res.writeHead(upstream.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(text);
        }
      } catch (e) {
        json(res, 500, { error: 'Proxy failure', message: e.message });
      }
    });
    return;
  }
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`[gemmaProxy] Listening on http://localhost:${PORT}/api/gemma`));
