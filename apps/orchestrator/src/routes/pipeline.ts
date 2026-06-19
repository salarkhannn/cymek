import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@cymek/db/schema";
import type { PipelineService } from "../services/pipeline.js";
import type { EncryptionService } from "../services/encryption.js";
import type pino from "pino";
import type { PipelineConfig, SseEvent } from "@cymek/shared";

type Db = PostgresJsDatabase<typeof schema>;

export function pipelineRoutes(
  db: Db,
  pipeline: PipelineService,
  encryption: EncryptionService,
  logger: pino.Logger,
): Router {
  const router = Router();

  router.get("/pipeline/stream/:jobId", async (req, res) => {
    const { jobId } = req.params;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const emitter = {
      send(event: SseEvent) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      close() {
        res.end();
      },
    };

    const [job] = await db
      .select({ status: schema.jobs.status, stage: schema.jobs.stage, error: schema.jobs.error })
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (job) {
      if (job.status === "failed") {
        emitter.send({ stage: (job.stage as SseEvent["stage"]) ?? "ingesting", error: job.error ?? "Unknown error", retryable: false });
        return;
      }
      if (job.status === "completed") {
        emitter.send({ stage: "deployed" });
        return;
      }
    }

    pipeline.registerEmitter(jobId, emitter);

    emitter.send({ stage: "ingesting" });

    req.on("close", () => {
      pipeline.unregisterEmitter(jobId, emitter);
      logger.info({ jobId }, "SSE connection closed");
    });
  });

  router.post("/pipeline", async (req, res, next) => {
    try {
      const { apiKey, useCase, targetUser, files, urls, chunkSize, chunkOverlap } = req.body;

      if (!apiKey) {
        res.status(400).json({ error: "apiKey is required" });
        return;
      }

      if (!useCase) {
        res.status(400).json({ error: "useCase is required" });
        return;
      }

      if (!files && !urls) {
        res.status(400).json({ error: "At least one of files or urls is required" });
        return;
      }

      const slug = useCase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const name = useCase;

      const [existing] = await db
        .select()
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, slug))
        .limit(1);

      let tenantId: string;

      if (existing) {
        const { encrypted, nonce } = encryption.encrypt(apiKey);
        await db
          .update(schema.tenants)
          .set({
            apiKeyEncrypted: encrypted,
            apiKeyNonce: nonce,
            useCase,
            targetUser: targetUser ?? null,
            updatedAt: new Date(),
          })
          .where(eq(schema.tenants.id, existing.id));
        tenantId = existing.id;
      } else {
        const { encrypted, nonce } = encryption.encrypt(apiKey);
        await db.insert(schema.tenants).values({
          name,
          slug,
          useCase,
          targetUser: targetUser ?? null,
          apiKeyEncrypted: encrypted,
          apiKeyNonce: nonce,
          userId: req.user?.id ?? null,
        });
        const [created] = await db
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.slug, slug))
          .limit(1);
        tenantId = created.id;
      }

      const jobId = await pipeline.createJob(tenantId, {
        files,
        urls,
        chunkSize,
        chunkOverlap,
        useCase,
        targetUser,
      });

      res.status(201).json({ tenantId, jobId });
    } catch (err) {
      next(err);
    }
  });

  router.post("/pipeline/:jobId/retry", async (req, res, next) => {
    try {
      const [job] = await db
        .select({ config: schema.jobs.config, tenantId: schema.jobs.tenantId })
        .from(schema.jobs)
        .where(eq(schema.jobs.id, req.params.jobId))
        .limit(1);

      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const jobId = await pipeline.createJob(job.tenantId, job.config as PipelineConfig);
      res.status(201).json({ jobId });
    } catch (err) {
      next(err);
    }
  });

  router.get("/pipeline/jobs", async (req, res, next) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId || typeof tenantId !== "string") {
        res.status(400).json({ error: "tenantId query parameter is required" });
        return;
      }
      const jobs = await db
        .select()
        .from(schema.jobs)
        .where(eq(schema.jobs.tenantId, tenantId))
        .orderBy(desc(schema.jobs.createdAt));
      res.json(jobs);
    } catch (err) {
      next(err);
    }
  });

  router.get("/pipeline/:jobId", async (req, res, next) => {
    try {
      const job = await pipeline.getJobId(req.params.jobId);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      res.json(job);
    } catch (err) {
      next(err);
    }
  });

  router.get("/tenant/:tenantId", async (req, res, next) => {
    try {
      const [tenant] = await db
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          useCase: schema.tenants.useCase,
          targetUser: schema.tenants.targetUser,
          createdAt: schema.tenants.createdAt,
          updatedAt: schema.tenants.updatedAt,
        })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, req.params.tenantId))
        .limit(1);

      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      const [deployedJob] = await db
        .select({ id: schema.jobs.id })
        .from(schema.jobs)
        .where(
          and(
            eq(schema.jobs.tenantId, tenant.id),
            eq(schema.jobs.stage, "deployed"),
            eq(schema.jobs.status, "completed"),
          ),
        )
        .orderBy(desc(schema.jobs.createdAt))
        .limit(1);

      res.json({
        ...tenant,
        deployed: !!deployedJob,
        deployEndpoint: deployedJob ? `/api/chat/${tenant.id}` : null,
        embedSnippet: deployedJob
          ? `<script src="/embed.js" data-cymek-tenant-id="${tenant.id}"></script>`
          : null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
