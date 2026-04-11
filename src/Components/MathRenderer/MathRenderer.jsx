import React from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const MathRenderer = ({ text }) => {
  if (!text) return null;

  // Convert escaped \n to actual line breaks first (negative lookahead to preserve LaTeX like \neq, \nu, \newcommand)
  let processedText = text.replace(/\\n(?![a-zA-Z])/g, '\n');

  // Minimal text processing - only fix very specific problematic cases
  processedText = processedText
    // Only fix list items that are split
    .replace(/([^\n])\n([ \t]*-[ \t]*)/g, '$1 $2'); // Fix list items only

  // Custom function to process text with inline math
  const processInlineText = (text) => {
    // Split text by math expressions but keep them
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        // This is a math expression - use MathJax component
        const mathContent = part.slice(1, -1); // Remove the $ symbols
        return (
          <MathJax
            key={index}
            inline
            dynamic
            style={{
              display: 'inline',
              margin: '0 1px',
              fontSize: 'clamp(0.75rem, 1.8vw, 1rem)',
              maxWidth: '100%',
              overflow: 'auto',
              verticalAlign: 'middle'
            }}
          >
            {`$${mathContent}$`}
          </MathJax>
        );
      } else {
        // This is regular text - handle single newlines as line breaks
        const lines = part.split('\n');
        return lines.map((line, lineIndex) => (
          <React.Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </React.Fragment>
        ));
      }
    });
  };

  // Split by double line breaks to handle paragraphs
  const paragraphs = processedText.split('\n\n');

  return (
    <div style={{ lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%', overflowX: 'auto' }}>
      {paragraphs.map((paragraph, index) => {
        if (typeof paragraph !== 'string' || !paragraph.trim()) return null;
        const trimmedParagraph = paragraph.trim();

        // Header detection (H1, H2, H3)
        const headerMatch = trimmedParagraph.match(/^(#{1,3})\s+(.*)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const content = headerMatch[2];
          const HeaderTag = `h${level}`;
          const fontSize = level === 1 ? '1.5rem' : level === 2 ? '1.25rem' : '1.1rem';

          return (
            <HeaderTag key={index} style={{
              fontWeight: 'bold',
              fontSize,
              marginTop: '1rem',
              marginBottom: '0.5rem',
              color: 'inherit'
            }}>
              {processInlineText(content)}
            </HeaderTag>
          );
        }

        // Table detection: if paragraph contains at least two table rows (| ... | ... |)
        let isTable = false;
        if (typeof trimmedParagraph === 'string' && /\|(.+)\|/.test(trimmedParagraph)) {
          const tableRows = trimmedParagraph.split('\n').filter(l => /^\|(.+)\|$/.test(l));
          isTable = tableRows.length >= 2;
        }
        if (isTable) {
          return (
            <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <ReactMarkdown
                key={index}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  p: ({ children }) => <>{children}</>,
                  strong: ({ ...props }) => <strong className="font-bold text-primary" {...props} />,
                  em: ({ ...props }) => <em className="italic text-secondary" {...props} />,
                  code: ({ ...props }) => <code className="bg-base-200 px-1 rounded" {...props} />,
                  table: ({ children }) => (
                    <table className="min-w-full border border-base-300 rounded overflow-hidden my-3 text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'auto', minWidth: '100%' }}>
                      {children}
                    </table>
                  ),
                  thead: ({ children }) => <thead className="bg-base-200">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-base-300">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-2 font-bold bg-base-200 border border-base-300 text-base-content whitespace-nowrap">
                      {processInlineText(
                        React.Children.toArray(children)
                          .map(child => typeof child === 'string' ? child : (child.props?.children ?? ''))
                          .join('')
                      )}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 border border-base-300 text-base-content whitespace-nowrap">
                      {processInlineText(
                        React.Children.toArray(children)
                          .map(child => typeof child === 'string' ? child : (child.props?.children ?? ''))
                          .join('')
                      )}
                    </td>
                  ),
                }}
              >
                {trimmedParagraph}
              </ReactMarkdown>
            </div>
          );
        }

        // List detection
        const hasActualBullets = /^\s*[-•*]\s/.test(paragraph) || /\n\s*[-•*]\s/.test(paragraph);
        const isListParagraph = hasActualBullets;
        if (isListParagraph) {
          const parts = paragraph.split(/(?=\n\s*[-•*]\s)/);
          return (
            <div key={index} style={{ marginBottom: index < paragraphs.length - 1 ? '1rem' : '0', lineHeight: '1.8' }}>
              {parts.map((part, partIndex) => {
                const trimmedPart = part.trim();
                if (/^\s*[-•*]\s/.test(trimmedPart)) {
                  const cleanItem = trimmedPart.replace(/^\s*[-•*]\s*/, '').trim();
                  return (
                    <div key={partIndex} style={{ marginBottom: '0.3rem', paddingLeft: '1rem', lineHeight: '1.6' }}>
                      {processInlineText(cleanItem)}
                    </div>
                  );
                } else {
                  if (!trimmedPart) return null;
                  const isSubheading = trimmedPart.endsWith(':') && !trimmedPart.includes('\n');
                  if (isSubheading) {
                    return (
                      <div key={partIndex} style={{ marginBottom: '0.5rem', marginTop: partIndex > 0 ? '1rem' : '0', fontWeight: 'bold', color: 'inherit' }}>
                        {processInlineText(trimmedPart)}
                      </div>
                    );
                  } else {
                    return (
                      <p key={partIndex} style={{ marginBottom: '0.5rem', lineHeight: '1.8' }}>
                        {processInlineText(trimmedPart)}
                      </p>
                    );
                  }
                }
              })}
            </div>
          );
        }

        // Regular paragraph
        return (
          <div key={index} style={{ marginBottom: index < paragraphs.length - 1 ? '1rem' : '0', lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%', overflowX: 'auto' }}>
            {processInlineText(paragraph.trim())}
          </div>
        );
      }).filter(Boolean)}
    </div>
  );
};

export default MathRenderer;
