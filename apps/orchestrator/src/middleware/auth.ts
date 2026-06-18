import type { Request, Response, NextFunction } from "express";
import type { AuthService, AuthUser } from "../services/auth.js";
import * as schema from "@cymek/db/schema";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";

type Db = PostgresJsDatabase<typeof schema>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(auth: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;

      let token: string | null = null;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else if (cookieToken) {
        token = cookieToken;
      }

      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const user = auth.verifyToken(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ error: "Authentication failed" });
    }
  };
}

export function optionalAuth(auth: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;

      let token: string | null = null;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      } else if (cookieToken) {
        token = cookieToken;
      }

      if (token) {
        const user = auth.verifyToken(token);
        if (user) {
          req.user = user;
        }
      }

      next();
    } catch {
      next();
    }
  };
}

export function requireTenantAccess(db: Db) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.params.tenantId || req.body?.tenantId || (req.query?.tenantId as string);
    const userId = req.user?.id;

    if (!tenantId) {
      next();
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Authentication required for tenant access" });
      return;
    }

    db
      .select({ id: schema.tenants.id, userId: schema.tenants.userId })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1)
      .then((rows) => {
        const tenant = rows[0];
        if (!tenant) {
          res.status(404).json({ error: "Tenant not found" });
          return;
        }

        if (tenant.userId && tenant.userId !== userId) {
          res.status(403).json({ error: "Access denied: you do not own this tenant" });
          return;
        }

        next();
      })
      .catch(() => {
        res.status(500).json({ error: "Tenant access check failed" });
      });
  };
}
