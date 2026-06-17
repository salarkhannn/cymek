import * as crypto from "node:crypto";
import { sql, eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@cymek/db/schema";
import { createOpenAIService } from "./openai.js";
import type { EncryptionService } from "./encryption.js";
import type pino from "pino";

type Db = PostgresJsDatabase<typeof schema>;

export function createChatService(
  db: Db,
  logger: pino.Logger,
  encryption: EncryptionService,
  openAIBaseUrl: string,
) {
  async function chat(
    tenantId: string,
    message: string,
    sessionId?: string,
    onChunk?: (chunk: string) => void,
  ): Promise<{ answer: string; sessionId: string; chunks: string[] }> {
    const startTime = Date.now();
    const sid = sessionId ?? crypto.randomUUID();

    const [tenant] = await db
      .select({
        id: schema.tenants.id,
        apiKeyEncrypted: schema.tenants.apiKeyEncrypted,
        apiKeyNonce: schema.tenants.apiKeyNonce,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.apiKeyEncrypted || !tenant.apiKeyNonce) {
      throw new Error(`No API key configured for tenant ${tenantId}`);
    }

    const apiKey = encryption.decrypt(tenant.apiKeyEncrypted, tenant.apiKeyNonce);
    const openAI = createOpenAIService(apiKey, openAIBaseUrl);

    await db.insert(schema.chatLogs).values({
      tenantId,
      sessionId: sid,
      role: "user",
      content: message,
    });

    const embedding = await openAI.createEmbedding(message);

    const retrievedChunks = await db
      .select({
        content: schema.chunks.content,
      })
      .from(schema.chunks)
      .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
      .innerJoin(schema.jobs, eq(schema.documents.jobId, schema.jobs.id))
      .where(
        and(
          eq(schema.jobs.tenantId, tenantId),
          eq(schema.jobs.stage, "deployed"),
          eq(schema.jobs.status, "completed"),
        ),
      )
      .orderBy(sql`${schema.chunks.embedding} <=> ${JSON.stringify(embedding)}::vector`)
      .limit(5);

    const chunkContents = retrievedChunks.map((r) => r.content);

    if (chunkContents.length === 0) {
      const fallbackAnswer = "No documents have been deployed for this tenant yet.";
      await logChatResult(tenantId, sid, fallbackAnswer, Date.now() - startTime, []);
      return { answer: fallbackAnswer, sessionId: sid, chunks: [] };
    }

    const [systemPrompt] = await db
      .select({ content: schema.systemPrompts.content })
      .from(schema.systemPrompts)
      .where(eq(schema.systemPrompts.tenantId, tenantId))
      .orderBy(sql`${schema.systemPrompts.createdAt} DESC`)
      .limit(1);

    const systemContent = systemPrompt?.content ?? "You are a helpful documentation assistant.";
    const contextText = chunkContents.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");

    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      {
        role: "system",
        content: `${systemContent}\n\nRelevant documentation:\n${contextText}`,
      },
      { role: "user", content: message },
    ];

    let fullAnswer = "";
    if (onChunk) {
      fullAnswer = await openAI.chatStream(messages, onChunk);
    } else {
      fullAnswer = await openAI.chatStream(messages, () => {});
    }

    const latencyMs = Date.now() - startTime;
    await logChatResult(tenantId, sid, fullAnswer, latencyMs, chunkContents);

    logger.info({ tenantId, sessionId: sid, latencyMs }, "Chat completed");

    return { answer: fullAnswer, sessionId: sid, chunks: chunkContents };
  }

  async function logChatResult(
    tenantId: string,
    sessionId: string,
    content: string,
    latencyMs: number,
    chunks: string[],
  ): Promise<void> {
    await db.insert(schema.chatLogs).values({
      tenantId,
      sessionId,
      role: "assistant",
      content,
      latencyMs,
      chunksRetrieved: JSON.stringify(chunks),
    });
  }

  return { chat };
}

export type ChatService = ReturnType<typeof createChatService>;
