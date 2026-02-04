export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const token = Netlify.env.get('GITHUB_TOKEN');
  
  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (!path) {
    return new Response(JSON.stringify({ error: 'path parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiUrl = `https://api.github.com/repos/myselfhridoy/NCTB-Board-CQ/contents/${path}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'MyTemplate-App'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: `GitHub API error: ${error}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const jsonContent = JSON.parse(content);
    
    return new Response(JSON.stringify(jsonContent), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/github-proxy"
};
