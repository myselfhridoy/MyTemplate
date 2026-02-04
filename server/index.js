import express from 'express';
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import process from 'process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Gemini endpoint
app.post('/api/gemini', async (req, res) => {
  const { parts = [], model = 'gemini-2.5-flash', generationConfig = {} } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const MAX_PARTS_BYTES = parseInt(process.env.GEMINI_MAX_PARTS_BYTES || '800000', 10);
  if (Buffer.byteLength(JSON.stringify(parts), 'utf8') > MAX_PARTS_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const genConfig = {
    maxOutputTokens: generationConfig.maxOutputTokens ?? 2048,
    temperature: generationConfig.temperature ?? 0.7,
    topP: generationConfig.topP ?? 0.95
  };

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig })
    }
  );
  const data = await upstream.json();
  res.json(data);
});

// Gemma endpoint
app.post('/api/gemma', async (req, res) => {
  const { parts = [], model = 'gemma-3-27b-it', generationConfig = {} } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const MAX_PARTS_BYTES = parseInt(process.env.GEMINI_MAX_PARTS_BYTES || '800000', 10);
  if (Buffer.byteLength(JSON.stringify(parts), 'utf8') > MAX_PARTS_BYTES) {
    return res.status(413).json({ error: 'Request too large' });
  }

  const genConfig = {
    maxOutputTokens: generationConfig.maxOutputTokens ?? 2048,
    temperature: generationConfig.temperature ?? 0.7,
    topP: generationConfig.topP ?? 0.95
  };

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: genConfig })
    }
  );
  const data = await upstream.json();
  res.json(data);
});

// GitHub proxy endpoint for private repo
app.get('/api/github-proxy', async (req, res) => {
  const { path } = req.query;
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }
  
  if (!path) {
    return res.status(400).json({ error: 'path parameter required' });
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
      return res.status(response.status).json({ error: `GitHub API error: ${error}` });
    }

    const data = await response.json();
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const jsonContent = JSON.parse(content);
    
    res.json(jsonContent);
  } catch (error) {
    console.error('GitHub proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub image proxy endpoint
app.get('/api/github-image', async (req, res) => {
  const { path } = req.query;
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return res.status(500).send('GITHUB_TOKEN not configured');
  }
  
  if (!path) {
    return res.status(400).send('path parameter required');
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
      return res.status(response.status).send('Image not found');
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
    
    res.setHeader('Content-Type', contentTypes[ext] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(imageBuffer);
  } catch (error) {
    console.error('GitHub image proxy error:', error);
    res.status(500).send('Error fetching image');
  }
});

const PORT = process?.env?.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
