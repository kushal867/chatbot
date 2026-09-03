import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  Pin,
  Moon,
  Sun,
  Zap,
  BookOpen,
  Share2,
  HardDrive,
  Workflow
} from 'lucide-react';

export const Sidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
  onClearAllSessions,
  onOpenSettings,
  onOpenExport,
  onOpenWorkflowGuide,
  currentTheme,
  onChangeTheme,
  settings,
  isOpen,
  onCloseMobileSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // Group sessions by date
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.messages && s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [sessions, searchQuery]);

  const { pinned, today, yesterday, earlier } = useMemo(() => {
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayDate = todayDate - 24 * 60 * 60 * 1000;

    const pinnedList = [];
    const todayList = [];
    const yesterdayList = [];
    const earlierList = [];

    filteredSessions.forEach((s) => {
      if (s.pinned) {
        pinnedList.push(s);
        return;
      }
      const sTime = new Date(s.updatedAt || s.createdAt).getTime();
      if (sTime >= todayDate) {
        todayList.push(s);
      } else if (sTime >= yesterdayDate) {
        yesterdayList.push(s);
      } else {
        earlierList.push(s);
      }
    });

    return {
      pinned: pinnedList,
      today: todayList,
      yesterday: yesterdayList,
      earlier: earlierList
    };
  }, [filteredSessions]);

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const renderSessionItem = (session) => {
    const isActive = session.id === activeSessionId;
    const isEditing = session.id === editingId;
    const messageCount = session.messages ? session.messages.length : 0;

    return (
      <div
        key={session.id}
        onClick={() => {
          onSelectSession(session.id);
          if (onCloseMobileSidebar) onCloseMobileSidebar();
        }}
        className={`session-item ${isActive ? 'session-active' : ''} ${session.pinned ? 'session-pinned' : ''}`}
      >
        <div className="session-item-left">
          {session.pinned ? (
            <Pin size={15} className="session-pin-icon" />
          ) : (
            <MessageSquare size={15} className="session-chat-icon" />
          )}

          {isEditing ? (
            <div className="session-inline-edit" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(e, session.id);
                  if (e.key === 'Escape') handleCancelRename(e);
                }}
                autoFocus
                className="session-rename-input"
              />
              <button
                type="button"
                onClick={(e) => handleSaveRename(e, session.id)}
                className="rename-action-btn check"
                title="Save"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={handleCancelRename}
                className="rename-action-btn cancel"
                title="Cancel"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="session-title-wrap">
              <span className="session-title" title={session.title}>
                {session.title || 'Untitled Chat'}
              </span>
              <span className="session-meta-count">{messageCount} msgs</span>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="session-actions-hover" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinSession(session.id);
              }}
              className="session-tool-btn"
              title={session.pinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={13} className={session.pinned ? 'fill-current' : ''} />
            </button>
            <button
              onClick={(e) => handleStartRename(e, session)}
              className="session-tool-btn"
              title="Rename conversation"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="session-tool-btn delete-btn"
              title="Delete conversation"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Header & Brand */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-logo-badge">
            <Zap size={18} className="brand-icon" />
          </div>
          <div className="brand-info">
            <span className="brand-title">Nexus AI</span>
            <span className="brand-subtitle">n8n Webhook Studio</span>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobileSidebar && (
          <button
            onClick={onCloseMobileSidebar}
            className="mobile-sidebar-close-btn"
            title="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* New Chat Action */}
      <div className="sidebar-action-wrap">
        <button
          onClick={() => {
            onNewSession();
            if (onCloseMobileSidebar) onCloseMobileSidebar();
          }}
          className="new-chat-btn"
        >
          <Plus size={18} />
          <span>New Chat</span>
          <span className="shortcut-tag">⌘K</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="sidebar-search-wrap">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats..."
          className="sidebar-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="search-clear-btn"
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Session List */}
      <div className="sidebar-sessions-scroll">
        {filteredSessions.length === 0 ? (
          <div className="empty-sessions-notice">
            <MessageSquare size={28} className="empty-icon" />
            <p>No conversations found</p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="session-group">
                <div className="group-label">Pinned</div>
                {pinned.map(renderSessionItem)}
              </div>
            )}

            {today.length > 0 && (
              <div className="session-group">
                <div className="group-label">Today</div>
                {today.map(renderSessionItem)}
              </div>
            )}

            {yesterday.length > 0 && (
              <div className="session-group">
                <div className="group-label">Yesterday</div>
                {yesterday.map(renderSessionItem)}
              </div>
            )}

            {earlier.length > 0 && (
              <div className="session-group">
                <div className="group-label">Previous Conversations</div>
                {earlier.map(renderSessionItem)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick n8n Status Badge */}
      <div className="sidebar-n8n-status-card" onClick={onOpenSettings}>
        <div className="status-indicator-dot">
          <span className={`status-dot ${settings.webhookUrl ? (settings.mockMode ? 'status-mock' : 'status-live') : 'status-unconfigured'}`} />
        </div>
        <div className="status-text-wrap">
          <span className="status-title">
            {settings.mockMode ? 'Mock Simulation' : settings.webhookUrl ? 'n8n Live Webhook' : 'Webhook Not Configured'}
          </span>
          <span className="status-url-sub">
            {settings.mockMode ? 'Testing Mode' : settings.webhookUrl ? settings.webhookUrl.replace(/^https?:\/\//, '').slice(0, 22) + '...' : 'Click to configure URL'}
          </span>
        </div>
        <Settings size={15} className="status-gear-icon" />
      </div>

      {/* Sidebar Footer Controls */}
      <div className="sidebar-footer">
        <button
          onClick={onOpenWorkflowGuide}
          className="footer-action-btn"
          title="View n8n Workflow Guide & Blueprint JSON"
        >
          <Workflow size={16} />
          <span>n8n Blueprint</span>
        </button>

        <button
          onClick={onOpenExport}
          className="footer-action-btn"
          title="Export Conversation"
        >
          <Share2 size={16} />
          <span>Export</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="footer-action-btn"
          title="Settings & Webhook Configuration"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        {/* Theme toggler */}
        <div className="theme-toggle-row">
          <button
            onClick={() => onChangeTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="theme-switch-btn"
            title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {currentTheme === 'dark' ? (
              <>
                <Sun size={15} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={15} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
