/**
 * SiteAgent Chat Widget
 * Floating AI chat assistant for any website
 * 
 * Usage:
 *   <script>
 *     window.SiteAgentConfig = {
 *       apiKey: 'your-api-key',
 *       serverUrl: 'https://your-siteagent-server.com',
 *       tenantId: 'your-tenant-id'
 *     };
 *   </script>
 *   <script src="https://cdn.example.com/siteagent.min.js"></script>
 */

(function() {
  'use strict';

  const CONFIG = window.SiteAgentConfig || {};
  // const DEFAULT_SERVER_URL = 'http://localhost:3000';
  const DEFAULT_SERVER_URL = 'https://siteagent-mcp.mcpize.run';
  const SERVER_URL = CONFIG.serverUrl || DEFAULT_SERVER_URL;
  const API_KEY = CONFIG.apiKey || 'default-api-key';
  const TENANT_ID = CONFIG.tenantId || 'default-tenant';
  
  let sessionId = localStorage.getItem('siteagent_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('siteagent_session_id', sessionId);
  }

  // ============================================================================
  // STYLES — Injected at runtime
  // ============================================================================
  const WIDGET_STYLES = `
    #siteagent-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      z-index: 999999;
    }

    #siteagent-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #siteagent-widget-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    #siteagent-widget-button:active {
      transform: scale(0.95);
    }

    #siteagent-widget-button.open {
      background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    }

    #siteagent-widget-bubble {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 400px;
      max-width: 90vw;
      height: 600px;
      max-height: 80vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      display: flex;
      flex-direction: column;
      opacity: 0;
      transform: scale(0.95) translateY(10px);
      pointer-events: none;
      transition: all 0.3s ease;
    }

    #siteagent-widget-bubble.open {
      opacity: 1;
      transform: scale(1) translateY(0);
      pointer-events: auto;
    }

    #siteagent-widget-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    #siteagent-widget-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    #siteagent-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }

    #siteagent-widget-close:hover {
      transform: rotate(90deg);
    }

    #siteagent-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f5f5f5;
    }

    .siteagent-message {
      display: flex;
      gap: 8px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .siteagent-message.user {
      justify-content: flex-end;
    }

    .siteagent-message-content {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .siteagent-message.user .siteagent-message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 4px 12px 12px;
    }

    .siteagent-message.assistant .siteagent-message-content {
      background: white;
      color: #333;
      border: 1px solid #e0e0e0;
      border-radius: 4px 12px 12px 12px;
    }

    .siteagent-message.error .siteagent-message-content {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ef5350;
    }

    .siteagent-loading {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e0e0e0;
    }

    .siteagent-loading-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: siteagent-bounce 1.4s infinite;
    }

    .siteagent-loading-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .siteagent-loading-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes siteagent-bounce {
      0%, 80%, 100% {
        opacity: 0.4;
        transform: translateY(0);
      }
      40% {
        opacity: 1;
        transform: translateY(-8px);
      }
    }

    #siteagent-widget-input-area {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      gap: 8px;
      background: white;
      border-radius: 0 0 12px 12px;
    }

    #siteagent-widget-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    }

    #siteagent-widget-input:focus {
      border-color: #667eea;
    }

    #siteagent-widget-input::placeholder {
      color: #999;
    }

    #siteagent-widget-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      transition: transform 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #siteagent-widget-send:hover:not(:disabled) {
      transform: scale(1.05);
    }

    #siteagent-widget-send:active:not(:disabled) {
      transform: scale(0.95);
    }

    #siteagent-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Scrollbar styling */
    #siteagent-widget-messages::-webkit-scrollbar {
      width: 6px;
    }

    #siteagent-widget-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    #siteagent-widget-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }

    #siteagent-widget-messages::-webkit-scrollbar-thumb:hover {
      background: #999;
    }

    /* Mobile responsiveness */
    @media (max-width: 480px) {
      #siteagent-widget-bubble {
        width: 100%;
        height: 100vh;
        max-height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }

      #siteagent-widget-header {
        border-radius: 0;
      }

      #siteagent-widget-input-area {
        border-radius: 0;
      }

      .siteagent-message-content {
        max-width: 85%;
      }
    }
  `;

  // ============================================================================
  // WIDGET CLASS
  // ============================================================================
  class SiteAgentWidget {
    constructor() {
      this.isOpen = false;
      this.isLoading = false;
      this.messages = [];
      this.init();
    }

    init() {
      this.injectStyles();
      this.createDOM();
      this.attachEventListeners();
      this.loadConversationHistory();
    }

    injectStyles() {
      const style = document.createElement('style');
      style.textContent = WIDGET_STYLES;
      document.head.appendChild(style);
    }

    createDOM() {
      const container = document.createElement('div');
      container.id = 'siteagent-widget-container';

      container.innerHTML = `
        <button id="siteagent-widget-button" title="Chat with SiteAgent">
          💬
        </button>
        <div id="siteagent-widget-bubble">
          <div id="siteagent-widget-header">
            <h3>SiteAgent Assistant</h3>
            <button id="siteagent-widget-close" title="Close">&times;</button>
          </div>
          <div id="siteagent-widget-messages"></div>
          <div id="siteagent-widget-input-area">
            <input
              id="siteagent-widget-input"
              type="text"
              placeholder="Ask me anything..."
              autocomplete="off"
            />
            <button id="siteagent-widget-send" title="Send">➤</button>
          </div>
        </div>
      `;

      document.body.appendChild(container);
    }

    attachEventListeners() {
      const button = document.getElementById('siteagent-widget-button');
      const closeBtn = document.getElementById('siteagent-widget-close');
      const input = document.getElementById('siteagent-widget-input');
      const sendBtn = document.getElementById('siteagent-widget-send');

      button.addEventListener('click', () => this.toggle());
      closeBtn.addEventListener('click', () => this.close());
      sendBtn.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.isOpen = true;
      document.getElementById('siteagent-widget-button').classList.add('open');
      document.getElementById('siteagent-widget-bubble').classList.add('open');
      document.getElementById('siteagent-widget-input').focus();
    }

    close() {
      this.isOpen = false;
      document.getElementById('siteagent-widget-button').classList.remove('open');
      document.getElementById('siteagent-widget-bubble').classList.remove('open');
    }

    async sendMessage() {
      const input = document.getElementById('siteagent-widget-input');
      const message = input.value.trim();

      if (!message || this.isLoading) return;

      // Add user message to UI
      this.addMessage('user', message);
      input.value = '';

      // Show loading indicator
      this.setLoading(true);

      try {
        // Call /mcp endpoint via MCP JSON-RPC 2.0
        const mcpResponse = await this.callChatProxy({
          message,
          session_id: sessionId,
          tenant_id: TENANT_ID,
          url: window.location.href,
        });

        // Parse MCP response with 4-level fallback
        const result = mcpResponse?.result;
        let assistantMessage;

        // 1st try: structuredContent.response_text (clean, pre-parsed object)
        if (result?.structuredContent?.response_text) {
          assistantMessage = result.structuredContent.response_text;
        } else {
          // 2nd try: content[0].text may be a JSON string — parse it
          const rawText = result?.content?.[0]?.text;
          if (rawText) {
            try {
              const parsed = JSON.parse(rawText);
              if (parsed?.response_text) {
                // JSON string containing { response_text: "..." }
                assistantMessage = parsed.response_text;
              } else {
                // 3rd try: content[0].text directly (already a plain string)
                assistantMessage = rawText;
              }
            } catch (_) {
              // 3rd try: not JSON, use the raw text as-is
              assistantMessage = rawText;
            }
          } else {
            // 4th try: hard fallback
            assistantMessage = 'Sorry, I could not process your request.';
          }
        }

        // Add assistant message to UI
        this.addMessage('assistant', assistantMessage);

        // Update session ID if server returned a new one inside structured content
        const newSessionId = result?.structuredContent?.session_id;
        if (newSessionId) {
          sessionId = newSessionId;
          localStorage.setItem('siteagent_session_id', sessionId);
        }
      } catch (error) {
        console.error('SiteAgent error:', error);
        this.addMessage('error', 'Unable to process your request. Please try again.');
      } finally {
        this.setLoading(false);
      }
    }

    async callChatProxy(payload) {
      // Build MCP JSON-RPC 2.0 request
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'generate_response',
          arguments: {
            user_message: payload.message,
            session_id: payload.session_id,
            tenant_id: payload.tenant_id,
            url: payload.url,
            search_results: '',
          },
        },
      };

      console.log('[Widget] Sending MCP JSON-RPC to /mcp:', mcpRequest);
      const response = await fetch(`${SERVER_URL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(mcpRequest),
      });

      console.log('[Widget] Response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Widget] Error response:', errorBody);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Widget] MCP Response data:', data);

      // Surface JSON-RPC error as a thrown exception
      if (data.error) {
        throw new Error(data.error.message || 'MCP JSON-RPC error');
      }

      return data;
    }

    buildResponse(contextData, searchData) {
      // First check if detect_context generated a response
      if (contextData?.response_text) {
        return contextData.response_text;
      }

      // Fallback: Build a natural response based on context and search results
      let response = '';

      // Use context to tailor the response tone
      const tone = contextData.suggested_response_tone || 'helpful';

      // Add search results if available
      if (searchData?.results && searchData.results.length > 0) {
        response += 'Based on our knowledge base:\n\n';
        searchData.results.slice(0, 2).forEach((result, i) => {
          const content = result.content || result.content_text || '';
          response += `• ${content.substring(0, 100)}...\n`;
        });
        response += '\nIs there anything specific you\'d like to know more about?';
      } else {
        // Default response based on intent
        const intent = contextData.intent || 'browsing';
        const responses = {
          browsing: 'I\'m here to help you navigate this site. Feel free to ask me any questions!',
          searching: 'I couldn\'t find specific information about that. Try rephrasing your question?',
          purchasing: 'I can help with your purchase! What would you like to know?',
          support: 'I\'m ready to help. What\'s the issue?',
          default: 'How can I assist you today?',
        };
        response = responses[intent] || responses.default;
      }

      return response;
    }

    addMessage(role, content) {
      const messagesDiv = document.getElementById('siteagent-widget-messages');
      
      const messageEl = document.createElement('div');
      messageEl.className = `siteagent-message ${role}`;

      const contentEl = document.createElement('div');
      contentEl.className = 'siteagent-message-content';
      contentEl.textContent = content;

      messageEl.appendChild(contentEl);
      messagesDiv.appendChild(messageEl);

      // Scroll to bottom
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      // Store message in local state
      this.messages.push({ role, content, timestamp: new Date().toISOString() });
    }

    setLoading(isLoading) {
      this.isLoading = isLoading;
      const messagesDiv = document.getElementById('siteagent-widget-messages');
      const existingLoader = messagesDiv.querySelector('.siteagent-loading');

      if (isLoading) {
        if (!existingLoader) {
          const loader = document.createElement('div');
          loader.className = 'siteagent-loading';
          loader.innerHTML = '<div class="siteagent-loading-dot"></div><div class="siteagent-loading-dot"></div><div class="siteagent-loading-dot"></div>';
          messagesDiv.appendChild(loader);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      } else {
        if (existingLoader) {
          existingLoader.remove();
        }
      }

      // Update send button state
      const sendBtn = document.getElementById('siteagent-widget-send');
      const input = document.getElementById('siteagent-widget-input');
      sendBtn.disabled = isLoading;
      input.disabled = isLoading;
    }

    async loadConversationHistory() {
      try {
        const mcpRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_user_context',
            arguments: {
              tenant_id: TENANT_ID,
              session_id: sessionId,
            },
          },
        };

        console.log('[Widget] Loading conversation history for session:', sessionId);

        const response = await fetch(`${SERVER_URL}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(mcpRequest),
        });

        if (!response.ok) {
          console.warn('[Widget] History load failed with status:', response.status);
          return;
        }

        const data = await response.json();

        if (data.error) {
          console.warn('[Widget] History MCP error:', data.error.message);
          return;
        }

        const result = data?.result;

        // Parse messages: structuredContent.messages OR JSON.parse(content[0].text).messages
        let messages = result?.structuredContent?.messages;
        if (!messages) {
          const rawText = result?.content?.[0]?.text;
          if (rawText) {
            try {
              messages = JSON.parse(rawText)?.messages;
            } catch (_) {
              // Not JSON — nothing to display
            }
          }
        }

        if (!Array.isArray(messages) || messages.length === 0) {
          console.log('[Widget] No previous conversation history found.');
          return;
        }

        console.log(`[Widget] Restoring ${messages.length} previous messages.`);
        messages.forEach((msg) => {
          const role = msg.role === 'user' ? 'user' : 'assistant';
          const content = msg.content || msg.text || msg.message || '';
          if (content) this.addMessage(role, content);
        });
      } catch (error) {
        // Silent fail — don't break the widget if history can't be loaded
        console.warn('[Widget] Could not load conversation history:', error.message);
      }
    }
  }

  // ============================================================================
  // INITIALIZE
  // ============================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.SiteAgent = new SiteAgentWidget();
    });
  } else {
    window.SiteAgent = new SiteAgentWidget();
  }
})();
