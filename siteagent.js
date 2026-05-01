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
  // Try to detect server from script src first
  let SERVER_URL = ""
  for (const s of scripts) {
    if (s.src && s.src.includes("widget.js")) {
      const src = s.src
      // If served from CDN (jsdelivr/github),
      // use MCPize server URL directly
      if (
        src.includes("jsdelivr") ||
        src.includes("github.io") ||
        src.includes("cloudflare")
      ) {
        SERVER_URL = "https://siteagent-server.mcpize.run"
      } else {
        SERVER_URL = new URL(src).origin
      }
      break
    }
  }
  if (!SERVER_URL) {
    SERVER_URL = "https://siteagent-server.mcpize.run"
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
  styleEl.textContent = WIDGET_CSS  // injected at build time
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

  // ── 9. Open / Close ───────────────────────────────────
  function openChat() {
    isOpen = true
    chatWindow.removeAttribute("hidden")
    bubble.setAttribute("hidden", "")
    inputEl.focus()
    if (!persona) loadContext()
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
  function addMessage(role, text) {
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
          history: conversationHistory.slice(-6)
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
              // Check for widget command in response
              tryExecuteCommand(fullResponse)
            } else if (event.type === "error") {
              bubbleText.textContent = event.message ||
                "An error occurred."
            }
          } catch { /* skip malformed SSE line */ }
        }
      }

      conversationHistory.push({
        role: "assistant",
        content: fullResponse
      })
      messageCount++

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
