import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import express from "express"
import request from "supertest"
import http from "http"

const MOCK_METHODS = [
  "select", "from", "where", "innerJoin", "orderBy", "limit",
  "insert", "values", "returning", "set", "delete",
  "update", "$returningId",
] as const

function chainWithResults(results: unknown[][]) {
  let idx = 0
  function resolveNext() {
    const r = idx < results.length ? results[idx] : []
    idx++
    return r
  }

  const qb: Record<string, unknown> = {
    then: vi.fn((cb: (v: unknown) => unknown) =>
      Promise.resolve(resolveNext()).then(cb),
    ),
    catch: vi.fn(),
    finally: vi.fn(),
  }

  for (const m of MOCK_METHODS) {
    qb[m] = vi.fn(() => qb)
  }

  return qb as never
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

describe("E2E smoke — pipeline HTTP API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("POST /pipeline creates tenant and job (201)", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockDb = chainWithResults([
      [], // check if tenant exists → no existing
      [], // insert tenant (not captured, consumes slot)
      [{ id: "tenant-1" }], // select tenant after insert
    ])

    const mockPipeline = {
      createJob: vi.fn().mockResolvedValue("job-123"),
      getJobId: vi.fn().mockResolvedValue({
        id: "job-123",
        tenantId: "tenant-1",
        status: "queued",
        config: {},
        createdAt: "2026-06-01T00:00:00Z",
        updatedAt: "2026-06-01T00:00:00Z",
      }),
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
    }

    const mockEncryption = {
      decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
      encrypt: vi.fn().mockReturnValue({ encrypted: "enc-hex:auth", nonce: "iv-hex" }),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(mockDb, mockPipeline as never, mockEncryption as never, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", useCase: "Customer Support", files: ["/tmp/doc1.pdf"] })
      .expect(201)

    expect(res.body).toHaveProperty("tenantId")
    expect(res.body).toHaveProperty("jobId")
    expect(res.body.jobId).toBe("job-123")
    expect(mockPipeline.createJob).toHaveBeenCalledWith("tenant-1", {
      files: ["/tmp/doc1.pdf"],
      urls: undefined,
      chunkSize: undefined,
      chunkOverlap: undefined,
      useCase: "Customer Support",
      targetUser: undefined,
    })
  })

  it("GET /pipeline/:jobId returns job status (200)", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockPipeline = {
      createJob: vi.fn(),
      getJobId: vi.fn().mockResolvedValue({
        id: "job-123",
        tenantId: "tenant-1",
        status: "queued",
        config: { files: ["/tmp/doc.pdf"] },
        createdAt: "2026-06-01T00:00:00Z",
        updatedAt: "2026-06-01T00:00:00Z",
      }),
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
    }

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/job-123")
      .expect(200)

    expect(res.body.id).toBe("job-123")
    expect(res.body.status).toBe("queued")
    expect(res.body).toHaveProperty("config")
  })

  it("GET /pipeline/:jobId returns 404 for unknown job", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockPipeline = {
      createJob: vi.fn(),
      getJobId: vi.fn().mockResolvedValue(null),
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
    }

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/unknown-id")
      .expect(404)

    expect(res.body).toEqual({ error: "Job not found" })
  })

  it("GET /tenant/:tenantId returns tenant info", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockDb = chainWithResults([
      [{ id: "tenant-1", name: "customer-support", slug: "customer-support", useCase: "Customer Support", targetUser: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
      [{ id: "job-1" }],
    ])

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(mockDb, {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/tenant/tenant-1")
      .expect(200)

    expect(res.body.id).toBe("tenant-1")
    expect(res.body.deployed).toBe(true)
    expect(res.body).toHaveProperty("deployEndpoint")
    expect(res.body).toHaveProperty("embedSnippet")
  })

  it("GET /tenant/:tenantId returns 404 for unknown tenant", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockDb = chainWithResults([[]])

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(mockDb, {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/tenant/nonexistent")
      .expect(404)

    expect(res.body).toEqual({ error: "Tenant not found" })
  })

  it("GET /pipeline/stream/:jobId returns SSE headers", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockPipeline = {
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
      createJob: vi.fn(),
      getJobId: vi.fn(),
    }

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, {} as never, mockLogger as never))

    const server = app.listen(0)
    const port = (server.address() as { port: number }).port

    const result = await new Promise<{
      status: number
      headers: Record<string, string | string[] | undefined>
      body: string
    }>((resolve) => {
      http.get(`http://localhost:${port}/pipeline/stream/test-job`, (res) => {
        let data = ""
        res.setEncoding("utf8")
        res.on("data", (chunk: string) => {
          data += chunk
          res.destroy()
        })
        res.on("close", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: data,
          })
          server.close()
        })
        res.on("error", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: data,
          })
          server.close()
        })
      })
    })

    expect(result.status).toBe(200)
    expect(result.headers["content-type"]).toBe("text/event-stream")
    expect(result.headers["cache-control"]).toBe("no-cache")
    expect(result.headers["x-accel-buffering"]).toBe("no")
    expect(mockPipeline.registerEmitter).toHaveBeenCalledWith(
      "test-job",
      expect.objectContaining({
        send: expect.any(Function),
        close: expect.any(Function),
      }),
    )
  })

  it("GET /pipeline/:jobId includes SSE event via emitter", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockPipeline = {
      registerEmitter: vi.fn((_jobId: string, emitter: { send: (e: unknown) => void }) => {
        emitter.send({ stage: "ingesting", progress: 0 })
      }),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
      createJob: vi.fn(),
      getJobId: vi.fn(),
    }

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), mockPipeline as never, {} as never, mockLogger as never))

    const server = app.listen(0)
    const port = (server.address() as { port: number }).port

    const result = await new Promise<{ body: string }>((resolve) => {
      http.get(`http://localhost:${port}/pipeline/stream/test-stream-job`, (res) => {
        let data = ""
        res.setEncoding("utf8")
        res.on("data", (chunk: string) => {
          data += chunk
          res.destroy()
        })
        res.on("close", () => {
          resolve({ body: data })
          server.close()
        })
        res.on("error", () => {
          resolve({ body: data })
          server.close()
        })
      })
    })

    expect(result.body).toContain("ingesting")
    expect(result.body).toContain("progress")
  })
})

describe("E2E smoke — chat HTTP API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("POST /chat/:tenantId returns chat response (200)", async () => {
    const { chatRoutes } = await import("../src/routes/chat.js")

    const mockChatService = {
      chat: vi.fn().mockResolvedValue({
        answer: "Cymek is an AI pipeline builder.",
        sessionId: "session-1",
        chunks: ["Cymek is a platform for building RAG pipelines."],
      }),
    }

    const app = express()
    app.use(express.json())
    app.use(chatRoutes(mockChatService as never, mockLogger as never))

    const res = await request(app)
      .post("/chat/tenant-1")
      .send({ message: "What is Cymek?" })
      .expect(200)

    expect(res.body.answer).toBe("Cymek is an AI pipeline builder.")
    expect(res.body.sessionId).toBe("session-1")
    expect(Array.isArray(res.body.chunks)).toBe(true)
  })

  it("POST /chat/:tenantId returns 400 when message missing", async () => {
    const { chatRoutes } = await import("../src/routes/chat.js")

    const mockChatService = {
      chat: vi.fn(),
    }

    const app = express()
    app.use(express.json())
    app.use(chatRoutes(mockChatService as never, mockLogger as never))

    const res = await request(app)
      .post("/chat/tenant-1")
      .send({})
      .expect(400)

    expect(res.body).toEqual({ error: "message is required" })
  })

  it("POST /chat/:tenantId returns SSE stream when Accept header is text/event-stream", async () => {
    const { chatRoutes } = await import("../src/routes/chat.js")

    const mockChatService = {
      chat: vi.fn().mockImplementation(
        async (_tid: string, _msg: string, _sid: string | undefined, onChunk?: (c: string) => void) => {
          if (onChunk) {
            onChunk("Hello ")
            onChunk("from Cymek!")
          }
          return { answer: "Hello from Cymek!", sessionId: "session-1", chunks: ["test chunk"] }
        },
      ),
    }

    const app = express()
    app.use(express.json())
    app.use(chatRoutes(mockChatService as never, mockLogger as never))

    let body = ""
    const res = await request(app)
      .post("/chat/tenant-1")
      .set("Accept", "text/event-stream")
      .send({ message: "Hi" })
      .buffer(false)
      .parse((r, cb) => {
        r.on("data", (chunk: Buffer) => { body += chunk.toString() })
        r.on("end", () => cb(null, body))
      })

    expect(res.headers["content-type"]).toBe("text/event-stream")
    expect(body).toContain('"type":"chunk"')
    expect(body).toContain('"type":"done"')
    expect(body).toContain("Hello")
    expect(body).toContain("Cymek")
  })
})

describe("E2E smoke — validation edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("POST /pipeline returns 400 when apiKey is missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ useCase: "Test", files: ["/tmp/doc.pdf"] })
      .expect(400)

    expect(res.body).toEqual({ error: "apiKey is required" })
  })

  it("POST /pipeline returns 400 when useCase is missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", files: ["/tmp/doc.pdf"] })
      .expect(400)

    expect(res.body).toEqual({ error: "useCase is required" })
  })

  it("POST /pipeline returns 400 when files and urls missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test", useCase: "Test" })
      .expect(400)

    expect(res.body).toEqual({ error: "At least one of files or urls is required" })
  })

  it("GET /pipeline/jobs returns 400 when tenantId query param missing", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(chainWithResults([]), {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/jobs")
      .expect(400)

    expect(res.body).toEqual({ error: "tenantId query parameter is required" })
  })

  it("GET /pipeline/jobs with tenantId returns jobs list", async () => {
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")

    const mockDb = chainWithResults([
      [{ id: "job-1", tenantId: "tenant-1", status: "completed", config: {}, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }],
    ])

    const app = express()
    app.use(express.json())
    app.use(pipelineRoutes(mockDb, {} as never, {} as never, mockLogger as never))

    const res = await request(app)
      .get("/pipeline/jobs?tenantId=tenant-1")
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].id).toBe("job-1")
  })
})
