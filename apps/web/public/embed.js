"use strict";
var Cymek = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    CymekWidget: () => CymekWidget,
    VERSION: () => VERSION,
    default: () => index_default
  });

  // src/styles.ts
  function css(primaryColor) {
    return `
    #cymek-bubble {
      all: initial;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    }
    #cymek-bubble * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    #cymek-bubble-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: ${primaryColor};
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    #cymek-bubble-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    #cymek-bubble-btn svg {
      width: 24px;
      height: 24px;
    }
    #cymek-drawer {
      display: none;
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 560px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      z-index: 2147483646;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #ededed;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
    }
    #cymek-drawer.open {
      display: flex;
    }
    #cymek-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: ${primaryColor};
      color: #fff;
    }
    #cymek-drawer-title {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.3;
    }
    #cymek-drawer-close {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
    }
    #cymek-drawer-close:hover { opacity: 1; }
    #cymek-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #fafafa;
    }
    .cymek-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .cymek-msg.user {
      align-self: flex-end;
      background: ${primaryColor};
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .cymek-msg.assistant {
      align-self: flex-start;
      background: #fff;
      color: #1f1f1f;
      border: 1px solid #ededed;
      border-bottom-left-radius: 4px;
    }
    .cymek-msg.error {
      align-self: flex-start;
      background: #fff0f0;
      color: #ef4444;
      border: 1px solid #fecaca;
    }
    .cymek-msg.typing {
      align-self: flex-start;
      background: #fff;
      color: #a8a8a8;
      border: 1px solid #ededed;
    }
    .cymek-msg.typing::after {
      content: '...';
      animation: cymek-typing 1.5s infinite;
    }
    @keyframes cymek-typing {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }
    #cymek-input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #ededed;
      background: #fff;
    }
    #cymek-input {
      flex: 1;
      border: 1px solid #c7c7c7;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s ease;
      line-height: 1.4;
    }
    #cymek-input:focus {
      border-color: ${primaryColor};
      box-shadow: 0 0 0 2px ${primaryColor}33;
    }
    #cymek-send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: none;
      background: ${primaryColor};
      color: #fff;
      cursor: pointer;
      transition: background 0.15s ease;
      flex-shrink: 0;
    }
    #cymek-send-btn:hover { background: #5c3dd9; }
    #cymek-send-btn:disabled { background: #c7c7c7; cursor: not-allowed; }
    #cymek-send-btn svg {
      width: 16px;
      height: 16px;
    }
    @media (max-width: 480px) {
      #cymek-drawer {
        bottom: 0;
        right: 0;
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `;
  }
  function injectStyles(primaryColor) {
    const id = "cymek-embed-styles";
    const existing = document.getElementById(id);
    if (existing) {
      existing.textContent = css(primaryColor);
      return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css(primaryColor);
    document.head.appendChild(style);
  }

  // src/api.ts
  var DEFAULT_API_URL = "/api";
  var apiUrl = DEFAULT_API_URL;
  function setApiUrl(url) {
    apiUrl = url;
  }
  function streamChat(tenantId, message, sessionId, onChunk, onDone, onError) {
    const controller = new AbortController();
    const url = `${apiUrl}/chat/${encodeURIComponent(tenantId)}`;
    (async () => {
      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream"
          },
          body: JSON.stringify({ message, sessionId })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "Request failed");
          onError(new Error(`Chat error (${res.status}): ${text}`));
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          onError(new Error("Stream not available"));
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let fullAnswer = "";
        let finalSessionId = sessionId || "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (t.startsWith("data: ")) {
              try {
                const data = JSON.parse(t.slice(6));
                if (data.type === "chunk") {
                  fullAnswer += data.content;
                  onChunk(data.content);
                } else if (data.type === "done") {
                  finalSessionId = data.sessionId || finalSessionId;
                  onDone({ answer: data.answer || fullAnswer, sessionId: finalSessionId, chunks: data.chunks || [] });
                }
              } catch {
              }
            }
          }
        }
        if (fullAnswer) {
          onDone({ answer: fullAnswer, sessionId: finalSessionId, chunks: [] });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })();
    return () => controller.abort();
  }

  // src/widget.ts
  var DEFAULT_CONFIG = {
    title: "Cymek Chat",
    placeholder: "Ask a question...",
    primaryColor: "#7c5cfc",
    position: "br"
  };
  var CymekWidget = class {
    constructor(config) {
      this.messages = [];
      this.open = false;
      this.streaming = false;
      this.cancelStream = null;
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
    init() {
      injectStyles(this.config.primaryColor);
      this.createBubble();
      this.createDrawer();
      this.addWelcomeMessage();
    }
    destroy() {
      this.cancelStream?.();
      this.bubble?.remove();
      this.drawer?.remove();
    }
    toggle() {
      this.open ? this.close() : this.openDrawer();
    }
    openDrawer() {
      this.open = true;
      this.drawer.classList.add("open");
      this.bubble.style.display = "none";
      setTimeout(() => this.inputEl?.focus(), 100);
    }
    close() {
      this.open = false;
      this.drawer.classList.remove("open");
      this.bubble.style.display = "flex";
    }
    createBubble() {
      this.bubble = document.createElement("div");
      this.bubble.id = "cymek-bubble";
      this.bubble.innerHTML = `
      <button id="cymek-bubble-btn" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    `;
      document.body.appendChild(this.bubble);
      const btn = this.bubble.querySelector("#cymek-bubble-btn");
      btn.addEventListener("click", () => this.toggle());
    }
    createDrawer() {
      this.drawer = document.createElement("div");
      this.drawer.id = "cymek-drawer";
      this.drawer.innerHTML = `
      <div id="cymek-drawer-header">
        <span id="cymek-drawer-title">${this.escapeHtml(this.config.title)}</span>
        <button id="cymek-drawer-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div id="cymek-messages"></div>
      <div id="cymek-input-area">
        <input id="cymek-input" type="text" placeholder="${this.escapeHtml(this.config.placeholder)}" autocomplete="off">
        <button id="cymek-send-btn" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    `;
      document.body.appendChild(this.drawer);
      this.messagesContainer = this.drawer.querySelector("#cymek-messages");
      this.inputEl = this.drawer.querySelector("#cymek-input");
      this.sendBtn = this.drawer.querySelector("#cymek-send-btn");
      const closeBtn = this.drawer.querySelector("#cymek-drawer-close");
      closeBtn.addEventListener("click", () => this.close());
      this.sendBtn.addEventListener("click", () => this.send());
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.send();
      });
      this.inputEl.addEventListener("input", () => {
        this.sendBtn.disabled = !this.inputEl.value.trim() || this.streaming;
      });
    }
    addWelcomeMessage() {
      this.addMessage("assistant", "Hello! I'm your documentation assistant. Ask me anything about your documents.");
    }
    addMessage(role, content) {
      this.messages.push({ role, content });
      this.renderMessages();
      this.scrollToBottom();
    }
    renderMessages() {
      this.messagesContainer.innerHTML = this.messages.map((m) => `<div class="cymek-msg ${m.role}">${this.escapeHtml(m.content)}</div>`).join("");
    }
    addTypingIndicator() {
      const el = document.createElement("div");
      el.className = "cymek-msg typing";
      el.id = "cymek-typing";
      el.textContent = "...";
      this.messagesContainer.appendChild(el);
      this.scrollToBottom();
    }
    removeTypingIndicator() {
      const el = document.getElementById("cymek-typing");
      el?.remove();
    }
    scrollToBottom() {
      requestAnimationFrame(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      });
    }
    send() {
      const text = this.inputEl.value.trim();
      if (!text || this.streaming) return;
      this.inputEl.value = "";
      this.sendBtn.disabled = true;
      this.addMessage("user", text);
      this.streaming = true;
      this.addTypingIndicator();
      let fullContent = "";
      this.cancelStream = streamChat(
        this.config.tenantId,
        text,
        this.sessionId,
        (chunk) => {
          fullContent += chunk;
          this.removeTypingIndicator();
          const last = this.messages[this.messages.length - 1];
          if (last?.role === "assistant") {
            last.content += chunk;
            this.renderMessages();
          } else {
            this.addMessage("assistant", chunk);
          }
        },
        (data) => {
          this.sessionId = data.sessionId;
          this.removeTypingIndicator();
          if (fullContent) {
            const last = this.messages[this.messages.length - 1];
            if (last?.role === "assistant" && last.content !== fullContent) {
              last.content = data.answer || fullContent;
              this.renderMessages();
            }
          } else if (data.answer) {
            this.addMessage("assistant", data.answer);
          }
          this.streaming = false;
          this.sendBtn.disabled = true;
          this.cancelStream = null;
        },
        (err) => {
          this.removeTypingIndicator();
          this.addMessage("error", `Error: ${err.message}`);
          this.streaming = false;
          this.sendBtn.disabled = true;
          this.cancelStream = null;
        }
      );
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // src/index.ts
  var VERSION = "0.1.0";
  function getDataConfig() {
    const script = document.querySelector("script[data-cymek-tenant-id]");
    if (!script) return {};
    const config = {
      tenantId: script.dataset.cymekTenantId || ""
    };
    if (script.dataset.cymekServerUrl) config.serverUrl = script.dataset.cymekServerUrl;
    if (script.dataset.cymekTitle) config.title = script.dataset.cymekTitle;
    if (script.dataset.cymekPlaceholder) config.placeholder = script.dataset.cymekPlaceholder;
    if (script.dataset.cymekPrimaryColor) config.primaryColor = script.dataset.cymekPrimaryColor;
    return config;
  }
  function init(config) {
    if (config.serverUrl) {
      setApiUrl(config.serverUrl);
    }
    const widget = new CymekWidget(config);
    widget.init();
    globalCymek.widget = widget;
    return widget;
  }
  var globalCymek = {
    VERSION,
    init,
    widget: null
  };
  var dataConfig = getDataConfig();
  if (dataConfig.tenantId) {
    init(dataConfig);
  }
  if (typeof window !== "undefined") {
    window.Cymek = globalCymek;
  }
  var index_default = globalCymek;
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=embed.js.map
