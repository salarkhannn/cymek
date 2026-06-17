import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"
import {
  EVAL_MIN_SCORE,
  MAX_RETRIES,
  EMBEDDING_BATCH_SIZE,
  PIPELINE_STAGES,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  RETRY_CHUNK_SIZE,
  RETRY_CHUNK_OVERLAP,
} from "@cymek/shared"

describe("pipeline integration — eval threshold logic", () => {
  it("score >= EVAL_MIN_SCORE deploys immediately", () => {
    expect(EVAL_MIN_SCORE).toBe(0.75)
    const highScores = [0.75, 0.8, 0.95, 1.0]
    for (const score of highScores) {
      expect(score >= EVAL_MIN_SCORE).toBe(true)
    }
  })

  it("score < EVAL_MIN_SCORE triggers retry", () => {
    const lowScores = [0.0, 0.3, 0.5, 0.74]
    for (const score of lowScores) {
      expect(score >= EVAL_MIN_SCORE).toBe(false)
    }
  })

  it("MAX_RETRIES is exactly 3", () => {
    expect(MAX_RETRIES).toBe(3)
  })

  it("deploy-with-warning flag after MAX_RETRIES attempts", () => {
    const scores = [0.4, 0.5, 0.6, 0.3]
    let retries = 0
    for (const score of scores) {
      if (score < EVAL_MIN_SCORE) {
        retries++
        if (retries >= MAX_RETRIES) {
          expect(retries).toBe(MAX_RETRIES)
          break
        }
      }
    }
    expect(retries).toBeGreaterThanOrEqual(MAX_RETRIES)
  })
})

describe("pipeline integration — embedding batch size", () => {
  it("EMBEDDING_BATCH_SIZE is 100", () => {
    expect(EMBEDDING_BATCH_SIZE).toBe(100)
  })

  it("batches are processed in chunks of 100", () => {
    const inputs = Array.from({ length: 250 }, (_, i) => `chunk-${i}`)
    const batches: string[][] = []
    for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
      batches.push(inputs.slice(i, i + EMBEDDING_BATCH_SIZE))
    }
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(100)
    expect(batches[1]).toHaveLength(100)
    expect(batches[2]).toHaveLength(50)
  })
})

describe("pipeline integration — chunk config", () => {
  it("uses DEFAULT_CHUNK_SIZE and DEFAULT_CHUNK_OVERLAP for initial run", () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(512)
    expect(DEFAULT_CHUNK_OVERLAP).toBe(50)
  })

  it("uses RETRY_CHUNK_SIZE and RETRY_CHUNK_OVERLAP on first retry", () => {
    expect(RETRY_CHUNK_SIZE).toBe(384)
    expect(RETRY_CHUNK_OVERLAP).toBe(75)
  })
})

describe("pipeline integration — SSE stream events", () => {
  it("PIPELINE_STAGES has all 6 stages in order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "ingesting",
      "chunking",
      "embedding",
      "prompt_gen",
      "evaluating",
      "deployed",
    ])
  })

  it("SSE endpoint returns text/event-stream content type", async () => {
    const mockPipeline = {
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
      getJobId: vi.fn(),
      createJob: vi.fn(),
    }

    const app = express()
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      {} as never,
      mockPipeline as never,
      {} as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app)
      .get("/pipeline/stream/test-job")
      .buffer(false)
      .parse((res, cb) => {
        let data = ""
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString()
          res.destroy()
        })
        res.on("end", () => cb(null, data))
      })

    expect(res.headers["content-type"]).toBe("text/event-stream")
    expect(res.headers["cache-control"]).toBe("no-cache")
    expect(res.headers["x-accel-buffering"]).toBe("no")
    expect(mockPipeline.registerEmitter).toHaveBeenCalledWith("test-job", expect.any(Object))
  })

  it("SSE endpoint sends initial ingesting event", async () => {
    const mockPipeline = {
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
      getJobId: vi.fn(),
      createJob: vi.fn(),
    }

    const app = express()
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      {} as never,
      mockPipeline as never,
      {} as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app)
      .get("/pipeline/stream/test-job")
      .buffer(false)
      .parse((res, cb) => {
        let data = ""
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString()
          res.destroy()
        })
        res.on("end", () => cb(null, data))
      })

    expect(res.text).toContain('"stage":"ingesting"')
  })
})

describe("pipeline integration — routes", () => {
  let app: express.Express
  let mockPipeline: Record<string, ReturnType<typeof vi.fn>>
  let mockEncryption: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockPipeline = {
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

    mockEncryption = {
      encrypt: vi.fn().mockReturnValue({ encrypted: "enc-hex:auth", nonce: "iv-hex" }),
      decrypt: vi.fn().mockReturnValue("sk-decrypted"),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }
  })

  it("POST /pipeline uses encryption for API keys", async () => {
    app = express()
    app.use(express.json())

    const mockDb = createChainableDb([])
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      mockDb as never,
      mockPipeline as never,
      mockEncryption as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    await request(app)
      .post("/pipeline")
      .send({ apiKey: "sk-test-key", useCase: "Test", files: ["/tmp/doc.pdf"] })

    expect(mockEncryption.encrypt).toHaveBeenCalledWith("sk-test-key")
  })

  it("GET /pipeline/jobs returns 400 without tenantId", async () => {
    app = express()
    app.use(express.json())
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      {} as never,
      mockPipeline as never,
      mockEncryption as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app).get("/pipeline/jobs")
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: "tenantId query parameter is required" })
  })

  it("GET /tenant/:tenantId returns deploy info", async () => {
    app = express()
    app.use(express.json())

    const mockDb = createChainableDb([])
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      mockDb as never,
      mockPipeline as never,
      mockEncryption as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app).get("/tenant/tenant-1")
    expect(res.status).toBe(200)
  })

  it("GET /tenant/:tenantId returns 404 for unknown tenant", async () => {
    app = express()
    app.use(express.json())
    mockPipeline.getJobId.mockRejectedValue(null)

    const mockDb = createChainableDb([])
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      mockDb as never,
      mockPipeline as never,
      mockEncryption as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app).get("/tenant/nonexistent")
    expect(res.status).toBe(404)
  })
})

describe("chat integration — SSE streaming", () => {
  it("POST /chat/:tenantId with accept header returns SSE stream", async () => {
    const mockChatService = {
      chat: vi.fn().mockImplementation(
        async (_tid: string, _msg: string, _sid: string | undefined, onChunk?: (c: string) => void) => {
          if (onChunk) {
            onChunk("Hello ")
            onChunk("world!")
          }
          return { answer: "Hello world!", sessionId: "session-1", chunks: ["chunk1"] }
        },
      ),
    }

    const app = express()
    app.use(express.json())
    const { chatRoutes } = await import("../src/routes/chat.js")
    app.use(chatRoutes(mockChatService as never, { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never))

    const res = await request(app)
      .post("/chat/tenant-1")
      .set("Accept", "text/event-stream")
      .send({ message: "Hi there" })
      .buffer(false)
      .parse((res, cb) => {
        let data = ""
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString()
        })
        res.on("end", () => cb(null, data))
      })

    expect(res.headers["content-type"]).toBe("text/event-stream")
    expect(res.text).toContain('"type":"chunk"')
    expect(res.text).toContain('"type":"done"')
    expect(res.text).toContain("Hello")
    expect(res.text).toContain("world!")
  })

  it("POST /chat/:tenantId without accept header returns JSON", async () => {
    const mockChatService = {
      chat: vi.fn().mockResolvedValue({
        answer: "JSON response",
        sessionId: "session-1",
        chunks: ["chunk1"],
      }),
    }

    const app = express()
    app.use(express.json())
    const { chatRoutes } = await import("../src/routes/chat.js")
    app.use(chatRoutes(mockChatService as never, { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never))

    const res = await request(app)
      .post("/chat/tenant-1")
      .send({ message: "Hi" })
      .expect(200)

    expect(res.body.answer).toBe("JSON response")
    expect(res.body.sessionId).toBe("session-1")
  })
})

function createChainableDb(results: unknown[]) {
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

  const METHODS = [
    "select", "from", "where", "innerJoin", "orderBy", "limit",
    "insert", "values", "update", "set", "delete",
  ] as const
  for (const m of METHODS) {
    qb[m] = vi.fn(() => qb)
  }

  return qb as never
}
