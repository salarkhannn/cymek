import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = new URL("..", import.meta.url).pathname

describe("web layout", () => {
  it("exports metadata with correct values", () => {
    const layoutPath = join(ROOT, "app/layout.tsx")
    const content = readFileSync(layoutPath, "utf-8")
    expect(content).toContain('title: "Cymek — AI Pipeline Builder"')
    expect(content).toContain('description: "One prompt. One pipeline. Deploy your AI in minutes."')
  })
})
