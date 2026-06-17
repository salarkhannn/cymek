import { describe, it, expect } from "vitest"

describe("web layout", () => {
  it("exports metadata", async () => {
    const mod = await import("../app/layout.js")
    expect(mod.metadata).toBeDefined()
    expect(mod.metadata.title).toBe("Cymek")
    expect(mod.metadata.description).toBe("Your docs, your data, your edge.")
  })
})
