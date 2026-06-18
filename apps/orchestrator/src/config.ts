import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://localhost:5432/cymek"),
  MASTER_ENCRYPTION_KEY: z.string().default("dev-master-key-32-bytes-long!!!"),
  OPENAI_BASE_URL: z.string().default("http://localhost:11434/v1"),
  SIDECAR_URL: z.string().default("http://localhost:8001"),
  JWT_SECRET: z.string().default("cymek-dev-jwt-secret-min-32-chars!!"),
  JWT_EXPIRES_IN: z.coerce.number().default(604800),
  OPENROUTER_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  return envSchema.parse(process.env);
}
