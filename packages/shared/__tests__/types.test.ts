import { describe, it, expect } from "vitest"

describe("types module exports", () => {
  it("re-exports constants", async () => {
    const mod = await import("../src/index.js")
    expect(mod.EMBEDDING_DIMENSIONS).toBeDefined()
    expect(mod.PIPELINE_STAGES).toBeDefined()
    expect(mod.JOB_STATUSES).toBeDefined()
    expect(mod.ROLES).toBeDefined()
  })
})
