import React from 'react';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';

// Article approach: Using react-markdown with remark-math and custom renderers
const renderWithKatex = (text) => {
  if (!text) return null;
  
  // Clean up text and fix line breaks
  let processedText = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  processedText = processedText.replace(/\r\n/g, '\n'); // Normalize line endings
  processedText = processedText.replace(/\r/g, '\n'); // Handle old Mac line endings
  
  // Fix inline bracket notations that are incorrectly wrapped with $$
  processedText = processedText.replace(/\$\$\[\s*\]\$\$/g, '[  ]');
  processedText = processedText.replace(/\$\$\(\s*\)\$\$/g, '(  )');
  processedText = processedText.replace(/\$\$\|\|\s*\|\|\$\$/g, '||  ||');
  
  // Fix inline math that should not be display math (like 3 x 3)
  processedText = processedText.replace(/\$\$(\d+\s*\\times\s*\d+)\$\$/g, '$$$1$$'); 
  
  // Pre-process matrix environments to ensure proper formatting
  processedText = processedText.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (match, content) => {
    let cleanContent = content.trim().replace(/\s\\\s/g, ' \\\\ ');
    return `\\begin{bmatrix}${cleanContent}\\end{bmatrix}`;
  });
  
  processedText = processedText.replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, (match, content) => {
    let cleanContent = content.trim().replace(/\s\\\s/g, ' \\\\ ');
    return `\\begin{vmatrix}${cleanContent}\\end{vmatrix}`;
  });

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
      rehypePlugins={[rehypeKatex]}
      components={{
        strong: ({node, ...props}) => (
          <span style={{color: '#3498db', fontWeight: 'bold'}} {...props} />
        )
      }}
    >
      {processedText}
    </ReactMarkdown>
  );
};

// CSS for better matrix rendering and line spacing
const matrixCSS = `
  .katex .arraycolsep {
    width: 0.5em !important;
  }
  .katex .mtable {
    display: inline-table !important;
    vertical-align: middle !important;
  }
  .katex .mtable .col-align-c {
    display: table-cell !important;
    text-align: center !important;
    padding: 0.1em 0.3em !important;
  }
  /* Better line spacing for rendered content */
  .markdown-content {
    line-height: 1.6 !important;
  }
  .markdown-content p {
    margin-bottom: 1em !important;
  }
  .markdown-content h1, .markdown-content h2, .markdown-content h3 {
    margin-top: 1.5em !important;
    margin-bottom: 0.8em !important;
  }
  .markdown-content ul, .markdown-content ol {
    margin-bottom: 1em !important;
    padding-left: 2em !important;
  }
  .markdown-content li {
    margin-bottom: 0.3em !important;
  }
  .markdown-content br {
    margin-bottom: 0.5em !important;
  }
`;

const KatexRenderer = ({ text }) => (
  <div className="markdown-content" style={{ maxWidth: '100%', overflowX: 'auto', overflowWrap: 'anywhere', wordBreak: 'break-word', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
    <style dangerouslySetInnerHTML={{ __html: matrixCSS }} />
    {renderWithKatex(text)}
  </div>
);

export default KatexRenderer;