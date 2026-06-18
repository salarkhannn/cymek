import { describe, it, expect, vi, beforeEach } from "vitest"
import express from "express"
import request from "supertest"
import type { AuthService } from "../src/services/auth.js"
import type { Config } from "../src/config.js"

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

const testConfig: Config = {
  PORT: 3001,
  DATABASE_URL: "postgres://localhost:5432/cymek",
  MASTER_ENCRYPTION_KEY: "dev-master-key-32-bytes-long!!!",
  OPENAI_BASE_URL: "http://localhost:11434/v1",
  SIDECAR_URL: "http://localhost:8001",
  JWT_SECRET: "test-jwt-secret-for-testing-purposes!!",
  JWT_EXPIRES_IN: 3600,
  LOG_LEVEL: "info",
  NODE_ENV: "test",
}

function createMockAuthService(): AuthService {
  const tokens = new Map<string, { id: string; email: string; name: string | null }>()

  return {
    signup: vi.fn(async (email: string, password: string, name?: string) => {
      if (email === "existing@test.com") {
        throw new Error("Email already registered")
      }
      const user = { id: "user-123", email: email.toLowerCase().trim(), name: name ?? null }
      const token = `test-token-${user.id}`
      tokens.set(token, user)
      return { user, token }
    }),
    login: vi.fn(async (email: string, password: string) => {
      if (email === "test@test.com" && password === "correct-password") {
        const user = { id: "user-123", email: "test@test.com", name: "Test User" }
        const token = `test-token-${user.id}`
        tokens.set(token, user)
        return { user, token }
      }
      throw new Error("Invalid email or password")
    }),
    getUser: vi.fn(async (userId: string) => {
      if (userId === "user-123") {
        return { id: "user-123", email: "test@test.com", name: "Test User" }
      }
      return null
    }),
    generateToken: vi.fn((user) => {
      const token = `test-token-${user.id}`
      tokens.set(token, user)
      return token
    }),
    verifyToken: vi.fn((token: string) => {
      const user = tokens.get(token)
      return user ?? null
    }),
  }
}

describe("auth routes - signup", () => {
  let app: express.Express
  let mockAuth: AuthService

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockAuth = createMockAuthService()

    const { authRoutes } = await import("../src/routes/auth.js")
    app.use(authRoutes(mockAuth, testConfig, mockLogger as never))
  })

  it("POST /auth/signup creates a new user", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "new@test.com", password: "password123", name: "New User" })
      .expect(201)

    expect(res.body.user.email).toBe("new@test.com")
    expect(res.body.user.name).toBe("New User")
    expect(res.body.token).toBeTruthy()
    expect(mockAuth.signup).toHaveBeenCalledWith("new@test.com", "password123", "New User")
  })

  it("POST /auth/signup returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ password: "password123" })
      .expect(400)

    expect(res.body).toEqual({ error: "Email and password are required" })
  })

  it("POST /auth/signup returns 400 when password is missing", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "test@test.com" })
      .expect(400)

    expect(res.body).toEqual({ error: "Email and password are required" })
  })

  it("POST /auth/signup returns 400 when password is too short", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "test@test.com", password: "1234567" })
      .expect(400)

    expect(res.body).toEqual({ error: "Password must be at least 8 characters" })
  })

  it("POST /auth/signup returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "not-an-email", password: "password123" })
      .expect(400)

    expect(res.body).toEqual({ error: "Invalid email format" })
  })

  it("POST /auth/signup returns 409 when email already exists", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ email: "existing@test.com", password: "password123" })
      .expect(409)

    expect(res.body).toEqual({ error: "Email already registered" })
  })
})

describe("auth routes - login", () => {
  let app: express.Express
  let mockAuth: AuthService

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockAuth = createMockAuthService()

    const { authRoutes } = await import("../src/routes/auth.js")
    app.use(authRoutes(mockAuth, testConfig, mockLogger as never))
  })

  it("POST /auth/login returns user and token for valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "correct-password" })
      .expect(200)

    expect(res.body.user.email).toBe("test@test.com")
    expect(res.body.token).toBeTruthy()
    expect(mockAuth.login).toHaveBeenCalledWith("test@test.com", "correct-password")
  })

  it("POST /auth/login returns 401 for invalid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "wrong-password" })
      .expect(401)

    expect(res.body).toEqual({ error: "Invalid email or password" })
  })

  it("POST /auth/login returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ password: "password123" })
      .expect(400)

    expect(res.body).toEqual({ error: "Email and password are required" })
  })

  it("POST /auth/login sets httpOnly cookie on success", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@test.com", password: "correct-password" })
      .expect(200)

    const setCookie = res.headers["set-cookie"]
    expect(setCookie).toBeDefined()
    expect(setCookie[0]).toContain("HttpOnly")
    expect(setCookie[0]).toContain("token=")
  })
})

describe("auth routes - logout", () => {
  let app: express.Express
  let mockAuth: AuthService

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockAuth = createMockAuthService()

    const { authRoutes } = await import("../src/routes/auth.js")
    app.use(authRoutes(mockAuth, testConfig, mockLogger as never))
  })

  it("POST /auth/logout clears the cookie", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .expect(200)

    expect(res.body).toEqual({ success: true })
    const setCookie = res.headers["set-cookie"]
    expect(setCookie).toBeDefined()
    expect(setCookie[0]).toContain("Max-Age=0")
  })
})

describe("auth routes - me", () => {
  let app: express.Express
  let mockAuth: AuthService

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockAuth = createMockAuthService()

    const { authRoutes } = await import("../src/routes/auth.js")
    app.use(authRoutes(mockAuth, testConfig, mockLogger as never))
  })

  it("GET /auth/me returns user with valid token", async () => {
    const signupRes = await request(app)
      .post("/auth/signup")
      .send({ email: "me@test.com", password: "password123" })

    const token = signupRes.body.token

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)

    expect(res.body.user).toBeDefined()
    expect(res.body.user.email).toBe("me@test.com")
  })

  it("GET /auth/me returns 401 without token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .expect(401)

    expect(res.body).toEqual({ error: "Not authenticated" })
  })

  it("GET /auth/me returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401)

    expect(res.body).toEqual({ error: "Not authenticated" })
  })
})

describe("auth routes - requireAuth middleware", () => {
  let app: express.Express
  let mockAuth: AuthService

  beforeEach(async () => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    mockAuth = createMockAuthService()

    const { requireAuth } = await import("../src/middleware/auth.js")

    app.get("/protected", requireAuth(mockAuth), (_req: express.Request, res: express.Response) => {
      res.json({ success: true })
    })
  })

  it("allows access with valid Bearer token", async () => {
    mockAuth = createMockAuthService()

    const { requireAuth } = await import("../src/middleware/auth.js")
    app = express()
    app.use(express.json())
    app.get("/protected", requireAuth(mockAuth), (_req: express.Request, res: express.Response) => {
      res.json({ success: true })
    })

    const user = { id: "user-1", email: "test@test.com", name: null }
    const token = mockAuth.generateToken!(user)

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)

    expect(res.body.success).toBe(true)
  })

  it("rejects access without token", async () => {
    const res = await request(app)
      .get("/protected")
      .expect(401)

    expect(res.body).toEqual({ error: "Authentication required" })
  })

  it("rejects access with invalid token", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer fake-token")
      .expect(401)

    expect(res.body).toEqual({ error: "Invalid or expired token" })
  })
})

describe("auth service - unit tests", () => {
  it("token generation and verification roundtrip", async () => {
    const { createAuthService } = await import("../src/services/auth.js")

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "user-1", email: "test@test.com", name: "Test" }]),
      then: vi.fn(),
      catch: vi.fn(),
    } as never

    const auth = createAuthService(mockDb, testConfig)

    const token = auth.generateToken({ id: "user-1", email: "test@test.com", name: "Test" })
    expect(token).toBeTruthy()
    expect(token.split(".").length).toBe(3)

    const user = auth.verifyToken(token)
    expect(user).toBeDefined()
    expect(user!.id).toBe("user-1")
    expect(user!.email).toBe("test@test.com")
  })

  it("verifyToken returns null for tampered token", async () => {
    const { createAuthService } = await import("../src/services/auth.js")
    const mockDb = {} as never

    const auth = createAuthService(mockDb, testConfig)
    const token = auth.generateToken({ id: "user-1", email: "test@test.com", name: null })

    const parts = token.split(".")
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`

    const result = auth.verifyToken(tamperedToken)
    expect(result).toBeNull()
  })

  it("verifyToken returns null for expired token", async () => {
    const { createAuthService } = await import("../src/services/auth.js")
    const mockDb = {} as never

    const expiredConfig = { ...testConfig, JWT_EXPIRES_IN: -1 }
    const auth = createAuthService(mockDb, expiredConfig)

    const token = auth.generateToken({ id: "user-1", email: "test@test.com", name: null })

    const result = auth.verifyToken(token)
    expect(result).toBeNull()
  })
})
