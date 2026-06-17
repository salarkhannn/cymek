import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const chatLogs = pgTable("chat_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  latencyMs: integer("latency_ms"),
  chunksRetrieved: text("chunks_retrieved"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
