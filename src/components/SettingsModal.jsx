import React, { useState } from 'react';
import {
  X,
  Settings,
  Link,
  Shield,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Info,
  ExternalLink,
  Code,
  Palette
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../services/storageService';
import { testN8nConnection } from '../services/n8nService';
import ThemeSelector from './ThemeSelector';

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenWorkflowGuide,
  currentTheme,
  onChangeTheme
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('webhook'); // 'webhook' | 'payload' | 'advanced' | 'appearance'
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 600);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const result = await testN8nConnection(formData);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all settings to default configuration?')) {
      setFormData({ ...DEFAULT_SETTINGS });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="modal-title">n8n Webhook Settings</h2>
              <p className="modal-subtitle">Configure endpoint, authentication headers, themes, and workflow payload</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button
            onClick={() => setActiveTab('webhook')}
            className={`tab-btn ${activeTab === 'webhook' ? 'tab-active' : ''}`}
          >
            <Link size={15} />
            <span>Webhook</span>
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`tab-btn ${activeTab === 'payload' ? 'tab-active' : ''}`}
          >
            <Sliders size={15} />
            <span>Payload & Agent</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`tab-btn ${activeTab === 'appearance' ? 'tab-active' : ''}`}
          >
            <Palette size={15} />
            <span>Themes & Style</span>
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`tab-btn ${activeTab === 'advanced' ? 'tab-active' : ''}`}
          >
            <Shield size={15} />
            <span>Security & Behavior</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body settings-scroll-body">
          {/* TAB 1: WEBHOOK CONNECTION */}
          {activeTab === 'webhook' && (
            <div className="settings-section">
              {/* Mock Mode Alert Banner */}
              <div className="mock-mode-toggle-card">
                <div className="mock-toggle-info">
                  <div className="mock-title-row">
                    <Sparkles size={16} className="text-amber-400" />
                    <strong>Demo / Mock Simulation Mode</strong>
                  </div>
                  <p>When enabled, simulates intelligent responses without contacting live n8n.</p>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={formData.mockMode}
                    onChange={(e) => handleChange('mockMode', e.target.checked)}
                  />
                  <span className="slider-round"></span>
                </label>
              </div>

              {/* Webhook URL Input */}
              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="webhookUrl" className="form-label">
                    n8n Webhook URL
                  </label>
                  <button
                    type="button"
                    onClick={onOpenWorkflowGuide}
                    className="form-helper-link"
                  >
                    Need a webhook URL? View Blueprint <ExternalLink size={12} />
                  </button>
                </div>
                <div className="input-with-icon">
                  <Link size={16} className="input-leading-icon" />
                  <input
                    id="webhookUrl"
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => handleChange('webhookUrl', e.target.value)}
                    placeholder="http://localhost:5678/webhook/chatbot"
                    className="form-input with-icon"
                  />
                </div>
                <span className="form-caption">
                  Use either the <strong>Production URL</strong> (<code>.../webhook/chatbot</code>) or <strong>Test URL</strong> (<code>.../webhook-test/chatbot</code>).
                </span>
              </div>

              {/* HTTP Method */}
              <div className="form-group">
                <label className="form-label">HTTP Method</label>
                <div className="radio-group-row">
                  {['POST', 'GET'].map((method) => (
                    <label
                      key={method}
                      className={`radio-card ${formData.httpMethod === method ? 'radio-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="httpMethod"
                        value={method}
                        checked={formData.httpMethod === method}
                        onChange={() => handleChange('httpMethod', method)}
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Test Ping Section */}
              <div className="test-connection-box">
                <div className="test-box-header">
                  <div>
                    <strong>Connection Diagnostic</strong>
                    <p className="test-box-sub">Send a lightweight ping to verify your n8n workflow reachability</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !formData.webhookUrl}
                    className="btn-test-ping"
                  >
                    {isTesting ? (
                      <span className="spinner-loader" />
                    ) : (
                      <>
                        <Play size={14} />
                        <span>Test Ping</span>
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div className={`test-result-banner ${testResult.success ? 'test-success' : 'test-failure'}`}>
                    <div className="test-result-icon">
                      {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div className="test-result-body">
                      <div className="test-result-title">{testResult.message}</div>
                      {testResult.dataPreview && (
                        <pre className="test-json-preview">{testResult.dataPreview}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PAYLOAD & AGENT */}
          {activeTab === 'payload' && (
            <div className="settings-section">
              {/* Payload Format Presets */}
              <div className="form-group">
                <label className="form-label">Webhook Payload Format</label>
                <div className="preset-cards-grid">
                  <div
                    onClick={() => handleChange('payloadFormat', 'chatTrigger')}
                    className={`preset-card ${formData.payloadFormat === 'chatTrigger' ? 'preset-active' : ''}`}
                  >
                    <div className="preset-badge">Standard</div>
                    <h4>n8n Chatbot Webhook</h4>
                    <p>Sends <code>{`{ "message": "...", "sessionId": "..." }`}</code> — directly matches your n8n AI Agent and Buffer Memory.</p>
                  </div>

                  <div
                    onClick={() => handleChange('payloadFormat', 'agent')}
                    className={`preset-card ${formData.payloadFormat === 'agent' ? 'preset-active' : ''}`}
                  >
                    <div className="preset-badge">Recommended</div>
                    <h4>LangChain AI Agent</h4>
                    <p>Includes conversation history memory, system instructions, and attachments array.</p>
                  </div>

                  <div
                    onClick={() => handleChange('payloadFormat', 'custom')}
                    className={`preset-card ${formData.payloadFormat === 'custom' ? 'preset-active' : ''}`}
                  >
                    <div className="preset-badge">Advanced</div>
                    <h4>Custom JSON Schema</h4>
                    <p>Customize exact JSON keys with dynamic template placeholders.</p>
                  </div>
                </div>
              </div>

              {/* Custom Payload Template editor */}
              {formData.payloadFormat === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Custom Payload Template (JSON)</label>
                  <textarea
                    rows={5}
                    value={formData.customPayloadTemplate}
                    onChange={(e) => handleChange('customPayloadTemplate', e.target.value)}
                    className="form-textarea code-font"
                  />
                  <span className="form-caption">
                    Available variables: <code>{'{{message}}'}</code>, <code>{'{{sessionId}}'}</code>, <code>{'{{attachments}}'}</code>
                  </span>
                </div>
              )}

              {/* System Prompt */}
              <div className="form-group">
                <label className="form-label">System Prompt Override</label>
                <textarea
                  rows={3}
                  value={formData.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  placeholder="e.g. You are a senior software architect specializing in cloud infrastructure..."
                  className="form-textarea"
                />
                <span className="form-caption">
                  Sent with the payload to guide the personality or role of your n8n AI Agent.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="settings-section">
              {/* Authentication Type */}
              <div className="form-group">
                <label className="form-label">Authentication Header</label>
                <div className="auth-type-selector">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'bearer', label: 'Bearer Token' },
                    { id: 'header', label: 'Custom Header / API Key' }
                  ].map((auth) => (
                    <button
                      key={auth.id}
                      type="button"
                      onClick={() => handleChange('authType', auth.id)}
                      className={`auth-type-pill ${formData.authType === auth.id ? 'active' : ''}`}
                    >
                      {auth.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.authType === 'bearer' && (
                <div className="form-group">
                  <label className="form-label">Bearer Token</label>
                  <input
                    type="password"
                    value={formData.authToken}
                    onChange={(e) => handleChange('authToken', e.target.value)}
                    placeholder="Enter secret bearer token..."
                    className="form-input"
                  />
                </div>
              )}

              {formData.authType === 'header' && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Header Key</label>
                    <input
                      type="text"
                      value={formData.customHeaderName}
                      onChange={(e) => handleChange('customHeaderName', e.target.value)}
                      placeholder="e.g. X-N8N-API-KEY"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Header Value</label>
                    <input
                      type="password"
                      value={formData.customHeaderValue}
                      onChange={(e) => handleChange('customHeaderValue', e.target.value)}
                      placeholder="Secret API key..."
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* Timeout */}
              <div className="form-group">
                <div className="form-label-row">
                  <label className="form-label">Workflow Timeout (Seconds)</label>
                  <span className="slider-value-badge">{formData.timeoutSeconds || 45}s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={120}
                  step={5}
                  value={formData.timeoutSeconds || 45}
                  onChange={(e) => handleChange('timeoutSeconds', Number(e.target.value))}
                  className="form-range-slider"
                />
                <span className="form-caption">
                  Allows n8n AI workflows and agent tool executions sufficient time to complete without timing out.
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: THEMES & APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <h4 className="settings-section-title">Luxury Color Themes</h4>
                <p className="settings-section-desc">
                  Select a theme designed with high-contrast typography, frosted glassmorphism, and custom ambient glows.
                </p>
              </div>

              {/* Theme Grid */}
              <ThemeSelector
                currentTheme={currentTheme}
                onChangeTheme={onChangeTheme}
                layout="grid"
              />

              <div className="appearance-toggles-grid">
                {/* Auto Scroll Toggle */}
                <div className="setting-toggle-card">
                  <div className="toggle-meta">
                    <span className="toggle-title">Smooth Auto-Scroll</span>
                    <span className="toggle-desc">Automatically scroll down as new tokens and responses stream in</span>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      checked={formData.autoScroll !== false}
                      onChange={(e) => handleChange('autoScroll', e.target.checked)}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>

                {/* Simulated Streaming Toggle */}
                <div className="setting-toggle-card">
                  <div className="toggle-meta">
                    <span className="toggle-title">Simulate Natural Streaming</span>
                    <span className="toggle-desc">Render incoming n8n replies with human-paced natural typing rhythm</span>
                  </div>
                  <label className="switch-toggle">
                    <input
                      type="checkbox"
                      checked={formData.streamSimulation !== false}
                      onChange={(e) => handleChange('streamSimulation', e.target.checked)}
                    />
                    <span className="slider-round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn-modal-secondary text-muted"
            title="Reset to defaults"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <div className="footer-right-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-modal-primary"
            >
              {saveToast ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
