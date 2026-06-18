export type PipelineStage =
  | "ingesting"
  | "chunking"
  | "embedding"
  | "prompt_gen"
  | "evaluating"
  | "deployed";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type Role = "user" | "assistant" | "system";

export interface SseEvent {
  stage: PipelineStage;
  progress?: number;
  chunkCount?: number;
  score?: number;
  warning?: boolean;
  error?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  useCase: string | null;
  targetUser: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  tenantId: string;
  status: JobStatus;
  stage: PipelineStage | null;
  config: Record<string, unknown>;
  retryCount: number;
  warning: boolean;
  error: string | null;
  extractedCount: number | null;
  chunkCount: number | null;
  evalScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  tenantId: string;
  jobId: string;
  filename: string;
  content: string;
  createdAt: string;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  createdAt: string;
}

export interface SystemPrompt {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvalResult {
  id: string;
  tenantId: string;
  jobId: string;
  metricName: string;
  metricValue: number;
  createdAt: string;
}

export interface ChatLog {
  id: string;
  tenantId: string;
  sessionId: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  answer: string;
  sessionId: string;
  chunks: string[];
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface MeResponse {
  user: User;
}

export interface PipelineConfig {
  files?: string[];
  urls?: string[];
  chunkSize?: number;
  chunkOverlap?: number;
  useCase?: string;
  targetUser?: string;
}
