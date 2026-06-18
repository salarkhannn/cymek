import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = new URL("..", import.meta.url).pathname

describe("web layout", () => {
  it("exports metadata with correct values", () => {
    const layoutPath = join(ROOT, "app/layout.tsx")
    const content = readFileSync(layoutPath, "utf-8")
    expect(content).toContain('title: "Cymek"')
    expect(content).toContain('description: "Your docs, your data, your edge."')
  })
})
