import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

function createMockPipeline() {
  return {
    createJob: vi.fn().mockResolvedValue("job-123"),
    getJobId: vi.fn().mockResolvedValue({
      id: "job-123",
      tenantId: "tenant-1",
      status: "queued",
      stage: null,
      config: {},
      retryCount: 0,
      warning: false,
      error: null,
      extractedCount: null,
      chunkCount: null,
      evalScore: null,
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

describe("pipeline routes", () => {
  let app: express.Express
  let mockPipeline: ReturnType<typeof createMockPipeline>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockPipeline = createMockPipeline()

    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(mockPipeline as never, mockLogger as never))
  })

  it("POST /pipeline creates a job", async () => {
    const res = await request(app)
      .post("/pipeline")
      .send({ tenantId: "tenant-1", files: ["/tmp/doc.pdf"] })
      .expect(201)

    expect(res.body).toEqual({ jobId: "job-123" })
    expect(mockPipeline.createJob).toHaveBeenCalledWith("tenant-1", {
      files: ["/tmp/doc.pdf"],
    })
  })

  it("POST /pipeline returns 400 when tenantId is missing", async () => {
    const res = await request(app)
      .post("/pipeline")
      .send({ files: ["/tmp/doc.pdf"] })
      .expect(400)

    expect(res.body).toEqual({ error: "tenantId is required" })
  })

  it("POST /pipeline returns 400 when no files or urls", async () => {
    const res = await request(app)
      .post("/pipeline")
      .send({ tenantId: "tenant-1" })
      .expect(400)

    expect(res.body).toEqual({ error: "At least one of files or urls is required" })
  })

  it("GET /pipeline/:jobId returns job details", async () => {
    const res = await request(app)
      .get("/pipeline/job-123")
      .expect(200)

    expect(res.body.id).toBe("job-123")
    expect(res.body.status).toBe("queued")
  })

  it("GET /pipeline/:jobId returns 404 for unknown job", async () => {
    mockPipeline.getJobId.mockResolvedValue(null)

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
