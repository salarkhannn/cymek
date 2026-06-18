import { describe, it, expect } from "vitest"
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  CHAT_MODEL,
  EVAL_MODEL,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  RETRY_CHUNK_SIZE,
  RETRY_CHUNK_OVERLAP,
  MAX_RETRIES,
  EVAL_MIN_SCORE,
  EMBEDDING_BATCH_SIZE,
  SIDECAR_URL,
  PIPELINE_STAGES,
  JOB_STATUSES,
  ROLES,
} from "../src/constants.js"

describe("constants", () => {
  it("EMBEDDING_DIMENSIONS is 768", () => {
    expect(EMBEDDING_DIMENSIONS).toBe(768)
  })

  it("EMBEDDING_MODEL is text-embedding-3-small", () => {
    expect(EMBEDDING_MODEL).toBe("text-embedding-3-small")
  })

  it("CHAT_MODEL is gpt-4o-mini", () => {
    expect(CHAT_MODEL).toBe("gpt-4o-mini")
  })

  it("EVAL_MODEL is gpt-4o-mini", () => {
    expect(EVAL_MODEL).toBe("gpt-4o-mini")
  })

  it("DEFAULT_CHUNK_SIZE is 512", () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(512)
  })

  it("DEFAULT_CHUNK_OVERLAP is 50", () => {
    expect(DEFAULT_CHUNK_OVERLAP).toBe(50)
  })

  it("RETRY_CHUNK_SIZE is 384", () => {
    expect(RETRY_CHUNK_SIZE).toBe(384)
  })

  it("RETRY_CHUNK_OVERLAP is 75", () => {
    expect(RETRY_CHUNK_OVERLAP).toBe(75)
  })

  it("MAX_RETRIES is 3", () => {
    expect(MAX_RETRIES).toBe(3)
  })

  it("EVAL_MIN_SCORE is 0.75", () => {
    expect(EVAL_MIN_SCORE).toBe(0.75)
  })

  it("EMBEDDING_BATCH_SIZE is 100", () => {
    expect(EMBEDDING_BATCH_SIZE).toBe(100)
  })
  it("SIDECAR_URL is http://localhost:8001", () => {

    expect(SIDECAR_URL).toBe("http://localhost:8001")
  })

  it("PIPELINE_STAGES contains 6 stages in order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "ingesting",
      "chunking",
      "embedding",
      "prompt_gen",
      "evaluating",
      "deployed",
    ])
  })

  it("JOB_STATUSES contains expected values", () => {
    expect(JOB_STATUSES).toEqual(["queued", "processing", "completed", "failed"])
  })

  it("ROLES contains user, assistant, system", () => {
    expect(ROLES).toEqual(["user", "assistant", "system"])
  })
})
