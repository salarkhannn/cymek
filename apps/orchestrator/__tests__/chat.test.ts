import { describe, it, expect, vi } from "vitest"

const mockOpenAI = {
  createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  createEmbeddingsBatch: vi.fn().mockResolvedValue([[0.1]]),
  generateSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
  regenerateSystemPrompt: vi.fn().mockResolvedValue("regenerated prompt"),
  generateEvalQA: vi.fn().mockResolvedValue([]),
  evaluateQA: vi.fn().mockResolvedValue({ faithfulness: 0.8, relevance: 0.9 }),
  chatStream: vi.fn().mockResolvedValue("Here is the answer based on your documents."),
}

vi.mock("../src/services/openai.js", () => ({
  createOpenAIService: vi.fn(() => mockOpenAI),
}))

const MOCK_METHODS = [
  "select", "from", "where", "innerJoin", "orderBy", "limit",
  "insert", "values", "returning", "set", "delete",
  "update", "$returningId",
] as const

function createMockDb() {
  const qb: Record<string, unknown> = {
    then: vi.fn((cb: (v: unknown[]) => unknown) =>
      Promise.resolve([{ apiKeyEncrypted: "enc-key", apiKeyNonce: "nonce123" }]).then(cb),
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

describe("chat service", () => {
  it("returns answer with expected fields", async () => {
    const db = createMockDb()
    const encryption = {
      decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
      encrypt: vi.fn().mockReturnValue("encrypted"),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }
    const { createChatService } = await import("../src/services/chat.js")
    const chatService = createChatService(db, mockLogger as never, encryption, "http://localhost:11434/v1")

    const result = await chatService.chat("tenant-1", "What is Cymek?")

    expect(result.answer).toBe("Here is the answer based on your documents.")
    expect(result.sessionId).toBeDefined()
    expect(Array.isArray(result.chunks)).toBe(true)
  })

  it("uses provided sessionId", async () => {
    const db = createMockDb()
    const encryption = {
      decrypt: vi.fn().mockReturnValue("sk-decrypted-key"),
      encrypt: vi.fn().mockReturnValue("encrypted"),
      generateNonce: vi.fn().mockReturnValue(new Uint8Array(12)),
    }
    const { createChatService } = await import("../src/services/chat.js")
    const chatService = createChatService(db, mockLogger as never, encryption, "http://localhost:11434/v1")

    const result = await chatService.chat("tenant-1", "Hello", "my-session")

    expect(result.sessionId).toBe("my-session")
  })
})
