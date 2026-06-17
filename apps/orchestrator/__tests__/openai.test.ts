import { describe, it, expect, vi, beforeEach } from "vitest"
import { EMBEDDING_MODEL } from "@cymek/shared"

vi.mock("openai", () => {
  const MockOpenAI = vi.fn(() => ({
    embeddings: {
      create: vi.fn(),
    },
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  }))
  return { default: MockOpenAI }
})

describe("OpenAI service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("createEmbedding returns a single embedding", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      usage: { total_tokens: 5 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: mockCreate },
      chat: { completions: { create: vi.fn() } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.createEmbedding("test text")

    expect(result).toEqual([0.1, 0.2, 0.3])
    expect(mockCreate).toHaveBeenCalledWith({
      model: EMBEDDING_MODEL,
      input: "test text",
    })
  })

  it("createEmbeddingsBatch batches by 100", async () => {
    const OpenAI = (await import("openai")).default
    const inputs = Array.from({ length: 250 }, (_, i) => `chunk ${i}`)
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce({
        data: inputs.slice(0, 100).map((_, i) => ({ index: i, embedding: [i] })),
        usage: { total_tokens: 100 },
      })
      .mockResolvedValueOnce({
        data: inputs.slice(100, 200).map((_, i) => ({ index: i, embedding: [i + 100] })),
        usage: { total_tokens: 100 },
      })
      .mockResolvedValueOnce({
        data: inputs.slice(200).map((_, i) => ({ index: i, embedding: [i + 200] })),
        usage: { total_tokens: 50 },
      })

    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: mockCreate },
      chat: { completions: { create: vi.fn() } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const results = await openAI.createEmbeddingsBatch(inputs)

    expect(results).toHaveLength(250)
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it("generateSystemPrompt returns a string", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "You are a helpful assistant for Cymek docs." } }],
      usage: { total_tokens: 100 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.generateSystemPrompt(
      ["chunk1 content", "chunk2 content"],
      "Customer Support",
      "End users",
    )

    expect(result).toBe("You are a helpful assistant for Cymek docs.")
  })

  it("regenerateSystemPrompt returns a string", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Regenerated assistant prompt." } }],
      usage: { total_tokens: 100 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.regenerateSystemPrompt(
      ["chunk1"],
      "Customer Support",
      "End users",
    )

    expect(result).toBe("Regenerated assistant prompt.")
  })

  it("evaluateQA returns faithfulness and relevance scores", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ faithfulness: 0.8, relevance: 0.9 }) } }],
      usage: { total_tokens: 200 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.evaluateQA("What is X?", "X is Y", ["context chunk"], "system prompt")

    expect(result).toEqual({ faithfulness: 0.8, relevance: 0.9 })
  })

  it("generateEvalQA returns parsed QA pairs", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ pairs: [{ question: "Q1", answer: "A1" }] }) } }],
      usage: { total_tokens: 100 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.generateEvalQA(["chunk content"])

    expect(result).toEqual([{ question: "Q1", answer: "A1" }])
  })

  it("generateEvalQA falls back to empty array on parse failure", async () => {
    const OpenAI = (await import("openai")).default
    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "not json" } }],
      usage: { total_tokens: 50 },
    })
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const result = await openAI.generateEvalQA(["chunk"])

    expect(result).toEqual([])
  })

  it("chatStream collects all chunks", async () => {
    const OpenAI = (await import("openai")).default
    const chunks = ["Hello", ", ", "world", "!"]
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        for (const content of chunks) {
          yield { choices: [{ delta: { content } }] }
        }
      },
    }
    const mockCreate = vi.fn().mockResolvedValue(mockStream)
    ;(OpenAI as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      embeddings: { create: vi.fn() },
      chat: { completions: { create: mockCreate } },
    }))

    const { createOpenAIService } = await import("../src/services/openai.js")
    const openAI = createOpenAIService("sk-test")
    const onChunk = vi.fn()
    const result = await openAI.chatStream(
      [{ role: "user", content: "hi" }],
      onChunk,
    )

    expect(result).toBe("Hello, world!")
    expect(onChunk).toHaveBeenCalledTimes(4)
    expect(onChunk).toHaveBeenNthCalledWith(1, "Hello")
    expect(onChunk).toHaveBeenNthCalledWith(4, "!")
  })
})
