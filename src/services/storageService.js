// Storage service for managing sessions, messages, and n8n settings in localStorage

const SESSIONS_KEY = 'n8n_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'n8n_chat_active_session_v1';
const SETTINGS_KEY = 'n8n_chat_settings_v1';
const THEME_KEY = 'n8n_chat_theme_v1';

export const DEFAULT_SETTINGS = {
  webhookUrl: '',
  httpMethod: 'POST',
  authType: 'none', // 'none' | 'bearer' | 'header'
  authToken: '',
  customHeaderName: 'x-api-key',
  customHeaderValue: '',
  payloadFormat: 'chatTrigger', // 'chatTrigger' | 'agent' | 'custom'
  customPayloadTemplate: '{\n  "message": "{{message}}",\n  "sessionId": "{{sessionId}}",\n  "attachments": {{attachments}}\n}',
  systemPrompt: 'You are a friendly, intelligent, and natural conversational AI companion. Speak with warmth, clarity, empathy, and insight, just like talking with a knowledgeable human colleague. Format your answers clearly with markdown when helpful.',
  mockMode: false,
  streamSimulation: true,
  autoScroll: true,
  soundEffects: true,
  ttsVoice: '',
  timeoutSeconds: 45,
};

export const DEFAULT_SESSION = () => ({
  id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  title: 'New Conversation',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pinned: false,
  messages: [
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: "👋 Hi there! I'm your AI companion powered by **n8n Webhook** workflows.\n\nI'm here to chat, answer questions, help solve problems, or trigger automations through your n8n workflow backend.\n\nHow is your day going, and what would you like to explore today?",
      timestamp: new Date().toISOString(),
      latency: null,
      status: 'success'
    }
  ]
});

export const getSessions = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      const initial = [DEFAULT_SESSION()];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_SESSION()];
  } catch (e) {
    console.error('Error reading sessions from localStorage:', e);
    return [DEFAULT_SESSION()];
  }
};

export const saveSessions = (sessions) => {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving sessions to localStorage:', e);
  }
};

export const getActiveSessionId = () => {
  try {
    const active = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (active) return active;
    const sessions = getSessions();
    return sessions[0]?.id || '';
  } catch {
    return '';
  }
};

export const setActiveSessionId = (id) => {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } catch (e) {
    console.error('Error setting active session ID:', e);
  }
};

export const getSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error reading settings from localStorage:', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to localStorage:', e);
  }
};

export const getTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

export const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    console.error('Error saving theme:', e);
  }
};

export const getStorageStats = () => {
  try {
    let totalLength = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalLength += (localStorage[key].length + key.length) * 2;
      }
    }
    const kb = (totalLength / 1024).toFixed(1);
    return { kb, percentage: Math.min(100, Math.round((totalLength / (5 * 1024 * 1024)) * 100)) };
  } catch {
    return { kb: '0', percentage: 0 };
  }
};
