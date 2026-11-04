const BASE = 'https://geminiai-render.onrender.com';

const fileToDataUri = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

const compressImage = async (file, maxDim = 1280, quality = 0.8) => {
  const dataUri = await fileToDataUri(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Unable to decode image file.'));
    element.src = dataUri;
  });
  let { width, height } = image;
  const scale = Math.min(1, maxDim / width, maxDim / height);
  if (scale < 1) {
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to process image.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
};

const parseSSE = async (response, extractor) => {
  if (!response.body) throw new Error('The AI response did not include a readable stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        output += extractor(JSON.parse(payload)) || '';
      } catch {
        // Ignore malformed individual SSE events; subsequent events may be valid.
      }
    }
  }

  return output;
};

const extractGemmaText = (data) =>
  (data?.candidates?.[0]?.content?.parts || [])
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join('');

const parseGemmaResponse = async (response) => {
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return extractGemmaText(await response.json());
  }
  return parseSSE(response, (data) => extractGemmaText(data));
};

const buildHmtRequest = async (url, prompt, imageFile) => {
  const formData = new FormData();
  formData.append('conversation_id', globalThis.crypto?.randomUUID?.() || String(Date.now()));
  formData.append('message_id', globalThis.crypto?.randomUUID?.() || String(Date.now()));
  formData.append('content', prompt);
  formData.append('model', 'gemini-2.5-flash');
  formData.append('max_mode', 'true');
  if (imageFile) formData.append('attachments', imageFile);
  return { url, options: { method: 'POST', body: formData } };
};

const parseHmtResponse = async (response) => {
  if (!response.body) throw new Error('The AI response did not include a readable stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        if (event.type === 'text_delta' && event.data) output += event.data;
      } catch {
        // Ignore malformed individual stream events.
      }
    }
  }
  return output;
};

export const AI_MODELS = {
  gemmy: {
    label: 'জেমি: দ্যা টিচার',
    icon: '🎓',
    color: '#5856d6',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const formData = new FormData();
      formData.append('text', prompt);
      if (imageFile) formData.append('image', imageFile);
      return { url: `${BASE}/api/gemmy/generate`, options: { method: 'POST', body: formData } };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },
  },

  merlin: {
    label: 'মিস মার্লিন: দ্যা টিউটর',
    icon: '🧙‍♀️',
    color: '#af52de',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const formData = new FormData();
      const request = {
        model: 'gemini-3.0-flash',
        messages: [
          { role: 'system', content: 'আপনি একজন দক্ষ বাংলা শিক্ষক। উত্তর বাংলায় দিন, গাণিতিক অংশ $...$ এ লিখুন।' },
          { role: 'user', content: prompt },
        ],
        stream: false,
      };
      formData.append('data', JSON.stringify(request));
      if (imageFile) formData.append('image', imageFile);
      return { url: `${BASE}/api/merlin/v1/chat/completions`, options: { method: 'POST', body: formData } };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || '';
    },
  },

  luzia: {
    label: 'Luzia: দ্যা প্রফেসর',
    icon: '👩‍🏫',
    color: '#ff2d55',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('personalityId', 'professor');
      if (imageFile) formData.append('images', imageFile);
      return { url: `${BASE}/api/luzia/ask`, options: { method: 'POST', body: formData } };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.content || '';
    },
  },

  assistant: {
    label: 'Knowledge Master',
    icon: '💡',
    color: '#ff9500',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const parts = [{ text: prompt }];
      if (imageFile) {
        const dataUri = await compressImage(imageFile);
        const [metadata, base64] = dataUri.split(',');
        const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
      return {
        url: `${BASE}/api/gemma`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ parts, model: 'gemini-3-flash-preview' }),
        },
      };
    },
    parse: parseGemmaResponse,
  },

  chatbot: {
    label: 'AI Chat Bot',
    icon: '🤖',
    color: '#34c759',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const formData = new FormData();
      formData.append('message', prompt);
      if (imageFile) formData.append('image', imageFile);
      return { url: `${BASE}/api/chat/send`, options: { method: 'POST', body: formData } };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.reply || '';
    },
  },

  hmtai: {
    label: 'HMT AI Assistant',
    icon: '🚀',
    color: '#007aff',
    supportsImage: true,
    buildRequest: (prompt, imageFile) =>
      buildHmtRequest(`${BASE}/api/ai-free-api`, prompt, imageFile),
    parse: parseHmtResponse,
  },

  unlimited: {
    label: 'Unlimited AI Q&A',
    icon: '♾️',
    color: '#34c759',
    supportsImage: true,
    buildRequest: (prompt, imageFile) =>
      buildHmtRequest(`${BASE}/api/proxy_aidocmaker`, prompt, imageFile),
    parse: parseHmtResponse,
  },

  puter: {
    label: 'HMT AI (Puter)',
    icon: '✨',
    color: '#007aff',
    supportsImage: true,
    complete: async (prompt, imageFile) => {
      const puter = globalThis.puter;
      if (!puter?.ai?.chat) throw new Error('Puter AI is not available. Please reload and try again.');
      const model = 'google/gemini-3-flash-preview';
      let response;
      if (imageFile) {
        const dataUri = await fileToDataUri(imageFile);
        response = await puter.ai.chat(prompt, dataUri.split(',')[1], { model });
      } else {
        try {
          response = await puter.ai.chat(prompt, { model });
        } catch {
          response = await puter.ai.chat(prompt, null, { model });
        }
      }
      if (typeof response === 'string') return response;
      if (response?.message?.content) return response.message.content;
      if (response?.text) return response.text;
      return JSON.stringify(response);
    },
  },

  easemate: {
    label: 'Problem Solver',
    icon: '🔧',
    color: '#ffcc00',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const imageUrl = imageFile ? await fileToDataUri(imageFile) : null;
      return {
        url: `${BASE}/api/easemate`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'chat', prompt, imageUrl }),
        },
      };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.answer || '';
    },
  },

  borno: {
    label: 'Academic Assistant',
    icon: '📚',
    color: '#5ac8fa',
    supportsImage: true,
    requiresContext: true,
    buildRequest: async (prompt, imageFile, context = {}) => {
      const formData = new FormData();
      formData.append('userText', prompt);
      formData.append('gradeValue', context.className || 'একাদশ-শ্রেণী');
      formData.append('subject', context.subjectName || 'পদার্থবিজ্ঞান');
      if (imageFile) formData.append('image', imageFile);
      return { url: `${BASE}/api/bornoai/chat`, options: { method: 'POST', body: formData } };
    },
    parse: async (response) => {
      if (!response.body) throw new Error('The AI response did not include a readable stream.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload);
            if (event.type === 'content' && event.delta) output += event.delta;
            else if (event.type === 'done' && event.content && !output) output = event.content;
          } catch {
            // Ignore malformed individual stream events.
          }
        }
      }
      return output;
    },
  },

  doubt: {
    label: 'Concept Builder',
    icon: '🧠',
    color: '#af52de',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const parts = [{ text: prompt }];
      if (imageFile) {
        const dataUri = await compressImage(imageFile);
        const [metadata, base64] = dataUri.split(',');
        const mimeType = metadata.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
      return {
        url: `${BASE}/api/gemma`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ parts, model: 'gemma-4-31b-it' }),
        },
      };
    },
    parse: parseGemmaResponse,
  },

  mathgpt: {
    label: 'ম্যাভিস: দ্যা ম্যাথ এক্সপার্ট',
    icon: '📐',
    color: '#ff3b30',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const content = [];
      if (imageFile) content.push({ type: 'image_url', image_url: { url: await fileToDataUri(imageFile) } });
      content.push({ type: 'text', text: prompt || 'ছবিটি লক্ষ্য করো এবং প্রশ্নগুলোর উত্তর দাও' });
      const authorization = import.meta.env.VITE_MATHGPT_AUTHORIZATION;
      return {
        url: 'https://geminiai-xi.vercel.app/api/mathgpt/v1',
        options: {
          method: 'POST',
          headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            'content-type': 'application/json',
            'x-topic': 'math',
          },
          body: JSON.stringify({ messages: [{ role: 'user', content }], reasoningEnabled: false }),
        },
      };
    },
    parse: async (response) => {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || '';
      }
      return parseSSE(response, (data) =>
        data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.message?.content || ''
      );
    },
  },

  'mathgpt-v2': {
    label: 'মাষ্টার মশাই: দ্য স্যাভিয়র',
    icon: '🧮',
    color: '#ff9500',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const body = { text: prompt };
      if (imageFile) {
        const dataUri = await compressImage(imageFile);
        body.image = dataUri.split(',')[1];
        body.fileName = imageFile.name;
      }
      return {
        url: `${BASE}/api/mathgpt/v2`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      };
    },
    parse: async (response) => {
      const contentType = response.headers.get('Content-Type') || '';
      const raw = contentType.includes('application/json') ? await response.json() : await response.text();
      if (typeof raw === 'string') return raw;
      return raw?.data || raw?.result || raw?.reply || raw?.message?.content || raw?.message || '';
    },
  },

  notegpt: {
    label: 'H.M. Tutoring AI',
    icon: '📝',
    color: '#5856d6',
    supportsImage: true,
    buildRequest: async (prompt, imageFile) => {
      const body = {
        userMessage: prompt,
        lang: 'bn',
        model: 'gemini-3-flash-preview',
        tone: 'default',
        length: 'moderate',
      };
      if (imageFile) {
        const dataUri = await compressImage(imageFile);
        body.imageBase64 = dataUri.split(',')[1];
      }
      return {
        url: `${BASE}/api/notegpt/v1`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      };
    },
    parse: async (response) => {
      const data = await response.json();
      return data?.reply || data?.message || '';
    },
  },
};

export function buildPrompt(questionType, question, context = '') {
  const base = `${context ? `${context}\n\n` : ''}আপনি H.M. Tutoring AI Assistant। সব উত্তর বাংলায়, গাণিতিক অংশ $...$ এর ভিতরে। বাংলা টেক্সট কখনো $...$ এর ভিতরে নয়। কোনো সম্ভাষণ নয়, সরাসরি উত্তর দাও।`;
  const prompts = {
    'জ্ঞানমূলক': `\n\nসংক্ষিপ্ত উত্তর (১-২ লাইন)।\n\nপ্রশ্ন: ${question}`,
    'অনুধাবন': `\n\n**সংজ্ঞা:** (১-২ লাইন)\n\n**ব্যাখ্যা:** (৩-৫ বাক্য)\n\nপ্রশ্ন: ${question}`,
    'বহুনির্বাচনী': `\n\n**সঠিক উত্তর:** ...\n\n**সমাধান:** ...\n\nপ্রশ্ন: ${question}`,
    'গাণিতিক প্রশ্ন': `\n\n**প্রদত্ত তথ্য:** ...\n\n**সূত্র:** ...\n\n**সমাধান:** ...\n\n**উত্তর:** ...\n\nপ্রশ্ন: ${question}`,
    'সৃজনশীল': `\n\nক অংশ: ...\nখ অংশ: ...\nগ অংশ: ...\nঘ অংশ: ...\n\nপ্রশ্ন: ${question}`,
  };
  return base + (prompts[questionType] || `\n\nপ্রশ্ন: ${question}`);
}
