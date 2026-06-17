import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, vector } from "drizzle-orm/pg-core";
import { documents } from "./documents";

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
