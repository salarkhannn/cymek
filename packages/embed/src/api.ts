const DEFAULT_API_URL = "/api"; // relative to page origin

let apiUrl = DEFAULT_API_URL;

export function setApiUrl(url: string): void {
  apiUrl = url;
}

export interface ChatResponse {
  answer: string;
  sessionId: string;
  chunks: string[];
}

export async function sendMessage(
  tenantId: string,
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const url = `${apiUrl}/chat/${encodeURIComponent(tenantId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(`Chat error (${res.status}): ${text}`);
  }
  return res.json();
}

export function streamChat(
  tenantId: string,
  message: string,
  sessionId: string | undefined,
  onChunk: (content: string) => void,
  onDone: (data: ChatResponse) => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();
  const url = `${apiUrl}/chat/${encodeURIComponent(tenantId)}`;

  (async () => {
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message, sessionId }),
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
              // skip
            }
          }
        }
      }
      if (fullAnswer) {
        onDone({ answer: fullAnswer, sessionId: finalSessionId, chunks: [] });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return () => controller.abort();
}
