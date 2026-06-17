import { describe, it, expect, vi } from "vitest"

const MOCK_METHODS = [
  "select", "from", "where", "innerJoin", "orderBy", "limit",
  "insert", "values", "returning", "set", "delete",
  "update", "$returningId",
] as const

function qb(arr: unknown[]) {
  let resolvePromise: (v: unknown) => void
  const p = new Promise<unknown>((resolve) => { resolvePromise = resolve })
  setTimeout(() => resolvePromise(arr), 0)

  const obj: Record<string, ReturnType<typeof vi.fn>> = {
    then: vi.fn((cb: (v: unknown) => unknown) => p.then(cb)),
    catch: vi.fn((cb: (e: unknown) => unknown) => p.catch(cb)),
    finally: vi.fn((cb: () => void) => p.finally(cb)),
    [Symbol.toStringTag]: "Promise",
  }

  for (const m of MOCK_METHODS) {
    obj[m] = vi.fn(() => qb(arr))
  }

  return obj as never
}

function createMockDb() {
  return {
    select: vi.fn(() => qb([{ id: "tenant-1" }])),
    insert: vi.fn(() => qb([])),
    update: vi.fn(() => qb([])),
    delete: vi.fn(() => qb([])),
  } as never
}

function createMockOpenAI() {
  return {
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    createEmbeddingsBatch: vi.fn().mockResolvedValue([[0.1]]),
    generateSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
    regenerateSystemPrompt: vi.fn().mockResolvedValue("regenerated prompt"),
    generateEvalQA: vi.fn().mockResolvedValue([]),
    evaluateQA: vi.fn().mockResolvedValue({ faithfulness: 0.8, relevance: 0.9 }),
    chatStream: vi.fn().mockResolvedValue("Here is the answer based on your documents."),
  }
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
    const openAI = createMockOpenAI()
    const { createChatService: ccs } = await import("../src/services/chat.js")
    const chatService = ccs(db, openAI, mockLogger as never)

    const result = await chatService.chat("tenant-1", "What is Cymek?")

    expect(result.answer).toBe("Here is the answer based on your documents.")
    expect(result.sessionId).toBeDefined()
    expect(Array.isArray(result.chunks)).toBe(true)
  })

  it("uses provided sessionId", async () => {
    const db = createMockDb()
    const openAI = createMockOpenAI()
    const { createChatService: ccs } = await import("../src/services/chat.js")
    const chatService = ccs(db, openAI, mockLogger as never)

    const result = await chatService.chat("tenant-1", "Hello", "my-session")

    expect(result.sessionId).toBe("my-session")
  })
})
