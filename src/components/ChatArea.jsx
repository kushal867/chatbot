import React, { useRef, useEffect, useState } from 'react';
import {
  Menu,
  Settings,
  Share2,
  Workflow,
  Sparkles,
  Zap,
  Trash2,
  Bot,
  Terminal,
  Database,
  Code,
  Lightbulb,
  ArrowDown
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export const ChatArea = ({
  session,
  isLoading,
  onSendMessage,
  onStopGeneration,
  onRegenerateMessage,
  onClearSession,
  onOpenSettings,
  onOpenExport,
  onOpenWorkflowGuide,
  onToggleSidebar,
  settings
}) => {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll on new messages or loading state
  useEffect(() => {
    if (settings.autoScroll !== false) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages, isLoading, settings.autoScroll]);

  // Handle scroll position detection for scroll-to-bottom button
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const messages = session?.messages || [];
  const isEmptyState = messages.length <= 1; // only welcome message or empty

  const starterPrompts = [
    {
      icon: <Terminal size={18} className="text-cyan-400" />,
      title: 'Generate Code Snippet',
      prompt: 'Write a clean JavaScript async function to call an n8n webhook with error handling and retry logic.',
      desc: 'Test syntax highlighting & code copying'
    },
    {
      icon: <Database size={18} className="text-purple-400" />,
      title: 'Analyze Data Comparison',
      prompt: 'Create a structured Markdown table comparing n8n AI Agents vs LangChain vs Zapier workflows.',
      desc: 'Test table parsing & markdown styling'
    },
    {
      icon: <Zap size={18} className="text-amber-400" />,
      title: 'n8n Architecture Guide',
      prompt: 'Explain how the Webhook node, AI Agent node, and Respond to Webhook node work together in n8n.',
      desc: 'Learn the core pipeline architecture'
    },
    {
      icon: <Lightbulb size={18} className="text-emerald-400" />,
      title: 'Multimodal / Attachment Workflow',
      prompt: 'How can I configure n8n to accept base64 image and document attachments from this chatbot?',
      desc: 'Explore multimodal AI capabilities'
    }
  ];

  const handlePromptCardClick = (promptText) => {
    onSendMessage(promptText, []);
  };

  const isLiveConnected = settings.webhookUrl && !settings.mockMode;

  return (
    <div className="chat-area-container">
      {/* Top Header Bar */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button
            onClick={onToggleSidebar}
            className="mobile-menu-btn"
            title="Toggle sidebar menu"
          >
            <Menu size={20} />
          </button>

          <div className="chat-title-info">
            <h1 className="active-chat-title" title={session?.title || 'Nexus AI Chat'}>
              {session?.title || 'Nexus AI Chat'}
            </h1>
            <div className="connection-status-pill">
              <span className={`status-indicator ${isLiveConnected ? 'status-online' : settings.mockMode ? 'status-mock' : 'status-offline'}`} />
              <span className="status-label">
                {settings.mockMode
                  ? 'Mock Simulation'
                  : isLiveConnected
                  ? 'n8n Webhook Live'
                  : 'Webhook Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="chat-header-actions">
          <button
            onClick={onOpenWorkflowGuide}
            className="header-action-btn guide-btn"
            title="n8n Blueprint & Workflow Setup"
          >
            <Workflow size={16} />
            <span className="btn-label-desktop">Blueprint</span>
          </button>

          <button
            onClick={onOpenExport}
            className="header-action-btn"
            title="Export Conversation"
          >
            <Share2 size={16} />
            <span className="btn-label-desktop">Export</span>
          </button>

          <button
            onClick={onClearSession}
            className="header-action-btn"
            title="Clear Chat Messages"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={onOpenSettings}
            className="header-action-btn settings-btn-top"
            title="Configure Webhook Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="chat-messages-viewport" ref={scrollContainerRef} onScroll={handleScroll}>
        <div className="chat-messages-inner">
          {/* Welcome Screen Cards if conversation is fresh */}
          {isEmptyState && (
            <div className="welcome-banner-hero">
              <div className="hero-badge-pill">
                <Sparkles size={14} className="hero-badge-icon" />
                <span>Powered by n8n Webhook Orchestration</span>
              </div>
              <h2 className="hero-headline">What would you like to build today?</h2>
              <p className="hero-subtext">
                Connect your n8n workflow nodes to orchestrate autonomous agents, execute tool calls, and run multi-step automations.
              </p>

              {/* Starter prompt cards */}
              <div className="starter-cards-grid">
                {starterPrompts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePromptCardClick(item.prompt)}
                    className="starter-card"
                  >
                    <div className="starter-icon-wrap">{item.icon}</div>
                    <div className="starter-content">
                      <h4 className="starter-card-title">{item.title}</h4>
                      <p className="starter-card-desc">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render All Messages */}
          {messages.map((msg, index) => {
            const isLatestAssistant =
              !isLoading &&
              msg.role === 'assistant' &&
              index === messages.length - 1;

            return (
              <ChatMessage
                key={msg.id || index}
                message={msg}
                onRegenerate={isLatestAssistant ? onRegenerateMessage : undefined}
                onPromptClick={(prompt) => onSendMessage(prompt, [])}
                isLatestAssistantMessage={isLatestAssistant}
              />
            );
          })}

          {/* Typing / Processing Indicator */}
          {isLoading && (
            <div className="message-row assistant-row typing-row">
              <div className="message-avatar assistant-avatar">
                <div className="assistant-avatar-inner pulsing-avatar">
                  <Bot size={18} />
                  <span className="avatar-glow-ring" />
                </div>
              </div>
              <div className="message-content-wrapper">
                <div className="typing-indicator-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-status-text">
                    {settings.mockMode ? 'Generating simulation...' : 'Contacting n8n webhook workflow...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="scroll-anchor" />
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="floating-scroll-bottom-btn"
            title="Scroll to latest message"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={16} />
            <span>Latest</span>
          </button>
        )}
      </div>

      {/* Input Tray */}
      <div className="chat-input-sticky-bottom">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          onStopGeneration={onStopGeneration}
          disabled={false}
          placeholder={
            settings.mockMode
              ? 'Mock mode active: Type any question or prompt...'
              : settings.webhookUrl
              ? 'Send message to n8n webhook workflow...'
              : 'Enter message (Configure Webhook in Settings for live mode)...'
          }
        />
      </div>
    </div>
  );
};

export default ChatArea;
