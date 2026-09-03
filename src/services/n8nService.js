// Service for n8n Webhook communication, formatting payloads, handling auth, and parsing responses

/**
 * Extracts clean textual response and metadata from diverse n8n output formats
 */
export const extractN8nResponse = (data) => {
  if (data === null || data === undefined) {
    return { text: 'No response received from workflow.', raw: data };
  }

  // If response is a direct string
  if (typeof data === 'string') {
    return { text: data, raw: data };
  }

  // If response is an array (typical for n8n node list output)
  if (Array.isArray(data)) {
    if (data.length === 0) return { text: 'Received empty array from n8n.', raw: data };
    const first = data[0];
    if (typeof first === 'string') return { text: first, raw: data };
    if (first && typeof first === 'object') {
      return extractN8nResponse(first.json || first);
    }
  }

  // If response is an object with nested .json property (common in n8n)
  const target = data.json ? data.json : data;

  // Search for common AI agent / chat output keys
  const candidateKeys = [
    'reply',
    'output',
    'response',
    'text',
    'message',
    'content',
    'answer',
    'result',
    'data'
  ];

  for (const key of candidateKeys) {
    if (target[key] !== undefined && target[key] !== null) {
      const val = target[key];
      if (typeof val === 'string') {
        return {
          text: val,
          suggestions: target.suggestions || target.suggestedPrompts || null,
          sources: target.sources || target.citations || null,
          raw: data
        };
      }
      if (typeof val === 'object') {
        // If nested object
        if (val.text || val.content || val.output) {
          return {
            text: val.text || val.content || val.output,
            suggestions: target.suggestions || null,
            sources: target.sources || null,
            raw: data
          };
        }
        return { text: JSON.stringify(val, null, 2), raw: data };
      }
      return { text: String(val), raw: data };
    }
  }

  // If no known key, stringify nicely or look for first string property
  const stringProps = Object.keys(target).filter(k => typeof target[k] === 'string');
  if (stringProps.length === 1) {
    return { text: target[stringProps[0]], raw: data };
  }

  return {
    text: typeof target === 'object' ? '```json\n' + JSON.stringify(target, null, 2) + '\n```' : String(target),
    raw: data
  };
};

/**
 * Sends a message to the configured n8n Webhook
 */
export const sendMessageToN8n = async ({
  message,
  session,
  settings,
  attachments = [],
  signal = null,
}) => {
  const startTime = performance.now();

  // If mock mode is enabled or webhook URL is not provided
  if (settings.mockMode || !settings.webhookUrl?.trim()) {
    const mockRes = await mockN8nWorkflow({ message, session, settings, attachments, signal });
    const latency = ((performance.now() - startTime) / 1000).toFixed(2);
    return { ...mockRes, latency };
  }

  const url = settings.webhookUrl.trim();
  const method = (settings.httpMethod || 'POST').toUpperCase();

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*'
  };

  if (settings.authType === 'bearer' && settings.authToken) {
    headers['Authorization'] = `Bearer ${settings.authToken.trim()}`;
  } else if (settings.authType === 'header' && settings.customHeaderName && settings.customHeaderValue) {
    headers[settings.customHeaderName.trim()] = settings.customHeaderValue.trim();
  }

  // Format payload
  let payloadBody;
  if (settings.payloadFormat === 'agent') {
    // Extended format for LangChain / AI Agent workflows with conversation history
    payloadBody = {
      message: message,
      chatInput: message,
      sessionId: session.id,
      systemPrompt: settings.systemPrompt,
      history: (session.messages || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: m.content
        })),
      attachments: attachments.map(att => ({
        name: att.name,
        type: att.type,
        size: att.size,
        data: att.data // base64
      })),
      timestamp: new Date().toISOString()
    };
  } else if (settings.payloadFormat === 'custom' && settings.customPayloadTemplate) {
    // Custom JSON template substitution
    try {
      const templated = settings.customPayloadTemplate
        .replace(/\{\{message\}\}/g, JSON.stringify(message).slice(1, -1))
        .replace(/\{\{sessionId\}\}/g, session.id)
        .replace(/\{\{attachments\}\}/g, JSON.stringify(attachments));
      payloadBody = JSON.parse(templated);
    } catch {
      payloadBody = { message: message, chatInput: message, sessionId: session.id };
    }
  } else {
    // Standard n8n Chatbot format (matches {{ $json.body.message }} and {{ $json.body.sessionId }})
    payloadBody = {
      message: message,
      chatInput: message,
      sessionId: session.id,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toISOString()
    };
  }

  // Fetch with timeout
  const timeoutMs = (settings.timeoutSeconds || 45) * 1000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    const fetchSignal = signal
      ? anySignal([signal, timeoutController.signal])
      : timeoutController.signal;

    const fetchOptions = {
      method,
      headers,
      signal: fetchSignal
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(payloadBody);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const latency = ((performance.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status} (${response.statusText})`;
      try {
        const errJson = await response.json();
        if (errJson.message || errJson.error) {
          errorDetail += `: ${errJson.message || errJson.error}`;
        }
      } catch {
        const errText = await response.text();
        if (errText) errorDetail += `: ${errText.slice(0, 150)}`;
      }
      throw new Error(`Webhook Error: ${errorDetail}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let parsedResult;

    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      parsedResult = extractN8nResponse(jsonData);
    } else {
      const textData = await response.text();
      try {
        const jsonAttempt = JSON.parse(textData);
        parsedResult = extractN8nResponse(jsonAttempt);
      } catch {
        parsedResult = { text: textData, raw: textData };
      }
    }

    return {
      text: parsedResult.text,
      suggestions: parsedResult.suggestions,
      sources: parsedResult.sources,
      latency,
      raw: parsedResult.raw,
      status: 'success'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = ((performance.now() - startTime) / 1000).toFixed(2);

    if (err.name === 'AbortError') {
      if (signal?.aborted) {
        throw new Error('Generation cancelled by user.');
      }
      throw new Error(`Request timed out after ${settings.timeoutSeconds || 45} seconds. Check if your n8n workflow is executing or responding.`);
    }

    // Friendly CORS / Network assistance
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error(
        `Unable to connect to n8n Webhook at "${url}". Possible reasons:\n` +
        `1. **CORS restriction**: n8n Webhook node must allow CORS. In n8n, enable "Respond to Webhook" node or configure \`N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS\` / \`WEBHOOK_URL\`.\n` +
        `2. **Workflow not active / Inactive Test URL**: If using a Test URL, make sure you clicked "Test step" or "Listen for test event" in n8n.\n` +
        `3. **Invalid URL or SSL issue**: Ensure the URL is accessible from your browser.`
      );
    }

    throw err;
  }
};

/**
 * Tests connection to the n8n webhook URL
 */
export const testN8nConnection = async (settings) => {
  if (!settings.webhookUrl?.trim()) {
    return { success: false, message: 'Please provide a valid Webhook URL.' };
  }

  const startTime = performance.now();
  try {
    const res = await fetch(settings.webhookUrl.trim(), {
      method: settings.httpMethod || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.authType === 'bearer' && settings.authToken ? { 'Authorization': `Bearer ${settings.authToken.trim()}` } : {}),
        ...(settings.authType === 'header' && settings.customHeaderName && settings.customHeaderValue ? { [settings.customHeaderName.trim()]: settings.customHeaderValue.trim() } : {})
      },
      body: JSON.stringify({
        chatInput: 'ping',
        message: 'ping',
        sessionId: 'test_connection_' + Date.now(),
        test: true
      })
    });

    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      let preview = '';
      try {
        const json = await res.json();
        preview = JSON.stringify(json, null, 2);
      } catch {
        preview = await res.text();
      }
      return {
        success: true,
        status: res.status,
        latency: `${latency}ms`,
        message: `Connected successfully! Status: ${res.status} OK (${latency}ms)`,
        dataPreview: preview.slice(0, 300)
      };
    } else {
      return {
        success: false,
        status: res.status,
        latency: `${latency}ms`,
        message: `Endpoint responded with error: ${res.status} ${res.statusText}`
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Connection failed: ${err.message}. Check URL or CORS settings.`
    };
  }
};

/**
 * Realistic Mock / Simulator for testing when n8n is offline or not configured
 */
export const mockN8nWorkflow = async ({ message, attachments, signal }) => {
  // Simulate network delay
  const delay = Math.floor(Math.random() * 600) + 700;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Generation cancelled by user.'));
      });
    }
  });

  const query = message.toLowerCase().trim();

  // Natural greeting & conversational greetings
  if (/^(hi|hello|hey|greetings|howdy|good\s(morning|afternoon|evening)|sup)/i.test(query)) {
    return {
      text: `👋 **Hello! Great to meet you!**\n\nI'm your conversational AI assistant. I'm connected to your **n8n Webhook backend**, which allows me to tap into any AI model (like OpenAI GPT-4o, Anthropic Claude, Google Gemini, or local Ollama) as well as hundreds of automation apps.\n\nHere are some things we can do together:\n- 💬 **Have a natural conversation** — brainstorm ideas, solve problems, or chat about anything\n- 💻 **Write & review code** — JavaScript, Python, SQL, React, API integrations\n- ⚡ **Trigger n8n automated workflows** — send emails, query databases, manage CRM leads\n\nHow can I help you today?`,
      suggestions: ['How do I connect my live n8n workflow?', 'Help me brainstorm an app idea', 'Write a Python automation script']
    };
  }

  // How are you / Personal check-in
  if (query.includes('how are you') || query.includes("how's it going") || query.includes('who are you')) {
    return {
      text: `I'm doing fantastic, thank you for asking! 😊\n\nI'm an AI chatbot interface specifically built to communicate with **n8n Webhooks** and AI Agent workflows. With n8n as the backend, I can remember our conversation history across multiple turns, access custom databases, and run real-world actions for you.\n\nIs there a project or task you're currently working on?`,
      suggestions: ['Show me how n8n AI Agent works', 'Let\'s write some code', 'View n8n Workflow Blueprint']
    };
  }

  if (query.includes('table') || query.includes('data') || query.includes('compare')) {
    return {
      text: `### 📊 Data Comparison Matrix\n\nHere is a structured comparison table processed through n8n workflow nodes:\n\n| Feature | n8n Webhook Chatbot | Standard Chat Widget |\n| :--- | :--- | :--- |\n| **Workflow Automation** | ⚡ Full n8n Node Ecosystem | ❌ Rigid / Hardcoded |\n| **Model Flexibility** | 🤖 Any LLM (OpenAI, Claude, Ollama, DeepSeek) | 🔒 Locked to single vendor |\n| **Multi-Agent Orchestration** | ✅ LangChain + Tools + Vector Store | ❌ Basic completions only |\n| **Data Privacy** | 🛡️ Self-hosted / On-Premise Support | ☁️ Cloud only |\n| **Custom Authentication** | 🔑 Bearer & Custom Headers | ⚠️ Limited |\n\n> [!TIP]\n> You can trigger custom CRM lookups, database queries, and Slack notifications right inside your n8n workflow!`,
      suggestions: ['How do I set up n8n Webhook?', 'Show me code example', 'Explain LangChain Agent']
    };
  }

  if (query.includes('code') || query.includes('python') || query.includes('javascript') || query.includes('curl')) {
    return {
      text: `Here is how you can send payloads to your n8n Webhook using **JavaScript (Fetch)** and **cURL**:\n\n` +
        `\`\`\`javascript\n// JavaScript Webhook Dispatcher\nasync function triggerN8nWorkflow(userMessage, sessionId) {\n  const response = await fetch('https://your-n8n.instance/webhook/chat', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n      'Authorization': 'Bearer YOUR_SECRET_TOKEN'\n    },\n    body: JSON.stringify({\n      chatInput: userMessage,\n      sessionId: sessionId,\n      timestamp: new Date().toISOString()\n    })\n  });\n\n  const data = await response.json();\n  console.log('n8n Response:', data.output);\n  return data;\n}\n\`\`\`\n\nAnd via **cURL**:\n\n` +
        `\`\`\`bash\ncurl -X POST "https://your-n8n.instance/webhook/chat" \\\n  -H "Content-Type: application/json" \\\n  -d '{"chatInput": "Hello n8n Agent!", "sessionId": "session_123"}'\n\`\`\`\n\n> [!NOTE]\n> Ensure you return a **Respond to Webhook** node at the end of your n8n workflow!`,
      suggestions: ['Test Webhook Connection', 'Download n8n Template', 'How to handle CORS']
    };
  }

  if (attachments && attachments.length > 0) {
    return {
      text: `📎 **File Received & Processed!**\n\nI received **${attachments.length} attachment(s)** in the payload:\n\n` +
        attachments.map(a => `- **${a.name}** (${(a.size / 1024).toFixed(1)} KB, \`${a.type}\`)`).join('\n') +
        `\n\nIn your n8n workflow, these files can be passed directly to vision models (GPT-4o, Gemini 2.0 Flash) or parsed via document extraction nodes (PDF, CSV, JSON).`,
      suggestions: ['Extract text from document', 'Analyze image', 'Summarize contents']
    };
  }

  return {
    text: `⚡ **n8n Workflow Response** *(Mock Mode)*\n\nI processed your prompt: **"${message}"**.\n\nYour React Chatbot is fully ready to connect with your live **n8n AI Agent Workflow**!\n\n### Next Steps to Connect Live n8n:\n1. Open **⚙️ Settings** (top right or sidebar).\n2. Enter your n8n **Webhook URL** (e.g. \`https://your-n8n.com/webhook/chat\`).\n3. Click **Test Connection** to verify.\n4. Toggle off **Mock Mode** to receive live AI stream responses directly from your n8n nodes!\n\n> [!TIP]\n> Need the starter n8n workflow template? Check the **Workflow Blueprint** modal in settings to copy the exact node JSON setup.`,
    suggestions: ['Open Webhook Settings', 'How to configure n8n nodes', 'Show sample JSON']
  };
};

/**
 * Polyfill helper for combining AbortSignals
 */
function anySignal(signals) {
  const controller = new AbortController();
  function onAbort() {
    controller.abort();
    signals.forEach(s => s && s.removeEventListener('abort', onAbort));
  }
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', onAbort);
  }
  return controller.signal;
}
