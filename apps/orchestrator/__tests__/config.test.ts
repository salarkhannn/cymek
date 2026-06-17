import { describe, it, expect, beforeEach } from "vitest"

const OLD_ENV = process.env

beforeEach(() => {
  process.env = { ...OLD_ENV }
})

describe("config", () => {
  it("loads config with defaults when no env vars set", async () => {
    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.PORT).toBe(3001)
    expect(config.DATABASE_URL).toBe("postgres://localhost:5432/cymek")
    expect(config.MASTER_ENCRYPTION_KEY).toBe("dev-master-key-32-bytes-long!!!")
    expect(config.OPENAI_API_KEY).toBe("sk-placeholder")
    expect(config.SIDECAR_URL).toBe("http://localhost:8000")
    expect(config.LOG_LEVEL).toBe("info")
    expect(config.NODE_ENV).toBe("development")
  })

  it("loads config from env vars", async () => {
    process.env.PORT = "4000"
    process.env.DATABASE_URL = "postgres://prod:5432/cymek"
    process.env.OPENAI_API_KEY = "sk-real-key"
    process.env.LOG_LEVEL = "error"
    process.env.NODE_ENV = "production"
    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.PORT).toBe(4000)
    expect(config.DATABASE_URL).toBe("postgres://prod:5432/cymek")
    expect(config.OPENAI_API_KEY).toBe("sk-real-key")
    expect(config.LOG_LEVEL).toBe("error")
    expect(config.NODE_ENV).toBe("production")
  })

  it("rejects invalid LOG_LEVEL", async () => {
    process.env.LOG_LEVEL = "invalid"
    const { loadConfig } = await import("../src/config.js")
    expect(() => loadConfig()).toThrow()
  })
})
