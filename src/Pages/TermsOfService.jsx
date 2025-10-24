import React, { useEffect, useState } from 'react';

const simpleMarkdownToHtml = (md) => {
  if (!md) return '';
  const lines = md.split(/\r?\n/);
  const out = [];
  let inList = false;
  lines.forEach((ln) => {
    const line = ln.trim();
    if (!line) {
      if (inList) { out.push('</ul>'); inList = false; }
      return out.push('');
    }
    if (line.startsWith('### ')) return out.push('<h3>' + line.slice(4) + '</h3>');
    if (line.startsWith('## ')) return out.push('<h2>' + line.slice(3) + '</h2>');
    if (line.startsWith('# ')) return out.push('<h1>' + line.slice(2) + '</h1>');
    if (line.startsWith('- ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      return out.push('<li>' + line.slice(2) + '</li>');
    }
    if (/^---+$/.test(line)) return out.push('<hr/>');
    return out.push('<p>' + line + '</p>');
  });
  if (inList) out.push('</ul>');
  return out.join('\n');
};

export default function TermsOfService() {
  const [html, setHtml] = useState('');

  useEffect(() => {
    fetch('/terms-of-service.md')
      .then((r) => r.text())
      .then((text) => setHtml(simpleMarkdownToHtml(text)))
      .catch(() => setHtml('<p>শর্তাবলী লোড করা যায়নি। আপনি সরাসরি ফাইলটি দেখুন: <a href="/terms-of-service.md">terms-of-service.md</a></p>'));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-base-200 rounded shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
