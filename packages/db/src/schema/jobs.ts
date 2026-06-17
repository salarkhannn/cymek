import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.js";

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["queued", "processing", "completed", "failed"] })
    .notNull()
    .default("queued"),
  stage: text("stage", {
    enum: ["ingesting", "chunking", "embedding", "prompt_gen", "evaluating", "deployed"],
  }),
  config: jsonb("config").notNull().default({}),
  retryCount: integer("retry_count").notNull().default(0),
  warning: boolean("warning").notNull().default(false),
  error: text("error"),
  extractedCount: integer("extracted_count"),
  chunkCount: integer("chunk_count"),
  evalScore: doublePrecision("eval_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
