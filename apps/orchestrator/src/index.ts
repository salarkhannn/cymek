import express from "express";
import cookieParser from "cookie-parser";
import { PgBoss, type Job } from "pg-boss";
import pino from "pino";
import { createConnection } from "@cymek/db";
import { loadConfig } from "./config.js";
import type { PipelineConfig } from "@cymek/shared";
import { createEncryptionService } from "./services/encryption.js";
import { createSidecarClient } from "./services/sidecar-client.js";
import { createPipelineService } from "./services/pipeline.js";
import { createChatService } from "./services/chat.js";
import { createAuthService } from "./services/auth.js";
import { pipelineRoutes } from "./routes/pipeline.js";
import { chatRoutes } from "./routes/chat.js";
import { uploadRoutes } from "./routes/upload.js";
import { authRoutes } from "./routes/auth.js";
import { extractPromptRoutes } from "./routes/extract-prompt.js";

async function main() {
  const config = loadConfig();

  const logger = pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  });

  const encryption = createEncryptionService(config.MASTER_ENCRYPTION_KEY);

  const db = createConnection(config.DATABASE_URL);
  const sidecar = createSidecarClient(config.SIDECAR_URL);

  const authService = createAuthService(db, config);

  const pgBoss = new PgBoss(config.DATABASE_URL);

  pgBoss.on("error", (err: Error) => {
    logger.error({ err }, "pg-boss error");
  });

  await pgBoss.start();
  logger.info("pg-boss started");

  await pgBoss.createQueue("pipeline-process");

  const pipeline = createPipelineService(db, sidecar, pgBoss, logger, encryption, config.OPENAI_BASE_URL);

  await pgBoss.work<{ jobId: string; tenantId: string; config: PipelineConfig }>(
    "pipeline-process",
    { batchSize: 1 },
    async (jobs: Job<{ jobId: string; tenantId: string; config: PipelineConfig }>[]) => {
      for (const job of jobs) {
        try {
          await pipeline.processPipeline(job);
          await pgBoss.complete("pipeline-process", job.id);
        } catch (err) {
          logger.error({ err, jobId: job.id }, "Pipeline worker failed");
          const errorMsg = err instanceof Error ? err.message : String(err);
          await pgBoss.fail("pipeline-process", job.id, { error: errorMsg });
        }
      }
    },
  );

  const chatService = createChatService(db, logger, encryption, config.OPENAI_BASE_URL);

  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(authRoutes(authService, config, logger, db));

  app.use(extractPromptRoutes(config.GROQ_API_KEY));

  app.use(uploadRoutes(logger));
  app.use(pipelineRoutes(db, pipeline, encryption, logger));
  app.use(chatRoutes(chatService, logger));

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err }, "Unhandled error");
      res.status(500).json({ error: "Internal server error" });
    },
  );

  const PORT = config.PORT;
  app.listen(PORT, () => {
    logger.info(`Orchestrator listening on :${PORT}`);
  });

  async function shutdown() {
    logger.info("Shutting down...");
    await pgBoss.stop({ graceful: true, timeout: 10000 });
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}
