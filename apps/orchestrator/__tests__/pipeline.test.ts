import { describe, it, expect, vi, beforeEach } from "vitest"

function createMockDb() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "job-1" }]),
        $returningId: vi.fn().mockResolvedValue([{ id: "doc-id" }, { id: "doc-id-2" }]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([
          { id: "doc-1", content: "test content for document" },
        ]),
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "chunk-1", content: "chunk content" },
            { id: "chunk-2", content: "more chunk content" },
          ]),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ content: "system prompt" }]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  } as unknown as ReturnType<typeof createMockDb>
}

function createMockOpenAI() {
  return {
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    createEmbeddingsBatch: vi.fn().mockResolvedValue([[0.1], [0.2]]),
    generateSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
    regenerateSystemPrompt: vi.fn().mockResolvedValue("regenerated prompt"),
    generateEvalQA: vi.fn().mockResolvedValue([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]),
    evaluateQA: vi.fn().mockResolvedValue({ faithfulness: 0.8, relevance: 0.9 }),
    chatStream: vi.fn().mockResolvedValue("response"),
  }
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
  } as unknown as import("pg-boss")
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

describe("pipeline service", () => {
  let db: ReturnType<typeof createMockDb>
  let openAI: ReturnType<typeof createMockOpenAI>
  let sidecar: ReturnType<typeof createMockSidecar>
  let pgBoss: ReturnType<typeof createMockPgBoss>

  beforeEach(() => {
    vi.clearAllMocks()
    db = createMockDb()
    openAI = createMockOpenAI()
    sidecar = createMockSidecar()
    pgBoss = createMockPgBoss()
  })

  it("createJob inserts a job and sends pgBoss message", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const jobId = await pipeline.createJob("tenant-1", {
      files: ["/tmp/doc.pdf"],
    })

    expect(jobId).toBe("job-1")
    expect(db.insert).toHaveBeenCalled()
    expect(pgBoss.send).toHaveBeenCalledWith("pipeline-process", {
      jobId: "job-1",
      tenantId: "tenant-1",
      config: { files: ["/tmp/doc.pdf"] },
    })
  })

  it("registerEmitter and unregisterEmitter manage SSE connections", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)
    pipeline.emitEvent("job-1", { stage: "ingesting" })

    expect(emitter.send).toHaveBeenCalledWith({ stage: "ingesting" })

    pipeline.unregisterEmitter("job-1", emitter)
    emitter.send.mockClear()
    pipeline.emitEvent("job-1", { stage: "chunking" })
    expect(emitter.send).not.toHaveBeenCalled()
  })

  it("processPipeline runs full flow and deploys on high eval", async () => {
    openAI.generateEvalQA.mockResolvedValue([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ])
    openAI.evaluateQA.mockResolvedValue({ faithfulness: 0.9, relevance: 0.95 })

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc.pdf"] } },
    } as never)

    expect(openAI.createEmbeddingsBatch).toHaveBeenCalled()
    expect(openAI.generateSystemPrompt).toHaveBeenCalled()
    expect(openAI.generateEvalQA).toHaveBeenCalled()
    expect(openAI.evaluateQA).toHaveBeenCalledTimes(2)
    expect(emitter.send).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "deployed", warning: false }),
    )
  })

  it("processPipeline retries on low eval score then deploys with warning", async () => {
    let evalCallCount = 0
    openAI.generateEvalQA.mockImplementation(async () => {
      evalCallCount++
      return [{ question: "Q", answer: "A" }]
    })
    openAI.evaluateQA.mockResolvedValue({ faithfulness: 0.4, relevance: 0.35 })

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc.pdf"] } },
    } as never)

    const deployCalls = emitter.send.mock.calls.filter(
      (c: unknown[]) => (c[0] as { stage: string }).stage === "deployed",
    )
    expect(deployCalls.length).toBeGreaterThanOrEqual(1)
    expect(deployCalls[deployCalls.length - 1][0]).toEqual(
      expect.objectContaining({ stage: "deployed", warning: true }),
    )
  })

  it("processPipeline emits events in order through all 6 stages", async () => {
    openAI.generateEvalQA.mockResolvedValue([
      { question: "Q1", answer: "A1" },
    ])
    openAI.evaluateQA.mockResolvedValue({ faithfulness: 0.9, relevance: 0.9 })

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const emitter = { send: vi.fn(), close: vi.fn() }
    pipeline.registerEmitter("job-1", emitter)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/doc.pdf"] } },
    } as never)

    const stageEvents = emitter.send.mock.calls
      .map((c: unknown[]) => (c[0] as { stage: string }).stage)
      .filter((s: string) => ["ingesting", "chunking", "embedding", "prompt_gen", "evaluating", "deployed"].includes(s))

    const uniqueStages = [...new Set(stageEvents)]
    expect(uniqueStages).toEqual(["ingesting", "chunking", "embedding", "prompt_gen", "evaluating", "deployed"])
  })

  it("processPipeline handles extractFile errors gracefully", async () => {
    openAI.generateEvalQA.mockResolvedValue([
      { question: "Q1", answer: "A1" },
    ])
    openAI.evaluateQA.mockResolvedValue({ faithfulness: 0.9, relevance: 0.9 })
    sidecar.extractFile.mockRejectedValue(new Error("Extraction failed"))

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { files: ["/tmp/bad.pdf"] } },
    } as never)

    expect(db.update).toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1" }),
      "Pipeline failed",
    )
  })

  it("getJobId returns job or null", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    const job = await pipeline.getJobId("job-1")
    expect(job).toBeDefined()
    expect(job?.id).toBe("doc-1")
  })

  it("createJob handles url config", async () => {
    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    await pipeline.createJob("tenant-1", {
      urls: ["https://example.com/doc"],
    })

    expect(pgBoss.send).toHaveBeenCalledWith("pipeline-process", {
      jobId: "job-1",
      tenantId: "tenant-1",
      config: { urls: ["https://example.com/doc"] },
    })
  })

  it("processPipeline with urls calls extractUrl", async () => {
    openAI.generateEvalQA.mockResolvedValue([])
    openAI.evaluateQA.mockResolvedValue({ faithfulness: 0.9, relevance: 0.9 })

    const { createPipelineService } = await import("../src/services/pipeline.js")
    const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, mockLogger as never)

    await pipeline.processPipeline({
      data: { jobId: "job-1", tenantId: "tenant-1", config: { urls: ["https://example.com"] } },
    } as never)

    expect(sidecar.extractUrl).toHaveBeenCalledWith("https://example.com")
  })
})

describe("splitText", () => {
  it("splits text into chunks of specified size", async () => {
    const { splitText } = await import("../src/services/pipeline.js")
    const text = "HelloWorld"
    const result = splitText(text, 5, 0)
    expect(result).toEqual(["Hello", "World"])
  })

  it("handles overlap between chunks", async () => {
    const { splitText } = await import("../src/services/pipeline.js")
    const text = "ABCDEFGHIJ"
    const result = splitText(text, 5, 2)
    expect(result).toEqual(["ABCDE", "DEFGH", "GHIJ", "J"])
  })

  it("returns single chunk for small text", async () => {
    const { splitText } = await import("../src/services/pipeline.js")
    const result = splitText("Hi", 100, 0)
    expect(result).toEqual(["Hi"])
  })

  it("handles empty string", async () => {
    const { splitText } = await import("../src/services/pipeline.js")
    const result = splitText("", 10, 0)
    expect(result).toEqual([])
  })

  it("handles overlap greater than chunk size gracefully", async () => {
    const { splitText } = await import("../src/services/pipeline.js")
    const text = "Hello"
    const result = splitText(text, 3, 5)
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0]).toBe("Hel")
  })
})
