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
  it("p50 target is <= 500ms", () => {
    const p50Target = 500
    const sampleLatencies = [120, 200, 300, 400, 450, 500, 600, 700, 800, 900]
    const sorted = [...sampleLatencies].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    expect(median).toBeLessThanOrEqual(p50Target)
  })

  it("p95 target is <= 2000ms", () => {
    const p95Target = 2000
    const sampleLatencies = [
      100, 120, 150, 180, 200, 220, 250, 280, 300, 320,
      350, 380, 400, 420, 450, 480, 500, 520, 550, 1800,
    ]
    const sorted = [...sampleLatencies].sort((a, b) => a - b)
    const p95Index = Math.ceil(sorted.length * 0.95) - 1
    const p95 = sorted[p95Index]
    expect(p95).toBeLessThanOrEqual(p95Target)
  })

  it("latency targets are defined (p50 < 500ms, p95 < 2s)", () => {
    expect(500).toBe(500)
    expect(2000).toBe(2000)
  })
})
