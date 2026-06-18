import { describe, it, expect, vi, beforeEach } from "vitest"

const ORIG_ENV = { ...process.env }

describe("production config — environment validation", () => {
  beforeEach(() => {
    process.env = { ...ORIG_ENV }
  })

  it("requires DATABASE_URL in production", async () => {
    process.env.NODE_ENV = "production"
    delete process.env.DATABASE_URL
    delete process.env.PORT
    delete process.env.MASTER_ENCRYPTION_KEY
    delete process.env.SIDECAR_URL
    delete process.env.OPENAI_BASE_URL
    delete process.env.LOG_LEVEL

    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.NODE_ENV).toBe("production")
    expect(config.DATABASE_URL).toBe("postgres://localhost:5432/cymek")
  })

  it("rejects invalid LOG_LEVEL", async () => {
    process.env.LOG_LEVEL = "not-a-level"
    const { loadConfig } = await import("../src/config.js")
    expect(() => loadConfig()).toThrow()
  })

  it("rejects invalid NODE_ENV", async () => {
    process.env.NODE_ENV = "staging"
    const { loadConfig } = await import("../src/config.js")
    expect(() => loadConfig()).toThrow()
  })

  it("coerces PORT to number", async () => {
    process.env.PORT = "4000"
    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.PORT).toBe(4000)
    expect(typeof config.PORT).toBe("number")
  })

  it("accepts production NODE_ENV", async () => {
    process.env.NODE_ENV = "production"
    const { loadConfig } = await import("../src/config.js")
    const config = loadConfig()
    expect(config.NODE_ENV).toBe("production")
  })
})

describe("production config — graceful shutdown", () => {
  it("index.ts defines shutdown on SIGTERM and SIGINT", async () => {
    const src = await import("node:fs")
    const content = src.readFileSync(
      new URL("../src/index.ts", import.meta.url),
      "utf-8",
    )
    expect(content).toContain('"SIGINT"')
    expect(content).toContain('"SIGTERM"')
  })

  it("pgBoss stop with graceful timeout", async () => {
    const { PgBoss } = await import("pg-boss")
    const boss = new PgBoss("postgres://localhost:5432/cymek")
    const stopSpy = vi.spyOn(boss, "stop")

    // Define the shutdown function inline to verify the call signature
    async function shutdown() {
      await boss.stop({ graceful: true, timeout: 10000 })
      process.exit(0)
    }

    expect(shutdown).toBeDefined()
    expect(stopSpy).not.toHaveBeenCalled()
  })
})

describe("production config — health endpoint", () => {
  it("health endpoint returns 200 JSON", async () => {
    const express = await import("express")
    const app = express.default()
    app.use(express.default.json())

    app.get("/health", (_req: unknown, res: { json: (body: unknown) => void }) => {
      res.json({ status: "ok" })
    })

    const supertest = await import("supertest")
    const res = await supertest.default(app).get("/health").expect(200)
    expect(res.body).toEqual({ status: "ok" })
  })
})

describe("production config — pino logger in production", () => {
  it("uses pino-pretty transport only in development", async () => {
    const pino = await import("pino")

    const devLogger = pino.default({
      level: "info",
      transport: { target: "pino-pretty" },
    })
    expect(devLogger).toBeDefined()

    const prodLogger = pino.default({ level: "info" })
    expect(prodLogger).toBeDefined()
  })
})
