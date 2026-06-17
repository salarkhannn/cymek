"use client";

import { useState, useRef, useEffect, use } from "react";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { TextInput } from "../../../components/ui/TextInput";
import { Button } from "../../../components/ui/Button";
import { streamChatResponse } from "../../../lib/api";

interface ChatPreviewPageProps {
  params: Promise<{ tenantId: string }>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ChatPreviewPage({ params }: ChatPreviewPageProps) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.tenantId;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your documentation assistant. Ask me anything about your documents.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const message = input.trim();
    if (!message || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setStreaming(true);

    const currentSessionId = sessionId;

    streamChatResponse(
      tenantId,
      message,
      currentSessionId,
      (chunk) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { role: "assistant", content: last.content + chunk }];
          }
          return [...prev, { role: "assistant", content: chunk }];
        });
      },
      (done) => {
        setSessionId(done.sessionId);
        setStreaming(false);
      },
      (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ]);
        setStreaming(false);
      },
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-section">
      <div className="mb-8">
        <Badge variant="cream" className="mb-3">Chat Preview</Badge>
        <h1 className="text-h1-display font-display text-ink mb-2">
          Test your widget
        </h1>
        <p className="text-body-sm text-steel font-mono">Tenant: {tenantId}</p>
      </div>

      <Card variant="base" className="mb-4">
        <div className="flex h-[500px] flex-col">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-body-sm ${
                    msg.role === "user"
                      ? "bg-primary text-on-primary"
                      : "bg-surface text-ink border border-hairline-soft"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-hairline-soft p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <TextInput
                  placeholder="Ask a question about your documents..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={streaming}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="mt-[18px]"
              >
                {streaming ? "..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ChatPreviewPage;
