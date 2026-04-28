import { randomBytes } from 'crypto';

const SpoofHead = (extra = {}) => {
  const ip = [10, Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)].join(".");
  const genericHeaders = {
    "x-forwarded-for": ip,
    "x-real-ip": ip,
    "client-ip": ip,
    "x-client-ip": ip,
    "x-cluster-client-ip": ip,
    "x-original-forwarded-for": ip
  };
  return { ...genericHeaders, ...extra };
};

export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, method = 'POST', headers = {}, body } = await req.json();

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Build the forwarding headers with spoof IPs
    const forwardedHeaders = {
      ...SpoofHead(),
      'accept': '*/*',
      'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8,it-IT;q=0.7,it;q=0.6',
      'dnt': '1',
      'origin': new URL(url).origin,
      'priority': 'u=1, i',
      'referer': new URL(url).origin + '/',
      'sec-ch-ua': '"Microsoft Edge";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36 Edg/147.0.0.0',
      // Override with any custom headers passed in
      ...headers
    };

    const fetchOptions = {
      method,
      headers: forwardedHeaders,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseHeaders = {};
    
    response.headers.forEach((value, key) => {
      if (['content-type', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json') || contentType.includes('text/event-stream')) {
      data = await response.text();
    } else {
      data = await response.blob();
    }

    res.status(response.status).json({
      status: response.status,
      headers: responseHeaders,
      body: data,
      contentType
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}
