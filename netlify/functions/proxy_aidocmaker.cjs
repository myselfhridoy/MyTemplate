const fetch = require('node-fetch');

// Server-side proxy for Aidocmaker/Borno-like API.
// Reads token from server env: AIDOCMAKER_TOKEN_URL or LATEST_TOKEN_URL (preferred server-only env).
// Forwards the incoming request (including body) to TARGET_API with Authorization header.
// Returns response to client. Does NOT expose token or token URL in any response or logs.

const TARGET_API = process.env.AIDOCMAKER_API_URL || 'https://level2labs-prod--adm-agent-send-chat-message.modal.run/';

exports.handler = async function (event, context) {
  const TOKEN_SOURCE = process.env.AIDOCMAKER_TOKEN_URL || process.env.LATEST_TOKEN_URL;

  if (!TOKEN_SOURCE) {
    return {
      statusCode: 500,
      body: 'Server misconfiguration: token source not set.'
    };
  }

  try {
    // Fetch token server-side
    const tRes = await fetch(TOKEN_SOURCE);
    if (!tRes.ok) throw new Error('Failed to fetch token from token source');
    const tokenText = (await tRes.text()).trim();

    // Build headers to forward. Preserve content-type/accept if provided by client.
    const forwardHeaders = {};
    if (event.headers) {
      const ct = event.headers['content-type'] || event.headers['Content-Type'];
      const ac = event.headers['accept'] || event.headers['Accept'];
      if (ct) forwardHeaders['content-type'] = ct;
      if (ac) forwardHeaders['accept'] = ac;
    }

    // Add authorization and polite origin/referer to mimic expected client
    forwardHeaders['authorization'] = `Bearer ${tokenText}`;
    forwardHeaders['origin'] = 'https://www.aidocmaker.com';
    forwardHeaders['referer'] = 'https://www.aidocmaker.com/';

    // event.body may be base64 encoded for binary requests
    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body;

    const resp = await fetch(TARGET_API, {
      method: event.httpMethod || 'POST',
      headers: forwardHeaders,
      body: body
    });

    // Prepare response back to client. If response is textual, return as text; otherwise return base64.
    const contentType = resp.headers.get('content-type') || '';
    const isText = contentType.startsWith('text/') || contentType.includes('json') || contentType.includes('event-stream') || contentType.includes('application/javascript') || contentType.includes('application/json');

    if (isText) {
      const text = await resp.text();
      return {
        statusCode: resp.status,
        headers: {
          'Content-Type': contentType || 'text/plain',
          'Access-Control-Allow-Origin': '*'
        },
        body: text
      };
    } else {
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return {
        statusCode: resp.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        },
        isBase64Encoded: true,
        body: buffer.toString('base64')
      };
    }

  } catch (err) {
    return {
      statusCode: 502,
      body: `Proxy error: ${err.message}`
    };
  }
};
