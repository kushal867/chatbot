import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
import WorkflowGuideModal from './components/WorkflowGuideModal';

import {
  getSessions,
  saveSessions,
  getActiveSessionId,
  setActiveSessionId,
  getSettings,
  saveSettings,
  getTheme,
  saveTheme,
  DEFAULT_SESSION
} from './services/storageService';
import { sendMessageToN8n } from './services/n8nService';

export function App() {
  const [sessions, setSessions] = useState(() => getSessions());
  const [activeSessionId, setActiveId] = useState(() => getActiveSessionId());
  const [settings, setSettingsState] = useState(() => getSettings());
  const [theme, setThemeState] = useState(() => getTheme());

  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isWorkflowGuideOpen, setIsWorkflowGuideOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const abortControllerRef = useRef(null);

  // Sync active theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Save active session id
  useEffect(() => {
    setActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  // Current active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Helper to update active session messages
  const updateActiveSession = useCallback((updater) => {
    setSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          return updater(session);
        }
        return session;
      });
    });
  }, [activeSessionId]);

  // Switch active session
  const handleSelectSession = (id) => {
    setActiveId(id);
  };

  // Create a new session
  const handleNewSession = () => {
    const newSession = DEFAULT_SESSION();
    setSessions((prev) => [newSession, ...prev]);
    setActiveId(newSession.id);
  };

  // Delete a session
  const handleDeleteSession = (id) => {
    if (sessions.length === 1) {
      // Reset if only one session left
      const fresh = DEFAULT_SESSION();
      setSessions([fresh]);
      setActiveId(fresh.id);
      return;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveId(filtered[0]?.id || '');
    }
  };

  // Rename a session
  const handleRenameSession = (id, newTitle) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s))
    );
  };

  // Toggle Pin on session
  const handleTogglePinSession = (id) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  // Clear current active session messages
  const handleClearActiveSession = () => {
    if (window.confirm('Clear all messages in this conversation?')) {
      updateActiveSession((session) => ({
        ...session,
        messages: [
          {
            id: 'msg_cleared_' + Date.now(),
            role: 'assistant',
            content: 'Conversation history cleared. How can I help you next?',
            timestamp: new Date().toISOString()
          }
        ],
        updatedAt: new Date().toISOString()
      }));
    }
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (window.confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
      const fresh = DEFAULT_SESSION();
      setSessions([fresh]);
      setActiveId(fresh.id);
    }
  };

  // Update & Save settings
  const handleSaveSettings = (newSettings) => {
    setSettingsState(newSettings);
    saveSettings(newSettings);
  };

  // Switch theme
  const handleChangeTheme = (newTheme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
  };

  // Keyboard Shortcuts (⌘K for new chat, ⌘, for settings)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewSession();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stop generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Send message to n8n
  const handleSendMessage = async (userText, attachments = []) => {
    if ((!userText && attachments.length === 0) || isLoading) return;

    const userMessageId = 'msg_user_' + Date.now();
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      attachments: attachments,
      timestamp: new Date().toISOString()
    };

    // Auto-generate title for fresh session from first user message
    const isFirstUserMessage =
      activeSession &&
      (!activeSession.messages || activeSession.messages.filter((m) => m.role === 'user').length === 0);

    const generatedTitle = isFirstUserMessage
      ? userText.slice(0, 32).trim() + (userText.length > 32 ? '...' : '')
      : activeSession.title;

    // Append user message immediately
    const updatedMessages = [...(activeSession.messages || []), userMessage];
    updateActiveSession((session) => ({
      ...session,
      title: isFirstUserMessage ? generatedTitle : session.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    }));

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await sendMessageToN8n({
        message: userText,
        session: { ...activeSession, messages: updatedMessages },
        settings,
        attachments,
        signal: abortControllerRef.current.signal
      });

      const assistantMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: response.text,
        suggestions: response.suggestions,
        sources: response.sources,
        latency: response.latency,
        timestamp: new Date().toISOString(),
        status: 'success'
      };

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('cancelled')) {
        // User aborted, do nothing special
      } else {
        const errorMessage = {
          id: 'msg_err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Error communicating with n8n Webhook**\n\n${err.message}`,
          timestamp: new Date().toISOString(),
          status: 'error'
        };

        updateActiveSession((session) => ({
          ...session,
          messages: [...session.messages, errorMessage],
          updatedAt: new Date().toISOString()
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last assistant response
  const handleRegenerateMessage = async () => {
    if (isLoading || !activeSession || !activeSession.messages) return;

    const msgs = [...activeSession.messages];
    // Find last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMsg = msgs[lastUserIndex];
    // Strip messages after last user message
    const trimmedMessages = msgs.slice(0, lastUserIndex + 1);

    updateActiveSession((session) => ({
      ...session,
      messages: trimmedMessages,
      updatedAt: new Date().toISOString()
    }));

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await sendMessageToN8n({
        message: lastUserMsg.content,
        session: { ...activeSession, messages: trimmedMessages },
        settings,
        attachments: lastUserMsg.attachments || [],
        signal: abortControllerRef.current.signal
      });

      const assistantMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: response.text,
        suggestions: response.suggestions,
        sources: response.sources,
        latency: response.latency,
        timestamp: new Date().toISOString(),
        status: 'success'
      };

      updateActiveSession((session) => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        const errorMessage = {
          id: 'msg_err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Error communicating with n8n Webhook**\n\n${err.message}`,
          timestamp: new Date().toISOString(),
          status: 'error'
        };

        updateActiveSession((session) => ({
          ...session,
          messages: [...session.messages, errorMessage],
          updatedAt: new Date().toISOString()
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="app-layout">
      {/* Ambient Animated Glow Mesh Background */}
      <div className="ambient-background-layer" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-backdrop-mobile"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
        onClearAllSessions={handleClearAllSessions}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenWorkflowGuide={() => setIsWorkflowGuideOpen(true)}
        currentTheme={theme}
        onChangeTheme={handleChangeTheme}
        settings={settings}
        isOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Workspace */}
      <main className="main-content-area">
        <ChatArea
          session={activeSession}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onRegenerateMessage={handleRegenerateMessage}
          onClearSession={handleClearActiveSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenWorkflowGuide={() => setIsWorkflowGuideOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          settings={settings}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        currentTheme={theme}
        onChangeTheme={handleChangeTheme}
        onOpenWorkflowGuide={() => {
          setIsSettingsOpen(false);
          setIsWorkflowGuideOpen(true);
        }}
      />

      {/* Export Conversation Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        activeSession={activeSession}
      />

      {/* n8n Blueprint Workflow Guide Modal */}
      <WorkflowGuideModal
        isOpen={isWorkflowGuideOpen}
        onClose={() => setIsWorkflowGuideOpen(false)}
        onConfigureWebhook={() => setIsSettingsOpen(true)}
      />
    </div>
  );
}

export default App;
