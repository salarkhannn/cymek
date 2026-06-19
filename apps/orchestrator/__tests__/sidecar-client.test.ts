import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("fs", () => ({
  readFileSync: () => Buffer.from("dummy file content"),
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

describe("sidecar client", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("extractFile sends path and returns result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ metadata: { source: "doc.pdf" }, text: "extracted text" }),
    })

    const { createSidecarClient } = await import("../src/services/sidecar-client.js")
    const client = createSidecarClient("http://localhost:8000")
    const result = await client.extractFile("/tmp/doc.pdf")

    expect(result).toEqual({ filename: "doc.pdf", content: "extracted text" })
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/extract/file", {
      method: "POST",
      body: expect.any(FormData),
    })
  })

  it("extractUrl sends url and returns result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ metadata: { source: "page.html" }, text: "web content" }),
    })

    const { createSidecarClient } = await import("../src/services/sidecar-client.js")
    const client = createSidecarClient("http://localhost:8000")
    const result = await client.extractUrl("https://example.com")

    expect(result).toEqual({ filename: "page.html", content: "web content" })
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:8000/extract/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    })
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal error"),
    })

    const { createSidecarClient } = await import("../src/services/sidecar-client.js")
    const client = createSidecarClient("http://localhost:8000")
    await expect(client.extractFile("/tmp/doc.pdf")).rejects.toThrow("Sidecar extract failed (500): Internal error")
  })
})
