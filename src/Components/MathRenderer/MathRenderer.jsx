import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'; // Add KaTeX CSS so rendered math shows correctly

// Shared markdown component styles
const components = {
  p: ({ children }) => <p style={{ margin: '0.4rem 0', lineHeight: '1.7' }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'inherit' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic', opacity: 0.9 }}>{children}</em>,
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>{children}</code>;
    }
    return (
      <pre style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.75rem', margin: '0.5rem 0', overflowX: 'auto', fontSize: '0.8rem', maxWidth: '100%', scrollbarWidth: 'none' }}>
        <code className={className} {...props}>{children}</code>
      </pre>
    );
  },
  h1: ({ children }) => <h1 style={{ fontWeight: 'bold', fontSize: '1.3rem', margin: '0.8rem 0 0.4rem', color: 'inherit' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontWeight: 'bold', fontSize: '1.15rem', margin: '0.7rem 0 0.3rem', color: 'inherit' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: '0.6rem 0 0.25rem', color: 'inherit' }}>{children}</h3>,
  h4: ({ children }) => <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: '0.5rem 0 0.2rem', color: 'inherit' }}>{children}</h4>,
  ul: ({ children }) => <ul style={{ paddingLeft: '1.2rem', margin: '0.3rem 0', listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children, start }) => <ol start={start} style={{ paddingLeft: '1.4rem', margin: '0.3rem 0', listStyleType: 'decimal', counterReset: start ? `list-item ${start - 1}` : undefined }}>{children}</ol>,
  li: ({ children }) => (
    <li style={{ marginBottom: '0.2rem', lineHeight: '1.6', paddingLeft: '0.2rem' }}>
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid rgba(124,58,237,0.4)', paddingLeft: '0.75rem', margin: '0.5rem 0', opacity: 0.85, fontStyle: 'italic' }}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>{children}</a>,
  table: ({ children }) => (
    <div style={{ maxWidth: '100%', margin: '0.5rem 0' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem', width: '100%', tableLayout: 'fixed' }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: 'rgba(255,255,255,0.05)' }}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{children}</tr>,
  th: ({ children }) => <th style={{ padding: '0.35rem 0.45rem', fontWeight: 'bold', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'top' }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '0.35rem 0.45rem', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'top' }}>{children}</td>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.75rem 0' }} />,
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-error text-sm p-4 border border-error/20 rounded-md">Failed to render parsed content. Try reloading.</div>;
    }
    return this.props.children;
  }
}

const MathRenderer = ({ text }) => {
  if (!text) return null;

  // Convert escaped \n to actual line breaks
  let processed = text.replace(/\\n(?![a-zA-Z])/g, '\n');

  // Convert single newlines to Markdown line breaks (two trailing spaces + newline)
  // This ensures ক, খ, গ, ঘ etc. appear on separate lines
  processed = processed.replace(/(?<!\n)\n(?!\n)/g, '  \n');

  return (
    <ErrorBoundary>
      <div className="math-markdown-content" style={{ lineHeight: '1.7', maxWidth: '100%', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={components}
        >
          {processed}
        </ReactMarkdown>
      </div>
    </ErrorBoundary>
  );
};

export default MathRenderer;
