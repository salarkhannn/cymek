function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cymek_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };
  return fetch(url, { ...options, headers });
}

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

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  useCase: string | null;
  targetUser: string | null;
  createdAt: string;
  updatedAt: string;
  deployed: boolean;
  deployEndpoint: string | null;
  embedSnippet: string | null;
}

export interface PipelineResult {
  tenantId: string;
  jobId: string;
}

export async function uploadFiles(
  files: File[],
  onProgress?: (percent: number) => void,
): Promise<string[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await apiFetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.files as string[];
}

export async function createPipeline(
  apiKey: string,
  useCase: string,
  targetUser: string,
  config: PipelineConfig,
): Promise<PipelineResult> {
  const res = await apiFetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, useCase, targetUser, ...config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getTenant(tenantId: string): Promise<TenantInfo> {
  const res = await apiFetch(`/api/tenant/${tenantId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Tenant not found");
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function getJobs(tenantId: string): Promise<Record<string, unknown>[]> {
  const res = await apiFetch(`/api/pipeline/jobs?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getPipeline(
  jobId: string,
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/pipeline/${jobId}`);
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

  apiFetch(`/api/pipeline/stream/${jobId}`, {
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
  const res = await apiFetch(`/api/chat/${tenantId}`, {
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

  apiFetch(`/api/chat/${tenantId}`, {
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
