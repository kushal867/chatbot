import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Info, AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react';

/**
 * Custom CodeBlock with Copy button, Language Badge, and clean syntax formatting
 */
export const CodeBlock = ({ language = 'code', code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <div className="code-lang-tag">
          <Terminal size={13} className="code-lang-icon" />
          <span>{language || 'plaintext'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="code-copy-btn"
          aria-label="Copy code to clipboard"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-content">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

/**
 * Main Markdown Renderer
 */
export const MarkdownRenderer = ({ content = '' }) => {
  if (!content) return null;

  // Split into blocks by triple backticks for code blocks first
  const blocks = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-+#]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        value: content.slice(lastIndex, match.index)
      });
    }
    blocks.push({
      type: 'code',
      lang: match[1] || 'plaintext',
      value: match[2].trimEnd()
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({
      type: 'text',
      value: content.slice(lastIndex)
    });
  }

  return (
    <div className="markdown-body">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.lang} code={block.value} />;
        }
        return <FormattedTextBlock key={idx} text={block.value} />;
      })}
    </div>
  );
};

/**
 * Formats non-code markdown chunks: headers, tables, callouts, lists, paragraphs
 */
const FormattedTextBlock = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Callout alert box: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    const alertMatch = trimmed.match(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i);
    if (alertMatch) {
      const alertType = alertMatch[1].toUpperCase();
      const alertLines = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        alertLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <div key={`alert-${i}`} className={`callout-alert callout-${alertType.toLowerCase()}`}>
          <div className="callout-header">
            {alertType === 'TIP' && <Lightbulb size={16} />}
            {alertType === 'WARNING' && <AlertTriangle size={16} />}
            {alertType === 'IMPORTANT' && <AlertCircle size={16} />}
            {alertType === 'NOTE' && <Info size={16} />}
            {alertType === 'CAUTION' && <AlertCircle size={16} />}
            <span className="callout-title">{alertType}</span>
          </div>
          <div className="callout-content">
            {alertLines.map((l, lIdx) => (
              <p key={lIdx}>{renderInlineMarkdown(l)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // Regular Blockquote: > line
    if (trimmed.startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={`quote-${i}`} className="markdown-blockquote">
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineMarkdown(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Markdown Table: starts with | and next line has | --- |
    if (trimmed.startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      elements.push(renderMarkdownTable(tableLines, `table-${i}`));
      continue;
    }

    // Headers: #, ##, ###, ####
    if (trimmed.startsWith('#')) {
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headingText = headerMatch[2];
        const Tag = `h${level}`;
        elements.push(
          <Tag key={`h-${i}`} className={`markdown-heading h${level}`}>
            {renderInlineMarkdown(headingText)}
          </Tag>
        );
        i++;
        continue;
      }
    }

    // Horizontal Rule: ---, ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="markdown-divider" />);
      i++;
      continue;
    }

    // Unordered List: - item, * item
    if (/^[\*\-]\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[\*\-]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="markdown-ul">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered List: 1. item, 2. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="markdown-ol">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="markdown-p">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
};

/**
 * Parses markdown table lines into styled React Table
 */
const renderMarkdownTable = (tableLines, key) => {
  if (tableLines.length < 2) return null;

  const parseRow = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(2).map(parseRow);

  return (
    <div key={key} className="table-responsive-wrapper">
      <table className="markdown-table">
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx}>{renderInlineMarkdown(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{renderInlineMarkdown(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Handles inline styles: `code`, **bold**, *italic*, ~~strikethrough~~, [link](url)
 */
export const renderInlineMarkdown = (text) => {
  if (!text) return text;

  // Split by inline code first to protect code content
  const parts = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts.map((part, idx) => {
    if (part.type === 'code') {
      return (
        <code key={idx} className="inline-code">
          {part.content}
        </code>
      );
    }
    return <span key={idx}>{parseBasicInline(part.content)}</span>;
  });
};

/**
 * Parses bold, italics, strikethrough, and links in plain inline text
 */
const parseBasicInline = (text) => {
  if (!text) return text;

  // Replace links: [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const tokens = [];
  let last = 0;
  let m;

  while ((m = linkRegex.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push(text.slice(last, m.index));
    }
    tokens.push(
      <a
        key={`link-${m.index}`}
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="markdown-link"
      >
        {m[1]}
        <ExternalLink size={11} className="inline-link-icon" />
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    tokens.push(text.slice(last));
  }

  // Parse formatting in strings
  return tokens.map((tok, tIdx) => {
    if (typeof tok !== 'string') return tok;

    // Bold **text**
    const boldParts = tok.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, bpIdx) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${tIdx}-${bpIdx}`} className="font-semibold text-accent-highlight">{bp.slice(2, -2)}</strong>;
      }
      // Italic *text* or _text_
      const italicParts = bp.split(/(\*[^*]+\*)/g);
      return italicParts.map((ip, ipIdx) => {
        if (ip.startsWith('*') && ip.endsWith('*')) {
          return <em key={`${tIdx}-${bpIdx}-${ipIdx}`}>{ip.slice(1, -1)}</em>;
        }
        return ip;
      });
    });
  });
};

export default MarkdownRenderer;
