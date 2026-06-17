import { describe, it, expect, beforeEach } from "vitest"

const ORIG_ENV = { ...process.env }

describe("config", () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV }
  })

  it("loads config with defaults when no env vars set", async () => {
    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.PORT).toBe(3001)
    expect(config.DATABASE_URL).toBe("postgres://localhost:5432/cymek")
    expect(config.MASTER_ENCRYPTION_KEY).toBe("dev-master-key-32-bytes-long!!!")
    expect(config.SIDECAR_URL).toBe("http://localhost:8001")
    expect(config.OPENAI_BASE_URL).toBe("http://localhost:11434/v1")
    expect(config.LOG_LEVEL).toBe("info")
    expect(config.NODE_ENV).toBe("development")
  })

  it("loads config from env vars", async () => {
    process.env.PORT = "4000"
    process.env.DATABASE_URL = "postgres://prod:5432/cymek"
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1"
    process.env.SIDECAR_URL = "http://sidecar:8000"
    process.env.MASTER_ENCRYPTION_KEY = "prod-key-32-bytes-long!!!!!!!"
    process.env.LOG_LEVEL = "error"
    process.env.NODE_ENV = "production"

    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.PORT).toBe(4000)
    expect(config.DATABASE_URL).toBe("postgres://prod:5432/cymek")
    expect(config.OPENAI_BASE_URL).toBe("https://api.openai.com/v1")
    expect(config.LOG_LEVEL).toBe("error")
    expect(config.NODE_ENV).toBe("production")
  })

  it("rejects invalid LOG_LEVEL", async () => {
    process.env.LOG_LEVEL = "verbose"
    const { loadConfig } = await import("../src/config.js")
    expect(() => loadConfig()).toThrow()
  })
})
