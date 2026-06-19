import { PgBoss, type Job } from "pg-boss";
import pino from "pino";
import { eq, and, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@cymek/db/schema";
import type { PipelineConfig, SseEvent } from "@cymek/shared";
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  RETRY_CHUNK_SIZE,
  RETRY_CHUNK_OVERLAP,
  MAX_RETRIES,
  EVAL_MIN_SCORE,
} from "@cymek/shared";
import { createOpenAIService, type OpenAIService } from "./openai.js";
import type { SidecarClient } from "./sidecar-client.js";
import type { EncryptionService } from "./encryption.js";

type Db = PostgresJsDatabase<typeof schema>;

export interface SseEmitter {
  send(event: SseEvent): void;
  close(): void;
}

export function createPipelineService(
  db: Db,
  sidecar: SidecarClient,
  pgBoss: PgBoss,
  logger: pino.Logger,
  encryption: EncryptionService,
  openAIBaseUrl: string,
) {
  const emitters = new Map<string, Set<SseEmitter>>();

  function registerEmitter(jobId: string, emitter: SseEmitter) {
    if (!emitters.has(jobId)) {
      emitters.set(jobId, new Set());
    }
    emitters.get(jobId)!.add(emitter);
  }

  function unregisterEmitter(jobId: string, emitter: SseEmitter) {
    const set = emitters.get(jobId);
    if (set) {
      set.delete(emitter);
      if (set.size === 0) emitters.delete(jobId);
    }
  }

  function emitEvent(jobId: string, event: SseEvent) {
    const set = emitters.get(jobId);
    if (set) {
      for (const emitter of set) {
        try {
          emitter.send(event);
        } catch (err) {
          logger.error({ err, jobId }, "Failed to send SSE event");
        }
      }
    }
  }

  async function createJob(
    tenantId: string,
    config: PipelineConfig,
  ): Promise<string> {
    const [job] = await db
      .insert(schema.jobs)
      .values({
        tenantId,
        config: config as Record<string, unknown>,
        status: "queued",
      })
      .returning({ id: schema.jobs.id });

    const jobId = job.id;

    await pgBoss.send("pipeline-process", { jobId, tenantId, config });

    logger.info({ jobId, tenantId }, "Pipeline job created");
    return jobId;
  }

  async function processPipeline(
    job: Job<{ jobId: string; tenantId: string; config: PipelineConfig }>,
  ) {
    const { jobId, tenantId, config } = job.data;

    try {
      await updateJob(jobId, { status: "processing" });

      const openAI = await createTenantOpenAI(tenantId);

      const extractedDocs = await stageIngesting(tenantId, jobId, config);
      const chunkSize = (config.chunkSize as number | undefined) ?? DEFAULT_CHUNK_SIZE;
      const chunkOverlap = (config.chunkOverlap as number | undefined) ?? DEFAULT_CHUNK_OVERLAP;
      await stageChunking(tenantId, jobId, chunkSize, chunkOverlap);
      await stageEmbedding(jobId, openAI);
      const allChunks = await getAllChunks(jobId);
      const useCase = (config.useCase as string) ?? "";
      const targetUser = (config.targetUser as string) ?? "";
      const promptContent = await stagePromptGen(tenantId, jobId, allChunks, useCase, targetUser, openAI);
      const score = await stageEvaluating(tenantId, jobId, allChunks, promptContent, openAI);

      if (score >= EVAL_MIN_SCORE) {
        await deployPipeline(jobId);
      } else {
        const retryCount = await getRetryCount(jobId);
        if (retryCount < MAX_RETRIES) {
          await handleRetry(jobId, tenantId, config, retryCount, openAI);
        } else {
          await deployPipeline(jobId, true);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, jobId }, "Pipeline failed");
      const isRateLimited = message.toLowerCase().includes("rate-limited") || message.toLowerCase().includes("rate limit") || message.includes("429");
      await updateJob(jobId, { status: "failed", error: message });
      const [job] = await db
        .select({ stage: schema.jobs.stage })
        .from(schema.jobs)
        .where(eq(schema.jobs.id, jobId))
        .limit(1);
      const failedStage = (job?.stage ?? "evaluating") as SseEvent["stage"];
      emitEvent(jobId, { stage: failedStage, error: message, retryable: isRateLimited });
    }
  }

  async function createTenantOpenAI(tenantId: string): Promise<OpenAIService> {
    const [tenant] = await db
      .select({
        apiKeyEncrypted: schema.tenants.apiKeyEncrypted,
        apiKeyNonce: schema.tenants.apiKeyNonce,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant?.apiKeyEncrypted || !tenant?.apiKeyNonce) {
      throw new Error(`No API key configured for tenant ${tenantId}`);
    }

    const apiKey = encryption.decrypt(tenant.apiKeyEncrypted, tenant.apiKeyNonce);
    return createOpenAIService(apiKey, openAIBaseUrl);
  }

  async function stageIngesting(
    tenantId: string,
    jobId: string,
    config: PipelineConfig,
  ): Promise<Array<{ filename: string; content: string }>> {
    await updateJob(jobId, { stage: "ingesting" });
    emitEvent(jobId, { stage: "ingesting", progress: 0 });

    const docs: Array<{ filename: string; content: string }> = [];

    const files = config.files as string[] | undefined;
    const urls = config.urls as string[] | undefined;

    if (files) {
      for (let i = 0; i < files.length; i++) {
        const result = await sidecar.extractFile(files[i]);
        docs.push(result);
        emitEvent(jobId, {
          stage: "ingesting",
          progress: Math.round(((i + 1) / files.length) * 50),
        });
      }
    }

    if (urls) {
      for (let i = 0; i < urls.length; i++) {
        const result = await sidecar.extractUrl(urls[i]);
        docs.push(result);
        emitEvent(jobId, {
          stage: "ingesting",
          progress: Math.round(50 + ((i + 1) / urls.length) * 50),
        });
      }
    }

    for (const doc of docs) {
      await db.insert(schema.documents).values({
        tenantId,
        jobId,
        filename: doc.filename,
        content: doc.content,
      });
    }

    await updateJob(jobId, { extractedCount: docs.length });
    emitEvent(jobId, { stage: "ingesting", progress: 100, chunkCount: docs.length });
    return docs;
  }

  async function stageChunking(
    tenantId: string,
    jobId: string,
    chunkSize: number,
    overlap: number,
  ): Promise<void> {
    await updateJob(jobId, { stage: "chunking" });
    emitEvent(jobId, { stage: "chunking", progress: 0 });

    const storedDocs = await db
      .select({ id: schema.documents.id, content: schema.documents.content })
      .from(schema.documents)
      .where(eq(schema.documents.jobId, jobId));

    let totalChunks = 0;

    for (let i = 0; i < storedDocs.length; i++) {
      const doc = storedDocs[i];
      const chunks = splitText(doc.content, chunkSize, overlap);

      for (const content of chunks) {
        await db.insert(schema.chunks).values({
          documentId: doc.id,
          content,
        });
      }

      totalChunks += chunks.length;
      emitEvent(jobId, {
        stage: "chunking",
        progress: Math.round(((i + 1) / storedDocs.length) * 100),
        chunkCount: totalChunks,
      });
    }

    await updateJob(jobId, { chunkCount: totalChunks });
    emitEvent(jobId, { stage: "chunking", progress: 100, chunkCount: totalChunks });
  }

  async function stageEmbedding(jobId: string, openAI: OpenAIService): Promise<void> {
    await updateJob(jobId, { stage: "embedding" });
    emitEvent(jobId, { stage: "embedding", progress: 0 });

    const allChunks = await db
      .select({ id: schema.chunks.id, content: schema.chunks.content })
      .from(schema.chunks)
      .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
      .where(eq(schema.documents.jobId, jobId));

    const contents = allChunks.map((c) => c.content);
    const embeddings = await openAI.createEmbeddingsBatch(contents);

    for (let i = 0; i < allChunks.length; i++) {
      await db
        .update(schema.chunks)
        .set({ embedding: embeddings[i] })
        .where(eq(schema.chunks.id, allChunks[i].id));

      if (i % 20 === 0 || i === allChunks.length - 1) {
        emitEvent(jobId, {
          stage: "embedding",
          progress: Math.round(((i + 1) / allChunks.length) * 100),
        });
      }
    }

    emitEvent(jobId, { stage: "embedding", progress: 100 });
  }

  async function stagePromptGen(
    tenantId: string,
    jobId: string,
    chunks: string[],
    useCase: string,
    targetUser: string,
    openAI: OpenAIService,
  ): Promise<string> {
    await updateJob(jobId, { stage: "prompt_gen" });
    emitEvent(jobId, { stage: "prompt_gen" });

    const promptContent = await openAI.generateSystemPrompt(chunks, useCase, targetUser);

    await db.insert(schema.systemPrompts).values({
      tenantId,
      name: `pipeline-${jobId}`,
      content: promptContent,
    });

    return promptContent;
  }

  async function stageEvaluating(
    tenantId: string,
    jobId: string,
    chunks: string[],
    promptContent: string,
    openAI: OpenAIService,
  ): Promise<number> {
    await updateJob(jobId, { stage: "evaluating" });
    emitEvent(jobId, { stage: "evaluating", progress: 0 });

    const qaPairs = await openAI.generateEvalQA(chunks);

    let totalScore = 0;

    for (let i = 0; i < qaPairs.length; i++) {
      const { question, answer } = qaPairs[i];
      const result = await openAI.evaluateQA(question, answer, chunks, promptContent);
      const pairScore = (result.faithfulness + result.relevance) / 2;
      totalScore += pairScore;

      await db.insert(schema.evalResults).values({
        tenantId,
        jobId,
        metricName: `qa_${i}_faithfulness`,
        metricValue: result.faithfulness,
      });
      await db.insert(schema.evalResults).values({
        tenantId,
        jobId,
        metricName: `qa_${i}_relevance`,
        metricValue: result.relevance,
      });

      emitEvent(jobId, {
        stage: "evaluating",
        progress: Math.round(((i + 1) / qaPairs.length) * 100),
        score: Math.round(pairScore * 100) / 100,
      });
    }

    const avgScore = qaPairs.length > 0 ? totalScore / qaPairs.length : 0;
    await updateJob(jobId, { evalScore: avgScore });
    emitEvent(jobId, {
      stage: "evaluating",
      progress: 100,
      score: Math.round(avgScore * 100) / 100,
    });

    return avgScore;
  }

  async function handleRetry(
    jobId: string,
    tenantId: string,
    config: PipelineConfig,
    retryCount: number,
    openAI: OpenAIService,
  ): Promise<void> {
    const useCase = (config.useCase as string) ?? "";
    const targetUser = (config.targetUser as string) ?? "";
    await updateJob(jobId, { retryCount: retryCount + 1 });

    if (retryCount === 0) {
      await reChunkAndReEmbed(jobId, tenantId, RETRY_CHUNK_SIZE, RETRY_CHUNK_OVERLAP, openAI);
      const allChunks = await getAllChunks(jobId);
      const promptContent = await stagePromptGen(tenantId, jobId, allChunks, useCase, targetUser, openAI);
      const score = await stageEvaluating(tenantId, jobId, allChunks, promptContent, openAI);

      if (score >= EVAL_MIN_SCORE) {
        await deployPipeline(jobId);
      } else if (retryCount + 1 < MAX_RETRIES) {
        await handleRetry(jobId, tenantId, config, retryCount + 1, openAI);
      } else {
        await deployPipeline(jobId, true);
      }
    } else if (retryCount === 1) {
      const allChunks = await getAllChunks(jobId);
      const promptContent = await openAI.regenerateSystemPrompt(allChunks, useCase, targetUser);
      await db
        .insert(schema.systemPrompts)
        .values({ tenantId, name: `pipeline-${jobId}-retry-${retryCount}`, content: promptContent });
      const score = await stageEvaluating(tenantId, jobId, allChunks, promptContent, openAI);

      if (score >= EVAL_MIN_SCORE) {
        await deployPipeline(jobId);
      } else if (retryCount + 1 < MAX_RETRIES) {
        await handleRetry(jobId, tenantId, config, retryCount + 1, openAI);
      } else {
        await deployPipeline(jobId, true);
      }
    } else {
      await reChunkAndReEmbed(jobId, tenantId, RETRY_CHUNK_SIZE, RETRY_CHUNK_OVERLAP, openAI);
      const allChunks = await getAllChunks(jobId);
      const promptContent = await openAI.regenerateSystemPrompt(allChunks, useCase, targetUser);
      await db
        .insert(schema.systemPrompts)
        .values({ tenantId, name: `pipeline-${jobId}-retry-${retryCount}`, content: promptContent });
      const score = await stageEvaluating(tenantId, jobId, allChunks, promptContent, openAI);

      if (score >= EVAL_MIN_SCORE) {
        await deployPipeline(jobId);
      } else {
        await deployPipeline(jobId, true);
      }
    }
  }

  async function reChunkAndReEmbed(
    jobId: string,
    tenantId: string,
    chunkSize: number,
    overlap: number,
    openAI: OpenAIService,
  ): Promise<void> {
    const storedDocs = await db
      .select({ id: schema.documents.id, content: schema.documents.content })
      .from(schema.documents)
      .where(eq(schema.documents.jobId, jobId));

    const docIds = storedDocs.map((d) => d.id);

    if (docIds.length > 0) {
      await db
        .delete(schema.chunks)
        .where(inArray(schema.chunks.documentId, docIds));
    }

    let totalChunks = 0;
    for (const doc of storedDocs) {
      const newChunks = splitText(doc.content, chunkSize, overlap);
      for (const content of newChunks) {
        await db.insert(schema.chunks).values({ documentId: doc.id, content });
      }
      totalChunks += newChunks.length;
    }

    await updateJob(jobId, { chunkCount: totalChunks });
    emitEvent(jobId, { stage: "chunking", progress: 100, chunkCount: totalChunks });

    await stageEmbedding(jobId, openAI);
  }

  async function deployPipeline(jobId: string, warning = false): Promise<void> {
    await updateJob(jobId, { stage: "deployed", status: "completed", warning });
    emitEvent(jobId, { stage: "deployed", warning });
    logger.info({ jobId, warning }, "Pipeline deployed");
  }

  async function updateJob(
    jobId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    await db
      .update(schema.jobs)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(schema.jobs.id, jobId));
  }

  async function getRetryCount(jobId: string): Promise<number> {
    const [job] = await db
      .select({ retryCount: schema.jobs.retryCount })
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId));
    return job?.retryCount ?? 0;
  }

  async function getAllChunks(jobId: string): Promise<string[]> {
    const rows = await db
      .select({ content: schema.chunks.content })
      .from(schema.chunks)
      .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
      .where(eq(schema.documents.jobId, jobId));
    return rows.map((r) => r.content);
  }

  function getJobId(jobId: string) {
    return db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .then((rows) => rows[0] ?? null);
  }

  return {
    createJob,
    processPipeline,
    registerEmitter,
    unregisterEmitter,
    emitEvent,
    getJobId,
  };
}

export type PipelineService = ReturnType<typeof createPipelineService>;

export function splitText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const step = Math.max(chunkSize - overlap, 1);
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    if (end <= start) break;
    chunks.push(text.slice(start, end));
    start += step;
  }

  return chunks;
}
