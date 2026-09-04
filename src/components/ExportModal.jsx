import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  FileText,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal
} from 'lucide-react';

export const ExportModal = ({ isOpen, onClose, activeSession }) => {
  const [format, setFormat] = useState('markdown'); // 'markdown' | 'json' | 'text'
  const [copied, setCopied] = useState(false);

  const exportContent = useMemo(() => {
    if (!activeSession) return '';
    if (format === 'json') {
      return JSON.stringify(activeSession, null, 2);
    }

    if (format === 'text') {
      return (activeSession.messages || [])
        .map((m) => `[${m.role.toUpperCase()}] (${m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}):\n${m.content}\n\n`)
        .join('---\n\n');
    }

    // Markdown
    let md = `# ${activeSession.title || 'Chat Conversation'}\n`;
    md += `*Exported from Nexus n8n Chatbot on ${new Date().toLocaleString()}*\n\n---\n\n`;

    (activeSession.messages || []).forEach((m) => {
      const sender = m.role === 'user' ? '👤 User' : '🤖 Nexus AI (n8n)';
      const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
      md += `### ${sender}  \`${time}\`\n\n${m.content}\n\n`;
      if (m.latency) {
        md += `*Latency: ${m.latency}s*\n\n`;
      }
      md += `---\n\n`;
    });

    return md;
  }, [activeSession, format]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt';
    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeSession.title || 'conversation').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !activeSession) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container export-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Share2 size={20} />
            </div>
            <div>
              <h2 className="modal-title">Export Conversation</h2>
              <p className="modal-subtitle">Save or share your chat messages and workflow session</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Format Selector */}
        <div className="modal-tabs">
          <button
            onClick={() => setFormat('markdown')}
            className={`tab-btn ${format === 'markdown' ? 'tab-active' : ''}`}
          >
            <FileText size={15} />
            <span>Markdown (.md)</span>
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`tab-btn ${format === 'json' ? 'tab-active' : ''}`}
          >
            <FileCode size={15} />
            <span>Raw JSON (.json)</span>
          </button>
          <button
            onClick={() => setFormat('text')}
            className={`tab-btn ${format === 'text' ? 'tab-active' : ''}`}
          >
            <Terminal size={15} />
            <span>Plain Text</span>
          </button>
        </div>

        {/* Preview Area */}
        <div className="modal-body">
          <div className="export-preview-container">
            <pre className="export-preview-box">
              <code>{exportContent}</code>
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-modal-secondary">
            Close
          </button>
          <div className="footer-right-actions">
            <button onClick={handleCopy} className="btn-modal-secondary">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
            <button onClick={handleDownload} className="btn-modal-primary">
              <Download size={14} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
