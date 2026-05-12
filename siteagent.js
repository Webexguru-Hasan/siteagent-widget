(function() {
  "use strict"

  // ── 1. Guard: prevent double-loading ──────────────────
  if (window.__SiteAgentLoaded) return
  window.__SiteAgentLoaded = true

  // ── 2. Read config ────────────────────────────────────
  const cfg = window.SiteAgent || {}
  const TOKEN    = cfg.token || ""
  const POSITION = cfg.position || "bottom-right"
  const THEME    = cfg.theme || "auto"
  const COLOR    = cfg.primaryColor || "#1F4E79"
  const GREETING = cfg.greeting || null
  const PLACEHOLDER = cfg.placeholder || "Ask me anything..."
  const LEAD_CAPTURE = cfg.leadCapture !== false

  if (!TOKEN) {
    console.warn("[SiteAgent] No token configured. Widget disabled.")
    return
  }

  // Server base URL — same origin as widget.js script tag
  const scripts = document.querySelectorAll("script[src]")
  let SERVER_URL = ""
  for (const s of scripts) {
    if (s.src && s.src.includes("widget.js")) {
      const src = s.src
      if (
        src.includes("jsdelivr") ||
        src.includes("github.io") ||
        src.includes("cloudflare")
      ) {
        SERVER_URL = "https://wazidhasan-siteagent-mcp.hf.space"
      } else {
        SERVER_URL = new URL(src).origin
      }
      break
    }
  }
  if (!SERVER_URL) {
    SERVER_URL = "https://wazidhasan-siteagent-mcp.hf.space"
  }

  // ── 3. Theme detection ────────────────────────────────
  function isDarkMode() {
    if (THEME === "dark") return true
    if (THEME === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }

  // ── 4. Shadow DOM container ───────────────────────────
  const hostEl = document.createElement("div")
  hostEl.id = "siteagent-widget-host"
  document.body.appendChild(hostEl)
  const shadow = hostEl.attachShadow({ mode: "open" })

  // ── 5. Inject CSS into shadow DOM ─────────────────────
  const styleEl = document.createElement("style")
  styleEl.textContent = ":host {\r\n  all: initial;\r\n  font-family: -apple-system, BlinkMacSystemFont, \r\n    \"Segoe UI\", Roboto, sans-serif;\r\n}\r\n\r\n.sa-container {\r\n  --sa-primary: #1F4E79;\r\n  --sa-bg: #ffffff;\r\n  --sa-text: #1a1a1a;\r\n  --sa-border: #e5e7eb;\r\n  --sa-msg-user-bg: var(--sa-primary);\r\n  --sa-msg-user-text: #ffffff;\r\n  --sa-msg-bot-bg: #f3f4f6;\r\n  --sa-msg-bot-text: #1a1a1a;\r\n  --sa-radius: 12px;\r\n  position: fixed;\r\n  z-index: 2147483647;\r\n  font-size: 14px;\r\n  line-height: 1.5;\r\n}\r\n\r\n.sa-dark {\r\n  --sa-bg: #1e1e2e;\r\n  --sa-text: #cdd6f4;\r\n  --sa-border: #45475a;\r\n  --sa-msg-bot-bg: #313244;\r\n  --sa-msg-bot-text: #cdd6f4;\r\n}\r\n\r\n/* Position variants */\r\n.sa-bottom-right { bottom: 24px; right: 24px; }\r\n.sa-bottom-left  { bottom: 24px; left: 24px;  }\r\n.sa-top-right    { top: 24px;    right: 24px;  }\r\n.sa-top-left     { top: 24px;    left: 24px;   }\r\n\r\n/* Chat bubble button */\r\n.sa-bubble {\r\n  width: 56px;\r\n  height: 56px;\r\n  border-radius: 50%;\r\n  background: var(--sa-primary);\r\n  color: #fff;\r\n  border: none;\r\n  cursor: pointer;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  box-shadow: 0 4px 16px rgba(0,0,0,0.18);\r\n  transition: transform 0.2s, box-shadow 0.2s;\r\n}\r\n.sa-bubble:hover {\r\n  transform: scale(1.08);\r\n  box-shadow: 0 6px 20px rgba(0,0,0,0.24);\r\n}\r\n\r\n/* Chat window */\r\n.sa-window {\r\n  width: 360px;\r\n  max-width: calc(100vw - 32px);\r\n  height: 520px;\r\n  max-height: calc(100vh - 100px);\r\n  background: var(--sa-bg);\r\n  border: 1px solid var(--sa-border);\r\n  border-radius: var(--sa-radius);\r\n  display: flex;\r\n  flex-direction: column;\r\n  overflow: hidden;\r\n  box-shadow: 0 8px 32px rgba(0,0,0,0.14);\r\n}\r\n.sa-window[hidden] { display: none; }\r\n.sa-bubble[hidden] { display: none; }\r\n\r\n/* Header */\r\n.sa-header {\r\n  background: var(--sa-primary);\r\n  color: #fff;\r\n  padding: 14px 16px;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: space-between;\r\n  flex-shrink: 0;\r\n}\r\n.sa-title { font-weight: 600; font-size: 15px; }\r\n.sa-close {\r\n  background: none;\r\n  border: none;\r\n  color: #fff;\r\n  cursor: pointer;\r\n  font-size: 16px;\r\n  opacity: 0.8;\r\n  padding: 2px 6px;\r\n  border-radius: 4px;\r\n  transition: opacity 0.2s;\r\n}\r\n.sa-close:hover { opacity: 1; }\r\n\r\n/* Messages area */\r\n.sa-messages {\r\n  flex: 1;\r\n  overflow-y: auto;\r\n  overflow-x: hidden;\r\n  padding: 12px 12px 4px;\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 8px;\r\n  scroll-behavior: smooth;\r\n}\r\n.sa-messages::-webkit-scrollbar { width: 4px; }\r\n.sa-messages::-webkit-scrollbar-thumb {\r\n  background: var(--sa-border);\r\n  border-radius: 4px;\r\n}\r\n\r\n/* Message bubbles */\r\n.sa-message { display: flex; max-width: 85%; }\r\n.sa-user    { \r\n  align-self: flex-end;\r\n  flex-direction: row-reverse; \r\n}\r\n.sa-assistant { align-self: flex-start; }\r\n\r\n.sa-bubble-text {\r\n  padding: 9px 13px;\r\n  border-radius: 14px;\r\n  font-size: 13.5px;\r\n  word-break: break-word;\r\n  overflow: hidden;\r\n  max-width: 100%;\r\n  box-sizing: border-box;\r\n}\r\n.sa-user .sa-bubble-text {\r\n  background: var(--sa-msg-user-bg);\r\n  color: var(--sa-msg-user-text);\r\n  border-bottom-right-radius: 4px;\r\n}\r\n.sa-assistant .sa-bubble-text {\r\n  background: var(--sa-msg-bot-bg);\r\n  color: var(--sa-msg-bot-text);\r\n  border-bottom-left-radius: 4px;\r\n}\r\n.sa-bubble-text pre {\r\n  background: rgba(0,0,0,0.08);\r\n  padding: 8px;\r\n  border-radius: 6px;\r\n  overflow-x: auto;\r\n  font-size: 12px;\r\n  margin: 6px 0;\r\n  max-width: 100%;\r\n  white-space: pre;\r\n  word-break: normal;\r\n  box-sizing: border-box;\r\n}\r\n.sa-bubble-text code {\r\n  font-family: \"Fira Code\", \"Courier New\", monospace;\r\n  font-size: 12px;\r\n  background: rgba(0,0,0,0.06);\r\n  padding: 1px 5px;\r\n  border-radius: 3px;\r\n}\r\n\r\n/* Typing indicator */\r\n.sa-typing .sa-bubble-text {\r\n  padding: 12px 16px;\r\n  display: flex;\r\n  gap: 4px;\r\n  align-items: center;\r\n}\r\n.sa-dot {\r\n  width: 7px; height: 7px;\r\n  background: #9ca3af;\r\n  border-radius: 50%;\r\n  display: inline-block;\r\n  animation: sa-bounce 1.2s infinite;\r\n}\r\n.sa-dot:nth-child(2) { animation-delay: 0.2s; }\r\n.sa-dot:nth-child(3) { animation-delay: 0.4s; }\r\n@keyframes sa-bounce {\r\n  0%, 80%, 100% { transform: translateY(0); }\r\n  40%           { transform: translateY(-6px); }\r\n}\r\n\r\n/* Suggested questions */\r\n.sa-suggestions {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  gap: 6px;\r\n  padding: 6px 12px;\r\n}\r\n.sa-suggestions[hidden] { display: none; }\r\n.sa-suggestion-btn {\r\n  font-size: 12px;\r\n  padding: 5px 10px;\r\n  border: 1px solid var(--sa-primary);\r\n  color: var(--sa-primary);\r\n  background: transparent;\r\n  border-radius: 14px;\r\n  cursor: pointer;\r\n  transition: background 0.15s, color 0.15s;\r\n}\r\n.sa-suggestion-btn:hover {\r\n  background: var(--sa-primary);\r\n  color: #fff;\r\n}\r\n\r\n/* Lead capture form */\r\n.sa-lead-form {\r\n  padding: 10px 12px;\r\n  border-top: 1px solid var(--sa-border);\r\n  font-size: 13px;\r\n  color: var(--sa-text);\r\n}\r\n.sa-lead-form[hidden] { display: none; }\r\n.sa-lead-form p { margin: 0 0 6px; }\r\n.sa-email-input {\r\n  width: 100%;\r\n  padding: 7px 10px;\r\n  border: 1px solid var(--sa-border);\r\n  border-radius: 8px;\r\n  font-size: 13px;\r\n  margin-bottom: 6px;\r\n  box-sizing: border-box;\r\n  background: var(--sa-bg);\r\n  color: var(--sa-text);\r\n}\r\n.sa-email-submit {\r\n  width: 100%;\r\n  padding: 7px;\r\n  background: var(--sa-primary);\r\n  color: #fff;\r\n  border: none;\r\n  border-radius: 8px;\r\n  cursor: pointer;\r\n  font-size: 13px;\r\n}\r\n\r\n/* Input row */\r\n.sa-input-row {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  padding: 10px 12px;\r\n  border-top: 1px solid var(--sa-border);\r\n  flex-shrink: 0;\r\n}\r\n.sa-input {\r\n  flex: 1;\r\n  padding: 9px 12px;\r\n  border: 1px solid var(--sa-border);\r\n  border-radius: 22px;\r\n  font-size: 13.5px;\r\n  outline: none;\r\n  background: var(--sa-bg);\r\n  color: var(--sa-text);\r\n  transition: border-color 0.2s;\r\n}\r\n.sa-input:focus { \r\n  border-color: var(--sa-primary); \r\n}\r\n.sa-send {\r\n  width: 38px; height: 38px;\r\n  border-radius: 50%;\r\n  background: var(--sa-primary);\r\n  color: #fff;\r\n  border: none;\r\n  cursor: pointer;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  flex-shrink: 0;\r\n  transition: opacity 0.2s;\r\n}\r\n.sa-send:disabled { opacity: 0.5; cursor: not-allowed; }\r\n\r\n/* Mobile responsive */\r\n@media (max-width: 390px) {\r\n  .sa-window {\r\n    width: calc(100vw - 16px);\r\n    height: calc(100vh - 80px);\r\n    max-height: calc(100vh - 80px);\r\n  }\r\n  .sa-bottom-right,\r\n  .sa-bottom-left { bottom: 16px; right: 8px; left: 8px; }\r\n}\r\n"  // injected at build time
  shadow.appendChild(styleEl)

  // ── 6. Build HTML structure ───────────────────────────
  const container = document.createElement("div")
  container.className = `sa-container sa-${POSITION} ${
    isDarkMode() ? "sa-dark" : "sa-light"
  }`
  container.innerHTML = `
    <button class="sa-bubble" aria-label="Open chat">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 
          2-2h14a2 2 0 0 1 2 2z" 
          stroke="currentColor" stroke-width="2" 
          stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="sa-window" role="dialog" 
         aria-label="Chat assistant" hidden>
      <div class="sa-header">
        <span class="sa-title">Assistant</span>
        <div style="flex: 1"></div>
        <button class="sa-clear-chat" title="Clear chat" 
                style="background:none; border:none; color:#94A3B8; font-size:11px; cursor:pointer; margin-right:8px; padding:4px;">
          Clear chat
        </button>
        <button class="sa-close" aria-label="Close chat">✕</button>
      </div>
      <div class="sa-messages" aria-live="polite"></div>
      <div class="sa-suggestions" hidden></div>
      <div class="sa-lead-form" hidden>
        <p>Leave your email for a follow-up:</p>
        <input type="email" class="sa-email-input" 
               placeholder="your@email.com" />
        <button class="sa-email-submit">Send</button>
      </div>
      <div class="sa-input-row">
        <input type="text" class="sa-input" 
               placeholder="${PLACEHOLDER}" 
               maxlength="1000" />
        <button class="sa-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <line x1="22" y1="2" x2="11" y2="13" 
              stroke="currentColor" stroke-width="2"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" 
              stroke="currentColor" stroke-width="2" 
              fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  `
  shadow.appendChild(container)

  // ── 7. Element references ─────────────────────────────
  const bubble      = container.querySelector(".sa-bubble")
  const chatWindow  = container.querySelector(".sa-window")
  const closeBtn    = container.querySelector(".sa-close")
  const clearBtn    = container.querySelector(".sa-clear-chat")
  const messagesEl  = container.querySelector(".sa-messages")
  const suggestEl   = container.querySelector(".sa-suggestions")
  const inputEl     = container.querySelector(".sa-input")
  const sendBtn     = container.querySelector(".sa-send")
  const leadForm    = container.querySelector(".sa-lead-form")
  const emailInput  = container.querySelector(".sa-email-input")
  const emailSubmit = container.querySelector(".sa-email-submit")

  // Apply primary color as CSS variable
  container.style.setProperty("--sa-primary", COLOR)

  // ── 8. State ──────────────────────────────────────────
  let isOpen        = false
  let isLoading     = false
  let messageCount  = 0
  let conversationHistory = []
  let persona       = null

  // ── 8b. Persistence ──────────────────────────────────
  const STORAGE_KEY = "siteagent_chat_" + (TOKEN.substring(0, 20) || "default")
  const MAX_HISTORY = 50

  function getSessionId() {
    let sessionId = localStorage.getItem("siteagent_session")
    if (!sessionId) {
      sessionId = "sa_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)
      localStorage.setItem("siteagent_session", sessionId)
    }
    return sessionId
  }

  function isHistoryExpired() {
    const saved = localStorage.getItem(STORAGE_KEY + "_time")
    if (!saved) return true
    const savedTime = parseInt(saved)
    const hours24 = 24 * 60 * 60 * 1000
    return (Date.now() - savedTime) > hours24
  }

  function saveHistory(messages) {
    try {
      const toSave = messages.slice(-MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      localStorage.setItem(STORAGE_KEY + "_time", Date.now().toString())
    } catch (e) {
      console.warn("SiteAgent: Could not save chat history")
    }
  }

  function loadHistory() {
    try {
      if (isHistoryExpired()) {
        localStorage.removeItem(STORAGE_KEY)
        return []
      }
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  }

  function renderHistory() {
    const history = loadHistory()
    if (history.length === 0) return

    history.forEach(m => {
      addMessage(m.role, m.content, false)
    })

    const divider = document.createElement("div")
    divider.style.cssText = "color: #94A3B8; font-size: 11px; text-align: center; margin: 8px 0; border-bottom: 1px solid #f1f5f9; line-height: 0.1em;"
    divider.innerHTML = `<span style="background: #fff; padding: 0 10px;">Previous conversation</span>`
    messagesEl.appendChild(divider)
    
    conversationHistory = history
    messageCount = history.filter(m => m.role === "assistant").length
  }

  clearBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY + "_time")
    messagesEl.innerHTML = ""
    conversationHistory = []
    messageCount = 0
    if (persona) {
      const welcome = GREETING || persona?.welcomeMessage
      if (welcome) addMessage("assistant", welcome)
    }
  })

  // ── 9. Open / Close ───────────────────────────────────
  function openChat() {
    isOpen = true
    chatWindow.removeAttribute("hidden")
    bubble.setAttribute("hidden", "")
    inputEl.focus()
    if (!persona) {
      renderHistory()
      loadContext()
    }
  }

  function closeChat() {
    isOpen = false
    chatWindow.setAttribute("hidden", "")
    bubble.removeAttribute("hidden")
  }

  bubble.addEventListener("click", openChat)
  closeBtn.addEventListener("click", closeChat)

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeChat()
  })

  // ── 10. Load context from /api/context ────────────────
  async function loadContext() {
    try {
      const pageUrl = encodeURIComponent(window.location.href)
      const url = `${SERVER_URL}/api/context` +
        `?token=${encodeURIComponent(TOKEN)}&page=${pageUrl}`
      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json()
      persona = data.persona

      // Update header title
      const titleEl = container.querySelector(".sa-title")
      if (titleEl && persona?.name) {
        titleEl.textContent = persona.name
      }

      // Show welcome message
      const welcome = GREETING || persona?.welcomeMessage
      if (welcome) addMessage("assistant", welcome)

      // Show suggested questions
      if (data.suggestedQuestions?.length > 0) {
        showSuggestions(data.suggestedQuestions)
      }

    } catch (err) {
      console.warn("[SiteAgent] Failed to load context:", err)
      addMessage("assistant",
        "Hi! Ask me anything about this website.")
    }
  }

  // ── 11. Show suggested questions ─────────────────────
  function showSuggestions(questions) {
    suggestEl.innerHTML = ""
    questions.slice(0, 3).forEach(q => {
      const btn = document.createElement("button")
      btn.className = "sa-suggestion-btn"
      btn.textContent = q
      btn.addEventListener("click", () => {
        suggestEl.setAttribute("hidden", "")
        sendMessage(q)
      })
      suggestEl.appendChild(btn)
    })
    suggestEl.removeAttribute("hidden")
  }

  // ── 12. Add message to chat ───────────────────────────
  function addMessage(role, text, save = true) {
    const div = document.createElement("div")
    div.className = `sa-message sa-${role}`

    // Convert basic markdown to HTML
    const formatted = text
      .replace(/```([\s\S]*?)```/g, 
        "<pre><code>$1</code></pre>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>")

    div.innerHTML = `<div class="sa-bubble-text">
      ${formatted}
    </div>`
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight

    if (save) {
      saveHistory(conversationHistory)
    }

    return div
  }

  // ── 13. Typing indicator ──────────────────────────────
  function showTyping() {
    const div = document.createElement("div")
    div.className = "sa-message sa-assistant sa-typing"
    div.innerHTML = `<div class="sa-bubble-text">
      <span class="sa-dot"></span>
      <span class="sa-dot"></span>
      <span class="sa-dot"></span>
    </div>`
    messagesEl.appendChild(div)
    messagesEl.scrollTop = messagesEl.scrollHeight
    return div
  }

  // ── 14. Send message via SSE ──────────────────────────
  async function sendMessage(text) {
    if (isLoading || !text.trim()) return
    isLoading = true
    suggestEl.setAttribute("hidden", "")
    sendBtn.disabled = true
    inputEl.disabled = true

    addMessage("user", text)
    conversationHistory.push({ role: "user", content: text })

    const typingEl = showTyping()
    let fullResponse = ""
    let assistantMsgEl = null

    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: TOKEN,
          question: text,
          currentPageUrl: window.location.href,
          history: conversationHistory.slice(-6),
          sessionId: getSessionId()
        })
      })

      if (!res.ok) {
        typingEl.remove()
        const err = await res.json().catch(() => ({}))
        addMessage("assistant",
          err.message || "Sorry, something went wrong.")
        return
      }

      // Read SSE stream
      typingEl.remove()
      assistantMsgEl = addMessage("assistant", "")
      const bubbleText = assistantMsgEl
        .querySelector(".sa-bubble-text")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "chunk" && event.text) {
              fullResponse += event.text
              // Re-render with markdown parsing
              bubbleText.innerHTML = fullResponse
                .replace(/```([\s\S]*?)```/g,
                  "<pre><code>$1</code></pre>")
                .replace(/`([^`]+)`/g, "<code>$1</code>")
                .replace(/\*\*([^*]+)\*\*/g,
                  "<strong>$1</strong>")
                .replace(/\n/g, "<br>")
              messagesEl.scrollTop = messagesEl.scrollHeight
            } else if (event.type === "done") {
              conversationHistory.push({
                role: "assistant",
                content: fullResponse
              })
              saveHistory(conversationHistory)
              messageCount++
              
              // Check for widget command in response
              tryExecuteCommand(fullResponse)
            } else if (event.type === "error") {
              bubbleText.textContent = event.message ||
                "An error occurred."
            }
          } catch { /* skip malformed SSE line */ }
        }
      }

      // REMOVED redundant history push - now handled in "done" event
      // conversationHistory.push({
      //   role: "assistant",
      //   content: fullResponse
      // })
      // messageCount++

      // Show lead capture after 2 exchanges
      if (
        LEAD_CAPTURE &&
        messageCount === 2 &&
        persona?.features?.leadCaptureEnabled
      ) {
        setTimeout(() => {
          leadForm.removeAttribute("hidden")
        }, 1000)
      }

    } catch (err) {
      typingEl?.remove()
      if (assistantMsgEl) assistantMsgEl.remove()
      addMessage("assistant",
        "Connection error. Please try again.")
    } finally {
      isLoading = false
      sendBtn.disabled = false
      inputEl.disabled = false
      inputEl.focus()
    }
  }

  // ── 15. Send on Enter or button click ────────────────
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputEl.value.trim())
      inputEl.value = ""
    }
  })

  sendBtn.addEventListener("click", () => {
    sendMessage(inputEl.value.trim())
    inputEl.value = ""
  })

  // ── 16. Lead capture submit ───────────────────────────
  emailSubmit.addEventListener("click", () => {
    const email = emailInput.value.trim()
    if (!email || !email.includes("@")) return
    leadForm.innerHTML =
      "<p>✓ Thanks! We will be in touch.</p>"
    // Log lead (no storage — just console for now)
    console.info("[SiteAgent] Lead captured:", email)
  })

  // ── 17. Command executor (Pro feature) ───────────────
  function tryExecuteCommand(responseText) {
    // Server returns JSON command embedded in response
    // when perform_site_action tool is used
    try {
      const match = responseText.match(
        /\{"type":"widget_command"[\s\S]*?\}/
      )
      if (!match) return
      const cmd = JSON.parse(match[0])
      executeCommand(cmd)
    } catch { /* not a command response */ }
  }

  function executeCommand(cmd) {
    switch (cmd.command) {
      case "navigate_to":
        if (cmd.params?.url) {
          window.location.href = cmd.params.url
        }
        break
      case "scroll_to":
        if (cmd.params?.target === "top") {
          window.scrollTo({ top: 0, behavior: "smooth" })
        } else {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
          })
        }
        break
      case "highlight_element":
        const el = document.querySelector(
          cmd.params?.selector || "main"
        )
        if (el) {
          el.style.outline = `3px solid ${COLOR}`
          el.style.outlineOffset = "4px"
          setTimeout(() => {
            el.style.outline = ""
            el.style.outlineOffset = ""
          }, 3000)
        }
        break
      case "open_url":
        if (cmd.params?.url) {
          window.open(cmd.params.url, "_blank", "noopener")
        }
        break
      case "add_to_cart":
        // Trigger click on add-to-cart button if found
        const cartBtn = document.querySelector(
          "[data-action='add-to-cart'], " +
          ".add-to-cart, " +
          "#add-to-cart, " +
          "[name='add']"
        )
        if (cartBtn) cartBtn.click()
        break
      case "submit_form":
        const form = document.querySelector(
          cmd.params?.selector || "form"
        )
        if (form) form.requestSubmit()
        break
    }
  }

  // ── 18. Replace WIDGET_CSS placeholder ───────────────
  // The server will inline the CSS content when serving 
  // widget.js — replace the WIDGET_CSS constant above
  // with the actual CSS string from widget.css

})()
