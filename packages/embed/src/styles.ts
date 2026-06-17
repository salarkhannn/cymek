function css(primaryColor: string): string {
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

export function injectStyles(primaryColor: string): void {
  const id = "cymek-embed-styles";
  const existing = document.getElementById(id) as HTMLStyleElement | null;
  if (existing) {
    existing.textContent = css(primaryColor);
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css(primaryColor);
  document.head.appendChild(style);
}
