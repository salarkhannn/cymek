import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { jobs } from "./jobs";

export const evalResults = pgTable("eval_results", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(),
  metricValue: doublePrecision("metric_value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
