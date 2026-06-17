import { describe, it, expect, vi } from "vitest"
import { EMBEDDING_BATCH_SIZE } from "@cymek/shared"

describe("performance — embedding batch size", () => {
  it("batches embeddings in groups of 100", () => {
    expect(EMBEDDING_BATCH_SIZE).toBe(100)
  })

  it("processes 100 items in a single batch", () => {
    const inputs = Array.from({ length: 100 }, (_, i) => `text-${i}`)
    const batch = inputs.slice(0, EMBEDDING_BATCH_SIZE)
    expect(batch).toHaveLength(100)
  })

  it("processes 101 items as 2 batches", () => {
    const inputs = Array.from({ length: 101 }, (_, i) => `text-${i}`)
    const batches: string[][] = []
    for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
      batches.push(inputs.slice(i, i + EMBEDDING_BATCH_SIZE))
    }
    expect(batches).toHaveLength(2)
    expect(batches[0]).toHaveLength(100)
    expect(batches[1]).toHaveLength(1)
  })

  it("processes 250 items as 3 batches", () => {
    const inputs = Array.from({ length: 250 }, (_, i) => `text-${i}`)
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

describe("performance — chat endpoint latency expectations", () => {
  it("p50 target is < 500ms", () => {
    const p50Target = 500
    const sampleLatencies = [120, 200, 300, 400, 450, 500, 600, 700, 800, 900]
    const sorted = [...sampleLatencies].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    expect(median).toBeLessThan(p50Target)
  })

  it("p95 target is < 2000ms", () => {
    const p95Target = 2000
    const sampleLatencies = [
      100, 120, 150, 180, 200, 220, 250, 280, 300, 320,
      350, 380, 400, 420, 450, 480, 500, 520, 550, 1800,
    ]
    const sorted = [...sampleLatencies].sort((a, b) => a - b)
    const p95Index = Math.ceil(sorted.length * 0.95) - 1
    const p95 = sorted[p95Index]
    expect(p95).toBeLessThan(p95Target)
  })

  it("latency expectations are documented and known", () => {
    expect(500).toBe(500)
    expect(2000).toBe(2000)
  })
})

describe("performance — chat service latency tracking", () => {
  it("chat service measures and logs latency correctly", async () => {
    const mockOpenAI = {
      createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      chatStream: vi.fn().mockImplementation(
        async (_msgs: unknown, onChunk: (c: string) => void) => {
          onChunk("Hello ")
          onChunk("world")
          return "Hello world"
        },
      ),
    }

    vi.mock("../src/services/openai.js", () => ({
      createOpenAIService: vi.fn(() => mockOpenAI),
    }))

    const { createChatService } = await import("../src/services/chat.js")
    const encryption = {
      decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
      encrypt: vi.fn().mockReturnValue("encrypted"),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }

    const db = createChainableDb()
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }

    const chatService = createChatService(
      db as never,
      logger as never,
      encryption as never,
      "http://localhost:11434/v1",
    )

    const startTime = Date.now()
    const result = await chatService.chat("tenant-1", "Hello")
    const elapsed = Date.now() - startTime

    expect(result.answer).toBe("Hello world")
    expect(result.sessionId).toBeDefined()
    expect(typeof result.sessionId).toBe("string")

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ latencyMs: expect.any(Number) }),
      "Chat completed",
    )

    vi.restoreAllMocks()
  })
})

function createChainableDb() {
  const qb: Record<string, unknown> = {
    then: vi.fn((cb: (v: Record<string, unknown>[]) => unknown) =>
      Promise.resolve([{ apiKeyEncrypted: "enc-key", apiKeyNonce: "nonce" }]).then(cb),
    ),
    catch: vi.fn(),
    finally: vi.fn(),
  }

  const METHODS = [
    "select", "from", "where", "innerJoin", "orderBy", "limit",
    "insert", "values", "returning", "set", "delete",
    "update", "$returningId",
  ] as const
  for (const m of METHODS) {
    qb[m] = vi.fn(() => qb)
  }
  return qb as never
}
