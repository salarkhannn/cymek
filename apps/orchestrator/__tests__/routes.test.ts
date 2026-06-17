import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

type QueryResult = Record<string, unknown>[]

function chainWithResults(results: QueryResult[]) {
  let idx = 0
  function resolveNext() {
    const r = idx < results.length ? results[idx] : []
    idx++
    return r
  }

  const qb: Record<string, unknown> = {
    then: vi.fn((cb: (v: QueryResult) => unknown) =>
      Promise.resolve(resolveNext()).then(cb),
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

  return qb as never
}

function createMockPipeline() {
  return {
    createJob: vi.fn().mockResolvedValue("job-123"),
    getJobId: vi.fn().mockResolvedValue({
      id: "job-123",
      tenantId: "tenant-1",
      status: "queued",
      config: {},
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
    registerEmitter: vi.fn(),
    unregisterEmitter: vi.fn(),
    emitEvent: vi.fn(),
  }
}

function createMockChatService() {
  return {
    chat: vi.fn().mockResolvedValue({
      answer: "This is a test answer.",
      sessionId: "session-1",
      chunks: ["relevant chunk"],
    }),
  }
}

function createMockEncryption() {
  return {
    decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
    encrypt: vi.fn().mockReturnValue({ encrypted: "encrypted-hex:authtag", nonce: "iv-hex" }),
    generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
  }
}

describe("pipeline routes", () => {
  let app: express.Express
  let mockPipeline: ReturnType<typeof createMockPipeline>
  let mockEncryption: ReturnType<typeof createMockEncryption>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockPipeline = createMockPipeline()
    mockEncryption = createMockEncryption()
  })

  it("POST /pipeline creates a new tenant and job", async () => {
    const mockDb = chainWithResults([
      [], // check if tenant exists → no
      [], // insert (not captured but consumes slot)
      [{ id: "tenant-1" }], // select after insert → created tenant
    ])
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(mockDb, mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", useCase: "My Use Case", files: ["/tmp/doc.pdf"] })
      .expect(201)

    expect(res.body.jobId).toBe("job-123")
    expect(res.body.tenantId).toBe("tenant-1")
    expect(mockPipeline.createJob).toHaveBeenCalled()
  })

  it("POST /pipeline returns 400 when apiKey is missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ useCase: "My Use Case", files: ["/tmp/doc.pdf"] })
      .expect(400)

    expect(res.body).toEqual({ error: "apiKey is required" })
  })

  it("POST /pipeline returns 400 when useCase is missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", files: ["/tmp/doc.pdf"] })
      .expect(400)

    expect(res.body).toEqual({ error: "useCase is required" })
  })

  it("POST /pipeline returns 400 when no files or urls", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", useCase: "My Use Case" })
      .expect(400)

    expect(res.body).toEqual({ error: "At least one of files or urls is required" })
  })

  it("GET /pipeline/:jobId returns job details", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/job-123")
      .expect(200)

    expect(res.body.id).toBe("job-123")
    expect(res.body.status).toBe("queued")
  })

  it("GET /pipeline/:jobId returns 404 for unknown job", async () => {
    mockPipeline.getJobId.mockResolvedValue(null)
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, mockEncryption, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/unknown")
      .expect(404)

    expect(res.body).toEqual({ error: "Job not found" })
  })
})

describe("chat routes", () => {
  let app: express.Express
  let mockChatService: ReturnType<typeof createMockChatService>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockChatService = createMockChatService()

    const { chatRoutes } = await import("../src/routes/chat.js")
    app.use(chatRoutes(mockChatService as never, mockLogger as never))
  })

  it("POST /chat/:tenantId returns chat response", async () => {
    const res = await request(app)
      .post("/chat/tenant-1")
      .send({ message: "What is Cymek?" })
      .expect(200)

    expect(res.body.answer).toBe("This is a test answer.")
    expect(res.body.sessionId).toBe("session-1")
    expect(mockChatService.chat).toHaveBeenCalledWith("tenant-1", "What is Cymek?", undefined)
  })

  it("POST /chat/:tenantId rejects missing message", async () => {
    const res = await request(app)
      .post("/chat/tenant-1")
      .send({})
      .expect(400)

    expect(res.body).toEqual({ error: "message is required" })
  })

  it("POST /chat/:tenantId with sessionId passes it through", async () => {
    await request(app)
      .post("/chat/tenant-1")
      .send({ message: "Hello", sessionId: "existing-session" })
      .expect(200)

    expect(mockChatService.chat).toHaveBeenCalledWith("tenant-1", "Hello", "existing-session")
  })
})
