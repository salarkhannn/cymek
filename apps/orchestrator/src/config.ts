import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://localhost:5432/cymek"),
  MASTER_ENCRYPTION_KEY: z.string().default("dev-master-key-32-bytes-long!!!"),
  OPENAI_API_KEY: z.string().default("sk-placeholder"),
  SIDECAR_URL: z.string().default("http://localhost:8000"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  return envSchema.parse(process.env);
}
