import React from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

const hasBengali = (str) => /[\u0980-\u09FF]/.test(str || '');

// Extract \text{...} chunks and return cleaned math + collected texts
const extractTextCommands = (math) => {
  const texts = [];
  const cleaned = math.replace(/\\text\{([^}]*)\}/g, (_, p1) => {
    if (p1) texts.push(p1.trim());
    return '';
  });
  return { cleaned, texts };
};

const MathRenderer = ({ text }) => {
  if (!text) return null;
  
  // Convert \n to actual line breaks first
  let processedText = text.replace(/\\n/g, '\n');
  
  // Minimal text processing - only fix very specific problematic cases
  processedText = processedText
    // Only fix list items that are split
    .replace(/([^\n])\n([ \t]*-[ \t]*)/g, '$1 $2'); // Fix list items only
  
  // Render inline math ($...$) inside a string segment
  const processInlineText = (segment) => {
    const parts = segment.split(/(\$[^$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        let mathContent = part.slice(1, -1).trim();
        // Pull out \text{...} Bengali to outside
        const { cleaned, texts } = extractTextCommands(mathContent);
        mathContent = cleaned.trim();

        // If Bengali remains anywhere in math (bad), fallback to plain text
        if (!mathContent || hasBengali(mathContent)) {
          return (
            <React.Fragment key={index}>
              {mathContent}
              {texts.length > 0 && <> {texts.join(' ')} </>}
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={index}>
            <MathJax inline dynamic style={{ display: 'inline', margin: '0 1px', fontSize: 'clamp(0.8rem, 2vw, 1rem)', maxWidth: '100%' }}>
              {`$${mathContent}$`}
            </MathJax>
            {texts.length > 0 && <span> {texts.join(' ')}</span>}
          </React.Fragment>
        );
      } else {
        // Regular text - preserve single newlines
        const lines = part.split('\n');
        return lines.map((line, lineIndex) => (
          <React.Fragment key={`${index}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {line}
          </React.Fragment>
        ));
      }
    });
  };

  // Render text with display math ($$...$$) blocks, then inline within non-math sections
  const renderWithBlockMath = (text) => {
    const parts = text.split(/(\$\$[\s\S]+?\$\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        let mathContent = part.slice(2, -2).trim();

        // Extract \text{...} (often Bengali) and move outside
        const { cleaned, texts } = extractTextCommands(mathContent);
        mathContent = cleaned.trim();

        // If math still contains Bengali or is empty, fallback to readable plain text
        if (!mathContent || hasBengali(mathContent)) {
          return (
            <div key={i} style={{ margin: '0.5rem 0' }}>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, overflow: 'visible' }}>{(part.slice(2, -2) || '').trim()}</pre>
            </div>
          );
        }

        return (
          <div key={i} style={{ margin: '0.5rem 0' }}>
            <MathJax dynamic>{`$$${mathContent}$$`}</MathJax>
            {texts.length > 0 && (
              <div style={{ marginTop: '0.25rem', opacity: 0.85 }}>
                {texts.join(' ')}
              </div>
            )}
          </div>
        );
      }
      // Non-block segment -> process inline math
      return <React.Fragment key={i}>{processInlineText(part)}</React.Fragment>;
    });
  };

  // Split by double line breaks to handle paragraphs
  const paragraphs = processedText.split('\n\n');
  
  return (
    <div style={{ lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
      {paragraphs.map((paragraph, index) => {
        if (typeof paragraph !== 'string' || !paragraph.trim()) return null;
        const trimmedParagraph = paragraph.trim();

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
                    {renderWithBlockMath(
                      React.Children.toArray(children)
                        .map(child => typeof child === 'string' ? child : (child.props?.children ?? ''))
                        .join('')
                    )}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 border border-base-300 text-base-content whitespace-nowrap">
                    {renderWithBlockMath(
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

        // Bengali heading detection
        if (/^\*\*[^*]+\*\*/.test(trimmedParagraph)) {
          const headingMatch = trimmedParagraph.match(/^(\*\*[^*]+\*\*[:.।]?)\s*(.*)$/s);
          if (headingMatch) {
            const headingPart = headingMatch[1];
            const contentPart = headingMatch[2].trim();
            const isStandaloneHeading = !contentPart || contentPart === '';
            let headingContent;
            if (headingPart.includes('**:')) {
              const match = headingPart.match(/^\*\*([^*]+)\*\*:/);
              headingContent = match ? match[1] + ':' : headingPart;
            } else if (headingPart.includes('**.')) {
              const match = headingPart.match(/^\*\*([^*]+)\*\*\./);
              headingContent = match ? match[1] + '.' : headingPart;
            } else if (headingPart.includes('**।')) {
              const match = headingPart.match(/^\*\*([^*]+)\*\*।/);
              headingContent = match ? match[1] + '।' : headingPart;
            } else {
              const match = headingPart.match(/^\*\*([^*]+)\*\*/);
              headingContent = match ? match[1] : headingPart;
            }
            const headingParts = headingContent.split(/(\$[^$]+\$)/g);
            const renderedHeading = headingParts.map((part, partIdx) => {
              if (part.startsWith('$') && part.endsWith('$')) {
                let mathContent = part.slice(1, -1).trim();
                const { cleaned, texts } = extractTextCommands(mathContent);
                mathContent = cleaned.trim();
                if (!mathContent || hasBengali(mathContent)) return <span key={partIdx}>{[mathContent, ...texts].join(' ').trim()}</span>;
                return (
                  <React.Fragment key={partIdx}>
                    <MathJax inline dynamic style={{ display: 'inline', margin: '0 1px', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', maxWidth: '100%' }}>
                      {`$${mathContent}$`}
                    </MathJax>
                    {texts.length > 0 && <span> {texts.join(' ')}</span>}
                  </React.Fragment>
                );
              }
              return <span key={partIdx}>{part}</span>;
            });
            const headingElement = (
              <h3 key={`heading-${index}`} style={{ 
                fontWeight: 'bold', 
                color: '#3b82f6',
                fontSize: 'clamp(1rem, 3vw, 1.1em)',
                marginBottom: '0.5rem',
                marginTop: index > 0 ? '1.5rem' : '0',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {renderedHeading}
              </h3>
            );
            if (isStandaloneHeading) {
              return headingElement;
            }
            return (
              <div key={index}>
                {headingElement}
                <p style={{ marginBottom: index < paragraphs.length - 1 ? '1rem' : '0', lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  {renderWithBlockMath(contentPart.trim())}
                </p>
              </div>
            );
          }
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
                      {renderWithBlockMath(cleanItem)}
                    </div>
                  );
                } else {
                  if (!trimmedPart) return null;
                  const isSubheading = trimmedPart.endsWith(':') && !trimmedPart.includes('\n');
                  if (isSubheading) {
                    return (
                      <div key={partIndex} style={{ marginBottom: '0.5rem', marginTop: partIndex > 0 ? '1rem' : '0', fontWeight: 'bold', color: 'inherit' }}>
                        {renderWithBlockMath(trimmedPart)}
                      </div>
                    );
                  } else {
                    return (
                      <p key={partIndex} style={{ marginBottom: '0.5rem', lineHeight: '1.8' }}>
                        {renderWithBlockMath(trimmedPart)}
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
          <div key={index} style={{ marginBottom: index < paragraphs.length - 1 ? '1rem' : '0', lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {renderWithBlockMath(paragraph.trim())}
          </div>
        );
      }).filter(Boolean)}
    </div>
  );
};

// MathJax Context wrapper component
const MathRendererWithContext = ({ text }) => {
  return (
    <MathJaxContext config={{
      loader: { load: ["input/tex", "output/chtml"] },
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        packages: { '[+]': ['ams'] }
      },
      chtml: {
        displayAlign: 'left',
        displayIndent: '0em',
        scale: 1.1,
        linebreaks: { automatic: true, width: 'container' }
      },
      options: {
        renderActions: { addMenu: [], checkLoading: [], addEvents: [] },
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      }
    }}>
      <MathRenderer text={text} />
    </MathJaxContext>
  );
};

export default MathRendererWithContext;
