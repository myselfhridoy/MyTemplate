export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const token = Netlify.env.get('GITHUB_TOKEN');
  
  if (!token) {
    return new Response('GITHUB_TOKEN not configured', { status: 500 });
  }
  
  if (!path) {
    return new Response('path parameter required', { status: 400 });
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
      return new Response('Image not found', { status: response.status });
    }

    const data = await response.json();
    // Decode base64 content for images
    const imageBuffer = Buffer.from(data.content, 'base64');
    
    // Set appropriate content type based on file extension
    const ext = path.toLowerCase().split('.').pop();
    const contentTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp'
    };
    
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[ext] || 'image/png',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    return new Response('Error fetching image', { status: 500 });
  }
};

export const config = {
  path: "/api/github-image"
};
