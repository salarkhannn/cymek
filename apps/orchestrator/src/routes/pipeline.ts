import { Router } from "express";
import type { PipelineService } from "../services/pipeline.js";
import type pino from "pino";
import type { SseEvent } from "@cymek/shared";

export function pipelineRoutes(
  pipeline: PipelineService,
  logger: pino.Logger,
): Router {
  const router = Router();

  router.get("/pipeline/stream/:jobId", (req, res) => {
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

    pipeline.registerEmitter(jobId, emitter);

    emitter.send({ stage: "ingesting" });

    req.on("close", () => {
      pipeline.unregisterEmitter(jobId, emitter);
      logger.info({ jobId }, "SSE connection closed");
    });
  });

  router.post("/pipeline", async (req, res, next) => {
    try {
      const { tenantId, files, urls, chunkSize, chunkOverlap } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: "tenantId is required" });
        return;
      }

      if (!files && !urls) {
        res.status(400).json({ error: "At least one of files or urls is required" });
        return;
      }

      const jobId = await pipeline.createJob(tenantId, {
        files,
        urls,
        chunkSize,
        chunkOverlap,
      });

      res.status(201).json({ jobId });
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

  return router;
}
