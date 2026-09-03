import React, { useState } from 'react';
import {
  X,
  Workflow,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { CodeBlock } from './MarkdownRenderer';

export const WorkflowGuideModal = ({ isOpen, onClose, onConfigureWebhook }) => {
  if (!isOpen) return null;

  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  // Exact matching n8n workflow JSON ready for direct copy-paste into n8n canvas
  const sampleN8nWorkflow = JSON.stringify(
    {
      "nodes": [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "chatbot",
            "responseMode": "responseNode",
            "options": {}
          },
          "id": "7d6d7f84-d9a5-4a11-9909-1e09c7c95d39",
          "name": "Webhook",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 2,
          "position": [0, 0],
          "webhookId": "chatbot-webhook"
        },
        {
          "parameters": {
            "promptType": "define",
            "text": "={{ $json.body.message }}",
            "options": {
              "systemMessage": "You are a helpful, friendly assistant. Answer clearly and concisely."
            }
          },
          "id": "76e645b2-6385-49a1-b434-e4bbe2763fd7",
          "name": "AI Agent",
          "type": "@n8n/n8n-nodes-langchain.agent",
          "typeVersion": 1.7,
          "position": [400, 0]
        },
        {
          "parameters": {
            "options": {
              "temperature": 0.7
            }
          },
          "id": "63ad474d-fdcd-4b59-943b-6d686ce3dab3",
          "name": "OpenAI Chat Model",
          "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
          "typeVersion": 1,
          "position": [160, 336]
        },
        {
          "parameters": {
            "sessionIdType": "customKey",
            "sessionKey": "={{ $json.body.sessionId || 'default-session' }}",
            "contextWindowLength": 10
          },
          "id": "1f02b99e-a30b-4502-91ac-fa9ed690a829",
          "name": "Window Buffer Memory",
          "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
          "typeVersion": 1.3,
          "position": [672, 304]
        },
        {
          "parameters": {
            "respondWith": "json",
            "responseBody": "={{ { \"reply\": $json.output } }}",
            "options": {}
          },
          "id": "f6ffbd2a-4d39-46cf-be72-b106d1d012ad",
          "name": "Respond to Webhook",
          "type": "n8n-nodes-base.respondToWebhook",
          "typeVersion": 1.1,
          "position": [800, 0]
        }
      ],
      "connections": {
        "Webhook": {
          "main": [
            [
              {
                "node": "AI Agent",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "AI Agent": {
          "main": [
            [
              {
                "node": "Respond to Webhook",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "OpenAI Chat Model": {
          "ai_languageModel": [
            [
              {
                "node": "AI Agent",
                "type": "ai_languageModel",
                "index": 0
              }
            ]
          ]
        },
        "Window Buffer Memory": {
          "ai_memory": [
            [
              {
                "node": "AI Agent",
                "type": "ai_memory",
                "index": 0
              }
            ]
          ]
        }
      },
      "pinData": {}
    },
    null,
    2
  );

  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(sampleN8nWorkflow);
      setCopiedWorkflow(true);
      setTimeout(() => setCopiedWorkflow(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container blueprint-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge blueprint-badge">
              <Workflow size={20} />
            </div>
            <div>
              <h2 className="modal-title">n8n Workflow Blueprint</h2>
              <p className="modal-subtitle">Step-by-step architecture to create and connect your n8n AI workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body blueprint-body-scroll">
          {/* Visual Architecture Flow */}
          <div className="workflow-flow-diagram">
            <div className="flow-step-node">
              <div className="node-icon-box bg-indigo-glow">
                <Zap size={18} />
              </div>
              <span className="node-title">1. Webhook (/chatbot)</span>
              <span className="node-sub">Receives <code>message</code> & <code>sessionId</code></span>
            </div>

            <ArrowRight size={20} className="flow-arrow-icon" />

            <div className="flow-step-node">
              <div className="node-icon-box bg-purple-glow">
                <Bot size={18} />
              </div>
              <span className="node-title">2. AI Agent + Memory</span>
              <span className="node-sub">OpenAI Chat Model (Buffer 10)</span>
            </div>

            <ArrowRight size={20} className="flow-arrow-icon" />

            <div className="flow-step-node">
              <div className="node-icon-box bg-emerald-glow">
                <CheckCircle2 size={18} />
              </div>
              <span className="node-title">3. Respond to Webhook</span>
              <span className="node-sub">Returns <code>{`{ "reply": ... }`}</code></span>
            </div>
          </div>

          {/* Quick Copy Section */}
          <div className="blueprint-import-banner">
            <div className="blueprint-banner-text">
              <h4>📋 Instant n8n Import</h4>
              <p>Copy this JSON, open your n8n workflow editor, and press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>) to paste the entire ready-to-run workflow!</p>
            </div>
            <button
              type="button"
              onClick={handleCopyWorkflow}
              className="btn-copy-blueprint"
            >
              {copiedWorkflow ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>Copied Workflow JSON!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy n8n Workflow JSON</span>
                </>
              )}
            </button>
          </div>

          {/* Step by Step Details */}
          <div className="guide-steps-list">
            <div className="guide-step-card">
              <div className="step-num">1</div>
              <div className="step-content">
                <h5>Configure Webhook Node</h5>
                <ul>
                  <li>HTTP Method: <strong>POST</strong></li>
                  <li>Path: <strong>chatbot</strong> (e.g. <code>https://your-n8n/webhook/chatbot</code>)</li>
                  <li>Respond: <strong>Using 'Respond to Webhook' Node</strong></li>
                </ul>
              </div>
            </div>

            <div className="guide-step-card">
              <div className="step-num">2</div>
              <div className="step-content">
                <h5>AI Agent & Window Buffer Memory</h5>
                <ul>
                  <li>Prompt: <code>{"={{ $json.body.message }}"}</code></li>
                  <li>Memory Session Key: <code>{"={{ $json.body.sessionId || 'default-session' }}"}</code></li>
                  <li>Context Window Length: <strong>10</strong></li>
                </ul>
              </div>
            </div>

            <div className="guide-step-card">
              <div className="step-num">3</div>
              <div className="step-content">
                <h5>Respond to Webhook</h5>
                <ul>
                  <li>Respond With: <strong>JSON</strong></li>
                  <li>Response Body: <code>{`={{ { "reply": $json.output } }}`}</code></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Workflow JSON preview */}
          <div className="blueprint-code-section">
            <label className="section-label">Workflow JSON Template</label>
            <CodeBlock language="json" code={sampleN8nWorkflow} />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-modal-secondary">
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              if (onConfigureWebhook) onConfigureWebhook();
            }}
            className="btn-modal-primary"
          >
            Configure Webhook URL Now <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowGuideModal;
