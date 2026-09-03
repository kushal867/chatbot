import React, { useState, useEffect } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Clock,
  Zap,
  FileText,
  Image as ImageIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export const ChatMessage = ({
  message,
  onRegenerate,
  onPromptClick,
  isLatestAssistantMessage = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  // Handle TTS
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel(); // Stop any other speech
      const plainText = message.content.replace(/[#*`_\[\]()>-]/g, ' ');
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user-row' : 'assistant-row'} ${isError ? 'error-row' : ''}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`}>
        {isUser ? (
          <User size={18} />
        ) : (
          <div className="assistant-avatar-inner">
            <Bot size={18} />
            <span className="avatar-glow-ring" />
          </div>
        )}
      </div>

      {/* Message Bubble Container */}
      <div className="message-content-wrapper">
        <div className="message-header-meta">
          <span className="sender-name">
            {isUser ? 'You' : 'Nexus AI (n8n)'}
          </span>
          <span className="message-time">
            <Clock size={11} className="meta-icon" />
            {formatTimestamp(message.timestamp)}
          </span>
          {message.latency && (
            <span className="message-latency" title={`Response time: ${message.latency}s`}>
              <Zap size={11} />
              {message.latency}s
            </span>
          )}
        </div>

        {/* Attachments preview if user attached files */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments-container">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="attachment-chip">
                {att.type?.startsWith('image/') ? (
                  <ImageIcon size={14} className="attachment-type-icon" />
                ) : (
                  <FileText size={14} className="attachment-type-icon" />
                )}
                <span className="attachment-name" title={att.name}>{att.name}</span>
                <span className="attachment-size">({(att.size / 1024).toFixed(0)}KB)</span>
              </div>
            ))}
          </div>
        )}

        {/* Message Body */}
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
          {isError ? (
            <div className="error-message-box">
              <AlertCircle size={18} className="error-icon" />
              <div className="error-text">
                <MarkdownRenderer content={message.content} />
              </div>
            </div>
          ) : isUser ? (
            <div className="user-text-content">{message.content}</div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Interactive Suggestion Chips (if returned by n8n or mock) */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="message-suggestions-list">
            <div className="suggestions-label">
              <Sparkles size={12} />
              <span>Suggested follow-ups</span>
            </div>
            <div className="suggestions-chips">
              {message.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onPromptClick && onPromptClick(suggestion)}
                  className="suggestion-pill"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        {!isUser && !isError && (
          <div className="message-actions-bar">
            <button
              onClick={handleCopy}
              className="action-btn"
              title="Copy message to clipboard"
              aria-label="Copy message"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleToggleSpeak}
              className={`action-btn ${isSpeaking ? 'active-speaking' : ''}`}
              title={isSpeaking ? 'Stop speaking' : 'Read message aloud'}
              aria-label="Read aloud"
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isSpeaking ? 'Stop' : 'Speak'}</span>
            </button>

            {isLatestAssistantMessage && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="action-btn"
                title="Regenerate this response"
                aria-label="Regenerate"
              >
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {isUser && onRegenerate && (
          <div className="message-actions-bar user-actions">
            <button
              onClick={handleCopy}
              className="action-btn"
              title="Copy prompt"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
