// serverless function for Netlify to proxy Cloudflare AI API requests
import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const apiUrl = 'https://api.cloudflare.com/client/v4/accounts/9c3c8818b68b330e43454a4e3401c63f/ai/run/@cf/google/gemma-3-12b-it';
  const apiKey = '4AnWo_Yz7hpPKcrAJ5vqp0daTg64bGmP75MQxKhl';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: event.body,
    });

    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Netlify Functions require returning the full body, so we must buffer the stream
      let body = '';
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) body += decoder.decode(value);
        }
      }
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body,
        isBase64Encoded: false
      };
    } else {
      const data = await response.text();
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: data,
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
