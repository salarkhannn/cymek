"use client";

import { useState } from "react";
import { Button, TextInput, Card, Badge, CodeBlock } from "../../components/ui";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask me anything about your documents. I'll search the knowledge base and respond with citations." },
  ]);

  const handleSend = () => {
    if (!query.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: query }, { role: "assistant", content: "This is a preview — connect to the orchestrator SSE endpoint for real responses." }]);
    setQuery("");
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="h-1 twilight-gradient" />
      <header className="border-b border-hairline bg-canvas">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg twilight-gradient text-on-dark text-caption-bold">C</div>
            <span className="text-body-md-medium text-ink">Cymek</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/dashboard" className="text-body-sm text-slate hover:text-ink transition-colors">Dashboard</a>
            <a href="/chat" className="text-body-sm-medium text-ink">Chat</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-section">
        <div className="mb-8">
          <h1 className="text-h1-display text-ink">Chat Preview</h1>
          <p className="mt-2 text-subtitle text-slate">Test your RAG pipeline with streaming responses.</p>
        </div>

        <Card variant="feature" className="flex min-h-[500px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-caption-bold text-ink">Connected</span>
            </div>
            <Badge variant="cream">session_abc123</Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "twilight-gradient text-on-dark"
                    : "border border-hairline bg-canvas text-ink"
                }`}>
                  <p className="text-body-md">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-hairline p-4">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
              <TextInput placeholder="Ask about your documents..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
              <Button variant="primary" type="submit">Send</Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
