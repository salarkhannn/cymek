import express from "express";
import PgBoss from "pg-boss";
import pino from "pino";
import { createConnection } from "@cymek/db";
import { loadConfig } from "./config.js";
import type { PipelineConfig } from "@cymek/shared";
import { createEncryptionService } from "./services/encryption.js";
import { createOpenAIService } from "./services/openai.js";
import { createSidecarClient } from "./services/sidecar-client.js";
import { createPipelineService } from "./services/pipeline.js";
import { createChatService } from "./services/chat.js";
import { pipelineRoutes } from "./routes/pipeline.js";
import { chatRoutes } from "./routes/chat.js";

async function main() {
  const config = loadConfig();

  const logger = pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === "development"
        ? { target: "pino-pretty" }
        : undefined,
  });

  createEncryptionService(config.MASTER_ENCRYPTION_KEY);

  const db = createConnection(config.DATABASE_URL);

  const openAI = createOpenAIService(config.OPENAI_API_KEY, config.OPENAI_BASE_URL);

  const sidecar = createSidecarClient(config.SIDECAR_URL);

  const pgBoss = new PgBoss(config.DATABASE_URL);

  pgBoss.on("error", (err) => {
    logger.error({ err }, "pg-boss error");
  });

  await pgBoss.start();
  logger.info("pg-boss started");

  const pipeline = createPipelineService(db, openAI, sidecar, pgBoss, logger);

  await pgBoss.work<{ jobId: string; tenantId: string; config: PipelineConfig }>(
    "pipeline-process",
    { batchSize: 1 },
    async (jobs) => {
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
  });

  const chatService = createChatService(db, openAI, logger);

  const app = express();
  app.use(express.json());

  app.use(pipelineRoutes(pipeline, logger));
  app.use(chatRoutes(chatService, logger));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

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

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
