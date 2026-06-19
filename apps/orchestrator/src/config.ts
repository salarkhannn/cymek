import { z } from "zod";
import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Automatically load .env file if running in Node 20.6.0+
if (typeof process.loadEnvFile === "function") {
  try {
    const envPath = resolve(process.cwd(), ".env");
    if (existsSync(envPath)) {
      process.loadEnvFile(envPath);
    } else {
      const __filename = fileURLToPath(import.meta.url);
      const rootEnv = resolve(__filename, "../../../../.env");
      if (existsSync(rootEnv)) {
        process.loadEnvFile(rootEnv);
      }
    }
  } catch {
    // ignore
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default("postgres://localhost:5432/cymek"),
  MASTER_ENCRYPTION_KEY: z.string().default("dev-master-key-32-bytes-long!!!"),
  OPENAI_BASE_URL: z.string().default("http://localhost:11434/v1"),
  SIDECAR_URL: z.string().default("http://localhost:8001"),
  JWT_SECRET: z.string().default("cymek-dev-jwt-secret-min-32-chars!!"),
  JWT_EXPIRES_IN: z.coerce.number().default(604800),
  GROQ_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  return envSchema.parse(process.env);
}
