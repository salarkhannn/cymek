export interface SseEvent {
  stage: "ingesting" | "chunking" | "embedding" | "prompt_gen" | "evaluating" | "deployed";
  progress?: number;
  chunkCount?: number;
  score?: number;
  warning?: boolean;
  error?: string;
}

export interface ChatChunk {
  type: "chunk";
  content: string;
}

export interface ChatDone {
  type: "done";
  answer: string;
  sessionId: string;
  chunks: string[];
}

export type ChatEvent = ChatChunk | ChatDone;

export interface PipelineConfig {
  files?: string[];
  urls?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
}

export async function createPipeline(
  tenantId: string,
  config: PipelineConfig,
): Promise<{ jobId: string }> {
  const res = await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, ...config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getPipeline(
  jobId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/pipeline/${jobId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function streamPipelineEvents(
  jobId: string,
  onEvent: (event: SseEvent) => void,
  onError?: (err: Error) => void,
  onClose?: () => void,
): AbortController {
  const controller = new AbortController();

  fetch(`/api/pipeline/stream/${jobId}`, {
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError?.(new Error(`SSE connection failed: ${response.status}`));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        onError?.(new Error("No response body"));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              onEvent(data);
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
      onClose?.();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err);
      }
    });

  return controller;
}

export async function sendChatMessage(
  tenantId: string,
  message: string,
  sessionId?: string,
): Promise<{ answer: string; sessionId: string; chunks: string[] }> {
  const res = await fetch(`/api/chat/${tenantId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function streamChatResponse(
  tenantId: string,
  message: string,
  sessionId?: string,
  onChunk?: (content: string) => void,
  onDone?: (data: ChatDone) => void,
  onError?: (err: Error) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`/api/chat/${tenantId}`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message, sessionId }),
  })
    .then(async (response) => {
      if (!response.ok) {
        onError?.(new Error(`Chat request failed: ${response.status}`));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        onError?.(new Error("No response body"));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === "chunk") {
                onChunk?.(data.content);
              } else if (data.type === "done") {
                onDone?.(data);
              }
            } catch {
              // skip malformed
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err);
      }
    });

  return controller;
}
