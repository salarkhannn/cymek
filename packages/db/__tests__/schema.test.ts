import { describe, it, expect } from "vitest"

describe("schema exports", () => {
  it("exports are available", async () => {
    const schema = await import("../src/schema/index.js")
    expect(schema.tenants).toBeDefined()
    expect(schema.jobs).toBeDefined()
    expect(schema.documents).toBeDefined()
    expect(schema.chunks).toBeDefined()
    expect(schema.systemPrompts).toBeDefined()
    expect(schema.evalResults).toBeDefined()
    expect(schema.chatLogs).toBeDefined()
  })
})
