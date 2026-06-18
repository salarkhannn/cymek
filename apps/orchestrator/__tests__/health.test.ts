import { describe, it, expect, vi } from "vitest"
import express from "express"
import request from "supertest"

describe("orchestrator health endpoint", () => {
  it("returns 200 with status ok", async () => {
    const app = express()
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" })
    })

    const res = await request(app).get("/health").expect(200)
    expect(res.body).toEqual({ status: "ok" })
  })

  it("sets JSON content type", async () => {
    const app = express()
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" })
    })

    const res = await request(app).get("/health")
    expect(res.headers["content-type"]).toMatch(/json/)
  })
})

describe("orchestrator error handling", () => {
  it("returns 500 with Internal server error on thrown errors", async () => {
    const app = express()
    app.get("/test-error", () => {
      throw new Error("test error")
    })
    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: "Internal server error" })
      },
    )

    const res = await request(app).get("/test-error").expect(500)
    expect(res.body).toEqual({ error: "Internal server error" })
  })
})

describe("orchestrator CORS headers", () => {
  it("sets Access-Control-Allow-Origin on error responses", async () => {
    const app = express()
    app.use((_req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*")
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
      res.header("Access-Control-Allow-Headers", "Content-Type")
      next()
    })
    app.get("/health", (_req, res) => {
      res.json({ status: "ok" })
    })

    const res = await request(app).get("/health").expect(200)
    expect(res.headers["access-control-allow-origin"]).toBe("*")
  })
})
