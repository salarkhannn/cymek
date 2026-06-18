import { Router, type Request } from "express";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@cymek/db/schema";
import type { AuthService } from "../services/auth.js";
import type { Config } from "../config.js";
import type pino from "pino";

type Db = PostgresJsDatabase<typeof schema>;

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function authRoutes(auth: AuthService, config: Config, logger: pino.Logger, db?: Db): Router {
  const router = Router();

  router.post("/auth/signup", async (req, res, next) => {
    try {
      const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "Invalid email format" });
        return;
      }

      const result = await auth.signup(email, password, name);

      const isSecure = config.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        `token=${result.token}; HttpOnly; Path=/; Max-Age=${config.JWT_EXPIRES_IN}; SameSite=Lax${isSecure ? "; Secure" : ""}`,
      );

      res.status(201).json({ user: result.user, token: result.token });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      if (message === "Email already registered") {
        res.status(409).json({ error: message });
        return;
      }
      next(err);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const result = await auth.login(email, password);

      const isSecure = config.NODE_ENV === "production";
      res.setHeader(
        "Set-Cookie",
        `token=${result.token}; HttpOnly; Path=/; Max-Age=${config.JWT_EXPIRES_IN}; SameSite=Lax${isSecure ? "; Secure" : ""}`,
      );

      res.json({ user: result.user, token: result.token });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message === "Invalid email or password") {
        res.status(401).json({ error: message });
        return;
      }
      next(err);
    }
  });

  router.post("/auth/logout", (_req, res) => {
    res.setHeader(
      "Set-Cookie",
      "token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    );
    res.json({ success: true });
  });

  function resolveUser(req: Request): ReturnType<typeof auth.verifyToken> {
    if (req.user) return req.user;

    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (cookies.token) {
      token = cookies.token;
    }

    if (!token) return null;
    return auth.verifyToken(token);
  }

  router.get("/auth/me", (req, res) => {
    const user = resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ user });
  });

  router.get("/auth/tenants", (req, res, next) => {
    const user = resolveUser(req);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    if (!db) {
      res.json({ tenants: [] });
      return;
    }

    db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        useCase: schema.tenants.useCase,
        createdAt: schema.tenants.createdAt,
        updatedAt: schema.tenants.updatedAt,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.userId, user.id))
      .orderBy(schema.tenants.createdAt)
      .then((tenants) => {
        res.json({ tenants });
      })
      .catch(next);
  });

  return router;
}
