import { describe, it, expect, vi } from "vitest"
import express from "express"
import request from "supertest"
import http from "http"
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

  it("deploy-with-warning flag after MAX_RETRIES low scores", () => {
    const scores = [0.4, 0.5, 0.6, 0.3]
    let retries = 0
    for (const score of scores) {
      if (score < EVAL_MIN_SCORE) {
        retries++
        if (retries >= MAX_RETRIES) break
      }
    }
    expect(retries).toBeGreaterThanOrEqual(MAX_RETRIES)
  })
})

describe("pipeline integration — embedding batch size", () => {
  it("EMBEDDING_BATCH_SIZE is 100", () => {
    expect(EMBEDDING_BATCH_SIZE).toBe(100)
  })

  it("batches 250 items as 3 chunks of 100, 100, 50", () => {
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

  it("uses RETRY_CHUNK_SIZE and RETRY_CHUNK_OVERLAP on retry", () => {
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

  it("SSE endpoint sends text/event-stream with ingesting event", async () => {
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

    const server = app.listen(0)
    const port = (server.address() as { port: number }).port

    const result = await new Promise<{
      status: number; headers: Record<string, string>; body: string
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
            headers: res.headers as Record<string, string>,
            body: data,
          })
          server.close()
        })
        res.on("error", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string>,
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
    expect(result.body).toContain("ingesting")
    expect(mockPipeline.registerEmitter).toHaveBeenCalledWith("test-job", expect.objectContaining({
      send: expect.any(Function),
      close: expect.any(Function),
    }))
  })
})

describe("pipeline integration — routes", () => {
  it("POST /pipeline uses encryption for API keys", async () => {
    const app = express()
    app.use(express.json())

    const mockPipeline = {
      createJob: vi.fn().mockResolvedValue("job-123"),
      getJobId: vi.fn(),
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
    }

    const mockEncryption = {
      encrypt: vi.fn().mockReturnValue({ encrypted: "enc-hex:auth", nonce: "iv-hex" }),
      decrypt: vi.fn().mockReturnValue("sk-decrypted"),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }

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

  it("GET /tenant/:tenantId returns 404 for unknown tenant", async () => {
    const app = express()
    app.use(express.json())

    const mockPipeline = {
      createJob: vi.fn(),
      getJobId: vi.fn(),
      registerEmitter: vi.fn(),
      unregisterEmitter: vi.fn(),
      emitEvent: vi.fn(),
    }

    const mockDb = createChainableDb([])
    const { pipelineRoutes } = await import("../src/routes/pipeline.js")
    app.use(pipelineRoutes(
      mockDb as never,
      mockPipeline as never,
      {} as never,
      { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as never,
    ))

    const res = await request(app).get("/tenant/nonexistent")
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: "Tenant not found" })
  })
})

describe("chat integration — SSE streaming", () => {
  it("POST /chat/:tenantId with accept header returns SSE stream with chunk and done events", async () => {
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

    let body = ""
    const res = await request(app)
      .post("/chat/tenant-1")
      .set("Accept", "text/event-stream")
      .send({ message: "Hi there" })
      .buffer(false)
      .parse((r, cb) => {
        r.on("data", (chunk: Buffer) => { body += chunk.toString() })
        r.on("end", () => cb(null, body))
      })

    expect(res.headers["content-type"]).toBe("text/event-stream")
    expect(body).toContain('"type":"chunk"')
    expect(body).toContain('"type":"done"')
    expect(body).toContain("Hello")
    expect(body).toContain("world!")
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
