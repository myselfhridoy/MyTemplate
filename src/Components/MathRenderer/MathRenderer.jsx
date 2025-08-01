import React from 'react';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import ReactMarkdown from 'react-markdown';

const MathRenderer = ({ text }) => {
  if (!text) return null;
  
  // Convert \n to actual line breaks first
  let processedText = text.replace(/\\n/g, '\n');
  
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
              fontSize: 'clamp(0.8rem, 2vw, 1rem)',
              maxWidth: '100%',
              overflowX: 'auto'
            }}
          >
            {`$${mathContent}$`}
          </MathJax>
        );
      } else {
        // This is regular text - handle single newlines as line breaks
        const textWithBreaks = part.split('\n').map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 && <br />}
            <ReactMarkdown
              components={{
                p: ({ children }) => <>{children}</>,
                strong: ({ ...props }) => <strong className="font-bold text-primary" {...props} />,
                em: ({ ...props }) => <em className="italic text-secondary" {...props} />,
                code: ({ ...props }) => <code className="bg-base-200 px-1 rounded" {...props} />,
              }}
            >
              {line}
            </ReactMarkdown>
          </span>
        ));
        
        return textWithBreaks;
      }
    });
  };

  // Split by double line breaks to handle paragraphs
  const paragraphs = processedText.split('\n\n');
  
  return (
    <div style={{ lineHeight: '1.8', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
      {paragraphs.map((paragraph, index) => {
        if (!paragraph.trim()) return null;
        
        const trimmedParagraph = paragraph.trim();
        
        // Check if paragraph contains a heading anywhere (not just at the start)
        const headingRegex = /\*\*([^*]+)\*\*([:.।]?)/g;
        const creativeQuestionRegex = /^([ক-ঘ]\.?\s+.+?)(?:\n|$)/m;
        const hasHeading = headingRegex.test(trimmedParagraph) || creativeQuestionRegex.test(trimmedParagraph);
        
        if (hasHeading) {
          // Split the paragraph at heading boundaries
          const parts = [];
          let lastIndex = 0;
          let match;
          
          // Reset regex
          headingRegex.lastIndex = 0;
          
          // First check for creative question patterns (ক. খ. গ. ঘ.)
          const creativeMatch = trimmedParagraph.match(/^([ক-ঘ]\.?\s+.+?)(?:\n(.*))?$/s);
          
          if (creativeMatch && !headingRegex.test(trimmedParagraph)) {
            // This is a creative question heading without ** markers
            const headingText = creativeMatch[1].trim();
            const remainingText = creativeMatch[2] ? creativeMatch[2].trim() : '';
            
            parts.push({
              type: 'heading',
              content: headingText,
              fullMatch: headingText
            });
            
            if (remainingText) {
              parts.push({
                type: 'text',
                content: remainingText
              });
            }
          } else {
            // Process regular ** headings
            while ((match = headingRegex.exec(trimmedParagraph)) !== null) {
              // Add text before heading if any
              if (match.index > lastIndex) {
                const beforeText = trimmedParagraph.slice(lastIndex, match.index).trim();
                if (beforeText) {
                  parts.push({
                    type: 'text',
                    content: beforeText
                  });
                }
              }
              
              // Add the heading
              parts.push({
                type: 'heading',
                content: match[1] + (match[2] || ''),
                fullMatch: match[0] + (match[2] || '')
              });
              
              lastIndex = match.index + match[0].length;
            }
            
            // Add remaining text after last heading
            if (lastIndex < trimmedParagraph.length) {
              const afterText = trimmedParagraph.slice(lastIndex).trim();
              if (afterText) {
                parts.push({
                  type: 'text',
                  content: afterText
                });
              }
            }
          }
          
          // Render all parts
          return (
            <div key={index}>
              {parts.map((part, partIndex) => {
                if (part.type === 'heading') {
                  // Split heading by math expressions
                  const headingParts = part.content.split(/(\$[^$]+\$)/g);
                  const renderedHeading = headingParts.map((hPart, hIdx) => {
                    if (hPart.startsWith('$') && hPart.endsWith('$')) {
                      const mathContent = hPart.slice(1, -1);
                      return (
                        <MathJax 
                          key={hIdx} 
                          inline
                          dynamic
                          style={{ 
                            display: 'inline', 
                            margin: '0 1px',
                            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                            maxWidth: '100%'
                          }}
                        >
                          {`$${mathContent}$`}
                        </MathJax>
                      );
                    } else {
                      return <span key={hIdx}>{hPart}</span>;
                    }
                  });
                  
                  return (
                    <h3 key={`heading-${index}-${partIndex}`} style={{ 
                      fontWeight: 'bold', 
                      color: '#3b82f6',
                      fontSize: 'clamp(1rem, 3vw, 1.1em)',
                      marginBottom: '0.5rem',
                      marginTop: partIndex > 0 ? '1.5rem' : (index > 0 ? '1.5rem' : '0'),
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {renderedHeading}
                    </h3>
                  );
                } else {
                  // Regular text
                  return (
                    <p key={`text-${index}-${partIndex}`} style={{ 
                      marginBottom: '1rem',
                      lineHeight: '1.8',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {processInlineText(part.content)}
                    </p>
                  );
                }
              })}
            </div>
          );
        }
        
        // Check if this is a standalone heading at paragraph start
        if (/^\*\*[^*]+\*\*/.test(trimmedParagraph) || /^[ক-ঘ]\.?\s+.+?$/.test(trimmedParagraph)) {
          // Check if it's ONLY a heading (no content after) OR if content is minimal
          const headingMatch = trimmedParagraph.match(/^(\*\*[^*]+\*\*[:.।]?)\s*(.*)$/s);
          const creativeHeadingMatch = trimmedParagraph.match(/^([ক-ঘ]\.?\s+.+?)(?:\n(.*))?$/s);
          
          if (headingMatch) {
            const headingPart = headingMatch[1];
            const contentPart = headingMatch[2].trim();
            
            // Always treat **text** as heading if it's at the start of paragraph
            const isStandaloneHeading = !contentPart || contentPart === '';
            
            // Process heading
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
            
            // Split by math expressions and render heading
            const headingParts = headingContent.split(/(\$[^$]+\$)/g);
            const renderedHeading = headingParts.map((part, partIdx) => {
              if (part.startsWith('$') && part.endsWith('$')) {
                const mathContent = part.slice(1, -1);
                return (
                  <MathJax 
                    key={partIdx} 
                    inline
                    dynamic
                    style={{ 
                      display: 'inline', 
                      margin: '0 1px',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                      maxWidth: '100%'
                    }}
                  >
                    {`$${mathContent}$`}
                  </MathJax>
                );
              } else {
                return <span key={partIdx}>{part}</span>;
              }
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
            
            // If it's a standalone heading, return just the heading
            if (isStandaloneHeading) {
              return headingElement;
            } else {
              // If there's content after the heading, process it too
              return (
                <div key={index}>
                  {headingElement}
                  <p style={{ 
                    marginBottom: index < paragraphs.length - 1 ? '1rem' : '0',
                    lineHeight: '1.8',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}>
                    {processInlineText(contentPart.trim())}
                  </p>
                </div>
              );
            }
          } else if (creativeHeadingMatch) {
            // Handle creative question headings (ক. খ. গ. ঘ.)
            const headingPart = creativeHeadingMatch[1];
            const contentPart = creativeHeadingMatch[2] ? creativeHeadingMatch[2].trim() : '';
            
            const isStandaloneHeading = !contentPart || contentPart === '';
            
            // Split by math expressions and render heading
            const headingParts = headingPart.split(/(\$[^$]+\$)/g);
            const renderedHeading = headingParts.map((part, partIdx) => {
              if (part.startsWith('$') && part.endsWith('$')) {
                const mathContent = part.slice(1, -1);
                return (
                  <MathJax 
                    key={partIdx} 
                    inline
                    dynamic
                    style={{ 
                      display: 'inline', 
                      margin: '0 1px',
                      fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                      maxWidth: '100%'
                    }}
                  >
                    {`$${mathContent}$`}
                  </MathJax>
                );
              } else {
                return <span key={partIdx}>{part}</span>;
              }
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
            
            // If it's a standalone heading, return just the heading
            if (isStandaloneHeading) {
              return headingElement;
            } else {
              // If there's content after the heading, process it too
              return (
                <div key={index}>
                  {headingElement}
                  <p style={{ 
                    marginBottom: index < paragraphs.length - 1 ? '1rem' : '0',
                    lineHeight: '1.8',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word'
                  }}>
                    {processInlineText(contentPart.trim())}
                  </p>
                </div>
              );
            }
          }
        }
        
        // Check if this paragraph contains list items at the start of lines
        // More specific check: only treat as list if it has actual bullet markers
        const hasActualBullets = /^\s*[-•*]\s/.test(paragraph) || 
                               /\n\s*[-•*]\s/.test(paragraph);
        
        const isListParagraph = hasActualBullets;
        
        if (isListParagraph) {
          // Handle mixed content - separate regular text from list items
          const parts = paragraph.split(/(?=\n\s*[-•*]\s)/);
          
          return (
            <div key={index} style={{ 
              marginBottom: index < paragraphs.length - 1 ? '1rem' : '0',
              lineHeight: '1.8'
            }}>
              {parts.map((part, partIndex) => {
                const trimmedPart = part.trim();
                
                if (/^\s*[-•*]\s/.test(trimmedPart)) {
                  // This is a list item - no bullet, just indented
                  const cleanItem = trimmedPart.replace(/^\s*[-•*]\s*/, '').trim();
                  
                  return (
                    <div key={partIndex} style={{ 
                      marginBottom: '0.3rem',
                      paddingLeft: '1rem',
                      lineHeight: '1.6'
                    }}>
                      {processInlineText(cleanItem)}
                    </div>
                  );
                } else {
                  // This is regular text - but if it contains a colon at the end, treat it as a subheading
                  if (!trimmedPart) return null;
                  
                  const isSubheading = trimmedPart.endsWith(':') && !trimmedPart.includes('\n');
                  
                  if (isSubheading) {
                    return (
                      <div key={partIndex} style={{ 
                        marginBottom: '0.5rem',
                        marginTop: partIndex > 0 ? '1rem' : '0',
                        fontWeight: 'bold',
                        color: 'inherit' // Use theme color instead of fixed color
                      }}>
                        {processInlineText(trimmedPart)}
                      </div>
                    );
                  } else {
                    return (
                      <p key={partIndex} style={{ 
                        marginBottom: '0.5rem',
                        lineHeight: '1.8'
                      }}>
                        {processInlineText(trimmedPart)}
                      </p>
                    );
                  }
                }
              })}
            </div>
          );
        } else {
          // Regular paragraph handling - keep newlines for line breaks
          return (
            <p key={index} style={{ 
              marginBottom: index < paragraphs.length - 1 ? '1rem' : '0',
              lineHeight: '1.8',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {processInlineText(paragraph.trim())}
            </p>
          );
        }
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
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
      },
      chtml: {
        displayAlign: 'left',
        displayIndent: '0em'
      },
      options: {
        renderActions: {
          addMenu: [],
          checkLoading: [],
          addEvents: []
        },
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
