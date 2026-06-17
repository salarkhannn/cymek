import { injectStyles } from "./styles";
import { streamChat, type ChatResponse } from "./api";

export interface CymekConfig {
  tenantId: string;
  apiKey?: string;
  serverUrl?: string;
  title?: string;
  placeholder?: string;
  primaryColor?: string;
  position?: "br" | "bl";
}

const DEFAULT_CONFIG: Partial<CymekConfig> = {
  title: "Cymek Chat",
  placeholder: "Ask a question...",
  primaryColor: "#7c5cfc",
  position: "br",
};

type Message = {
  role: "user" | "assistant" | "error";
  content: string;
};

export class CymekWidget {
  private config: Required<CymekConfig>;
  private messages: Message[] = [];
  private sessionId: string | undefined;
  private open = false;
  private streaming = false;

  private bubble!: HTMLDivElement;
  private drawer!: HTMLDivElement;
  private messagesContainer!: HTMLDivElement;
  private inputEl!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private cancelStream: (() => void) | null = null;

  constructor(config: CymekConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<CymekConfig>;
  }

  init(): void {
    injectStyles(this.config.primaryColor);
    this.createBubble();
    this.createDrawer();
    this.addWelcomeMessage();
  }

  destroy(): void {
    this.cancelStream?.();
    this.bubble?.remove();
    this.drawer?.remove();
  }

  toggle(): void {
    this.open ? this.close() : this.openDrawer();
  }

  openDrawer(): void {
    this.open = true;
    this.drawer.classList.add("open");
    this.bubble.style.display = "none";
    setTimeout(() => this.inputEl?.focus(), 100);
  }

  close(): void {
    this.open = false;
    this.drawer.classList.remove("open");
    this.bubble.style.display = "flex";
  }

  private createBubble(): void {
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

    const btn = this.bubble.querySelector("#cymek-bubble-btn") as HTMLButtonElement;
    btn.addEventListener("click", () => this.toggle());
  }

  private createDrawer(): void {
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

    this.messagesContainer = this.drawer.querySelector("#cymek-messages") as HTMLDivElement;
    this.inputEl = this.drawer.querySelector("#cymek-input") as HTMLInputElement;
    this.sendBtn = this.drawer.querySelector("#cymek-send-btn") as HTMLButtonElement;

    const closeBtn = this.drawer.querySelector("#cymek-drawer-close") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => this.close());
    this.sendBtn.addEventListener("click", () => this.send());
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.send();
    });
    this.inputEl.addEventListener("input", () => {
      this.sendBtn.disabled = !this.inputEl.value.trim() || this.streaming;
    });
  }

  private addWelcomeMessage(): void {
    this.addMessage("assistant", "Hello! I'm your documentation assistant. Ask me anything about your documents.");
  }

  private addMessage(role: Message["role"], content: string): void {
    this.messages.push({ role, content });
    this.renderMessages();
    this.scrollToBottom();
  }

  private renderMessages(): void {
    this.messagesContainer.innerHTML = this.messages
      .map((m) => `<div class="cymek-msg ${m.role}">${this.escapeHtml(m.content)}</div>`)
      .join("");
  }

  private addTypingIndicator(): void {
    const el = document.createElement("div");
    el.className = "cymek-msg typing";
    el.id = "cymek-typing";
    el.textContent = "...";
    this.messagesContainer.appendChild(el);
    this.scrollToBottom();
  }

  private removeTypingIndicator(): void {
    const el = document.getElementById("cymek-typing");
    el?.remove();
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  private send(): void {
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
      (data: ChatResponse) => {
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
      (err: Error) => {
        this.removeTypingIndicator();
        this.addMessage("error", `Error: ${err.message}`);
        this.streaming = false;
        this.sendBtn.disabled = true;
        this.cancelStream = null;
      },
    );
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
