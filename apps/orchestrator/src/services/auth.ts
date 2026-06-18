import * as crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@cymek/db/schema";
import type { Config } from "../config.js";

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;
const TOKEN_BYTES = 48;
const SESSION_DAYS = 7;

type Db = PostgresJsDatabase<typeof schema>;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export function createAuthService(db: Db, config: Config) {
  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    const hash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS).toString("hex");
    return `${salt}:${hash}`;
  }

  function verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
  }

  function base64url(buf: Buffer): string {
    return buf.toString("base64url");
  }

  function generateToken(user: AuthUser): string {
    const header = base64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const now = Math.floor(Date.now() / 1000);
    const payload = base64url(
      Buffer.from(JSON.stringify({
        sub: user.id,
        email: user.email,
        iat: now,
        exp: now + config.JWT_EXPIRES_IN,
      })),
    );
    const signature = base64url(
      crypto.createHmac("sha256", config.JWT_SECRET).update(`${header}.${payload}`).digest(),
    );
    return `${header}.${payload}.${signature}`;
  }

  function verifyToken(token: string): AuthUser | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = base64url(
      crypto.createHmac("sha256", config.JWT_SECRET).update(`${header}.${payload}`).digest(),
    );

    try {
      const sigBuf = Buffer.from(signature, "base64url");
      const expectedBuf = Buffer.from(expectedSig, "base64url");
      if (sigBuf.length !== expectedBuf.length) return null;
      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

      const data = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

      return { id: data.sub, email: data.email, name: data.name ?? null };
    } catch {
      return null;
    }
  }

  async function signup(email: string, password: string, name?: string): Promise<{ user: AuthUser; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = hashPassword(password);

    const [created] = await db
      .insert(schema.users)
      .values({
        email: normalizedEmail,
        passwordHash,
        name: name ?? null,
      })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name });

    const user: AuthUser = { id: created.id, email: created.email, name: created.name };
    const token = generateToken(user);

    return { user, token };
  }

  async function login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const [found] = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    if (!found) {
      throw new Error("Invalid email or password");
    }

    if (!verifyPassword(password, found.passwordHash)) {
      throw new Error("Invalid email or password");
    }

    const user: AuthUser = { id: found.id, email: found.email, name: found.name };
    const token = generateToken(user);

    return { user, token };
  }

  async function getUser(userId: string): Promise<AuthUser | null> {
    const [found] = await db
      .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return found ?? null;
  }

  return {
    signup,
    login,
    getUser,
    generateToken,
    verifyToken,
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
