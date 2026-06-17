import { describe, it, expect, vi, beforeEach } from "vitest"
import { EVAL_MIN_SCORE, MAX_RETRIES, PIPELINE_STAGES } from "@cymek/shared"

const mockOpenAI = {
  createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  createEmbeddingsBatch: vi.fn().mockResolvedValue([[0.1], [0.2]]),
  generateSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
  regenerateSystemPrompt: vi.fn().mockResolvedValue("regenerated prompt"),
  generateEvalQA: vi.fn().mockResolvedValue([{ question: "Q", answer: "A" }]),
  evaluateQA: vi.fn().mockResolvedValue({ faithfulness: 0.4, relevance: 0.35 }),
  chatStream: vi.fn().mockResolvedValue("response"),
}

vi.mock("../src/services/openai.js", () => ({
  createOpenAIService: vi.fn(() => mockOpenAI),
}))

vi.mock("../src/services/encryption.js", () => ({
  createEncryptionService: vi.fn(() => ({
    decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
    encrypt: vi.fn().mockReturnValue("encrypted"),
    generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
  })),
}))

const DEFAULT_RECORD = {
  apiKeyEncrypted: "enc-key",
  apiKeyNonce: "nonce123",
  id: "job-1",
  content: "test content",
  retryCount: 0,
}

function createMockDb() {
  const qb: Record<string, unknown> = {
    then: vi.fn((cb: (v: Record<string, unknown>[]) => unknown) =>
      Promise.resolve([DEFAULT_RECORD]).then(cb),
    ),
    catch: vi.fn(),
    finally: vi.fn(),
  }
  const METHODS = [
    "select", "from", "where", "innerJoin", "orderBy", "limit",
    "insert", "values", "update", "set", "delete",
  ] as const
  for (const m of METHODS) {
    qb[m] = vi.fn(() => qb)
  }
  qb.returning = vi.fn(() => qb)
  return qb as never
}

function createMockSidecar() {
  return {
    extractFile: vi.fn().mockResolvedValue({ filename: "doc.pdf", content: "extracted text" }),
    extractUrl: vi.fn().mockResolvedValue({ filename: "page.html", content: "web content" }),
  }
}

function createMockPgBoss() {
  return {
    send: vi.fn().mockResolvedValue("work-id"),
    work: vi.fn(),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as import("pg-boss")
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

const mockEncryption = {
  decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
  encrypt: vi.fn().mockReturnValue("encrypted"),
  generateNonce: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
}

describe("pipeline smoke test", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpenAI.evaluateQA.mockResolvedValue({ faithfulness: 0.9, relevance: 0.95 })
    mockOpenAI.generateEvalQA.mockResolvedValue([{ question: "Q", answer: "A" }])
    mockOpenAI.generateSystemPrompt.mockResolvedValue("system prompt")
  })

  it("full pipeline with high eval score deploys successfully", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(
      createMockDb(), createMockSidecar(), createMockPgBoss(),
      mockLogger, mockEncryption, "http://localhost:11434/v1",
    )

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc1.pdf", "/tmp/doc2.txt"] } },
    } as never)

    const stageEvents = emitter.send.mock.calls
      .map((c: unknown[]) => (c[0] as { stage: string }).stage)
      .filter((s: string) => PIPELINE_STAGES.includes(s as typeof PIPELINE_STAGES[number]))

    const uniqueStages = [...new Set(stageEvents)]
    expect(uniqueStages).toEqual(["ingesting", "chunking", "embedding", "prompt_gen", "evaluating", "deployed"])

    const deployEvents = emitter.send.mock.calls
      .filter((c: unknown[]) => (c[0] as { stage: string; warning?: boolean }).stage === "deployed")
    expect(deployEvents.length).toBeGreaterThanOrEqual(1)
    expect(deployEvents[deployEvents.length - 1][0]).toEqual(
      expect.objectContaining({ stage: "deployed", warning: false }),
    )
  })

  it("full pipeline with low eval score retries then deploys with warning", async () => {
    mockOpenAI.evaluateQA.mockResolvedValue({ faithfulness: 0.3, relevance: 0.25 })

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(
      createMockDb(), createMockSidecar(), createMockPgBoss(),
      mockLogger, mockEncryption, "http://localhost:11434/v1",
    )

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc.pdf"] } },
    } as never)

    const deployEvents = emitter.send.mock.calls
      .filter((c: unknown[]) => (c[0] as { stage: string }).stage === "deployed")

    expect(deployEvents.length).toBeGreaterThanOrEqual(1)
    const lastDeploy = deployEvents[deployEvents.length - 1][0] as { stage: string; warning?: boolean }
    expect(lastDeploy.warning).toBe(true)
  })

  it("full pipeline with urls instead of files still completes", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const sidecar = createMockSidecar()
    const pipeline = createPipelineService(
      createMockDb(), sidecar, createMockPgBoss(),
      mockLogger, mockEncryption, "http://localhost:11434/v1",
    )

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { urls: ["https://example.com/doc"] } },
    } as never)

    const stageEvents = emitter.send.mock.calls
      .map((c: unknown[]) => (c[0] as { stage: string }).stage)
      .filter((s: string) => PIPELINE_STAGES.includes(s as typeof PIPELINE_STAGES[number]))

    expect(stageEvents).toContain("deployed")
    expect(sidecar.extractUrl).toHaveBeenCalled()
  })

  it("processes 3 sample documents and deploys with passing score", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const sidecar = createMockSidecar()
    const pipeline = createPipelineService(
      createMockDb(), sidecar, createMockPgBoss(),
      mockLogger, mockEncryption, "http://localhost:11434/v1",
    )

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc1.pdf", "/tmp/doc2.txt", "/tmp/doc3.docx"] } },
    } as never)

    expect(sidecar.extractFile).toHaveBeenCalledTimes(3)

    const deployEvents = emitter.send.mock.calls
      .filter((c: unknown[]) => (c[0] as { stage: string; warning?: boolean }).stage === "deployed")
    expect(deployEvents.length).toBeGreaterThanOrEqual(1)
    expect(deployEvents[deployEvents.length - 1][0]).toEqual(
      expect.objectContaining({ stage: "deployed", warning: false }),
    )
  })
})
