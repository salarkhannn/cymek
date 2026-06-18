export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4o-mini";
export const EVAL_MODEL = "gpt-4o-mini";
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 50;
export const RETRY_CHUNK_SIZE = 384;
export const RETRY_CHUNK_OVERLAP = 75;
export const MAX_RETRIES = 3;
export const EVAL_QA_PAIRS = 20;
export const EVAL_MIN_SCORE = 0.75;
export const EMBEDDING_BATCH_SIZE = 100;
export const RANDOM_SAMPLE_COUNT = 5;
export const SIDECAR_URL = "http://localhost:8001";

export const PIPELINE_STAGES = [
  "ingesting",
  "chunking",
  "embedding",
  "prompt_gen",
  "evaluating",
  "deployed",
] as const;

export const JOB_STATUSES = ["queued", "processing", "completed", "failed"] as const;

export const ROLES = ["user", "assistant", "system"] as const;
