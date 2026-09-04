import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  CornerDownLeft
} from 'lucide-react';

export const ChatInput = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  placeholder = 'Ask anything, run an n8n workflow, or paste code...',
  disabled = false
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${Math.max(48, nextHeight)}px`;
  }, [text]);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setText((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Mic start error:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading || disabled) {
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const processFiles = (files) => {
    const newAttachments = [];
    let processed = 0;

    files.forEach((file) => {
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        newAttachments.push({
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: reader.result // base64 string
        });
        processed++;
        if (processed === files.length) {
          setAttachments((prev) => [...prev, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  // Drag and drop support
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="chat-input-wrapper">
      <div
        className={`chat-input-card ${isDragging ? 'dragging-active' : ''} ${isRecording ? 'recording-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attachment preview pills */}
        {attachments.length > 0 && (
          <div className="input-attachments-tray">
            {attachments.map((att) => (
              <div key={att.id} className="input-attachment-chip">
                {att.type.startsWith('image/') ? (
                  <div className="img-thumbnail-wrap">
                    <img src={att.data} alt={att.name} className="img-thumbnail" />
                  </div>
                ) : (
                  <FileText size={16} className="file-chip-icon" />
                )}
                <div className="chip-meta">
                  <span className="chip-name">{att.name}</span>
                  <span className="chip-size">{(att.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="chip-remove-btn"
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input box row */}
        <div className="input-row">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden-file-input"
            accept="image/*,.pdf,.txt,.json,.csv,.md,.js,.py"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="input-tool-btn"
            title="Attach files (images, docs, code)"
            aria-label="Attach file"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening... Speak into microphone...' : placeholder}
            rows={1}
            disabled={disabled}
            className="chat-textarea"
          />

          {/* Voice dictation button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`input-tool-btn mic-btn ${isRecording ? 'mic-recording' : ''}`}
            title={isRecording ? 'Stop voice recording' : 'Voice dictation'}
            aria-label="Voice input"
          >
            {isRecording ? (
              <div className="mic-recording-wrap">
                <span className="mic-pulse-ring" />
                <MicOff size={18} />
              </div>
            ) : (
              <Mic size={18} />
            )}
          </button>

          {/* Send / Stop button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="send-action-btn stop-btn"
              title="Stop response generation"
              aria-label="Stop generation"
            >
              <Square size={16} className="fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!text.trim() && attachments.length === 0) || disabled}
              className={`send-action-btn ${text.trim() || attachments.length > 0 ? 'send-ready' : 'send-disabled'}`}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          )}
        </div>

        {/* Subtle footer info */}
        <div className="input-card-footer">
          <div className="input-hints">
            <span className="hint-pill">
              <kbd>Enter</kbd> send
            </span>
            <span className="hint-pill">
              <kbd>Shift + Enter</kbd> new line
            </span>
          </div>
          <div className="input-char-count">
            {text.length > 0 && (
              <>
                <span className="count-tag">{text.length} chars</span>
                <span className="count-separator">•</span>
                <span className="count-tag">~{Math.max(1, Math.ceil(text.length / 4))} tokens</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
