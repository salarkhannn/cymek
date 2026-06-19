import OpenAI, { RateLimitError, APIError } from "openai";
import {
  EMBEDDING_MODEL,
  CHAT_MODEL,
  EVAL_MODEL,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_BATCH_SIZE,
  RANDOM_SAMPLE_COUNT,
} from "@cymek/shared";

function extractRateLimitMessage(err: RateLimitError | APIError): string {
  const raw = (err as any).error?.metadata?.raw;
  if (typeof raw === "string" && raw.length > 0) return raw;
  const apiMessage = (err as APIError).message;
  if (apiMessage && !apiMessage.includes("Provider returned error")) return apiMessage;
  return "Your API provider is rate-limiting requests. Please wait and try again, or use a paid tier for higher limits.";
}

async function withRateLimitCheck<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof RateLimitError) {
      throw new Error(extractRateLimitMessage(err));
    }
    if (err instanceof APIError && err.status === 429) {
      throw new Error(extractRateLimitMessage(err));
    }
    throw err;
  }
}

export function createOpenAIService(apiKey: string, baseURL?: string) {
  let resolvedBaseURL = baseURL;
  let embeddingModel = EMBEDDING_MODEL;
  let chatModel = CHAT_MODEL;
  let evalModel = EVAL_MODEL;

  const isRealOpenAI = apiKey.startsWith("sk-proj-") || (apiKey.startsWith("sk-") && !apiKey.startsWith("sk-or-") && apiKey.length > 20);
  const isOpenRouter = apiKey.startsWith("sk-or-");
  const isGemini = apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.");

  if (isRealOpenAI) {
    resolvedBaseURL = "https://api.openai.com/v1";
    embeddingModel = "text-embedding-3-small";
    chatModel = "gpt-4o-mini";
    evalModel = "gpt-4o-mini";
  } else if (isOpenRouter) {
    resolvedBaseURL = "https://openrouter.ai/api/v1";
    embeddingModel = "openai/text-embedding-3-small";
    chatModel = "meta-llama/llama-3.3-70b-instruct:free";
    evalModel = "meta-llama/llama-3.3-70b-instruct:free";
  } else if (isGemini) {
    resolvedBaseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    embeddingModel = "gemini-embedding-001";
    chatModel = "gemini-2.5-flash";
    evalModel = "gemini-2.5-flash";
  }

  if (!resolvedBaseURL) {
    throw new Error("No API base URL configured. Set OPENAI_BASE_URL in your environment or use a recognized API key (OpenAI, OpenRouter, Gemini).");
  }

  const client = new OpenAI({ apiKey, baseURL: resolvedBaseURL });

  async function createEmbedding(input: string): Promise<number[]> {
    return withRateLimitCheck(async () => {
      const response = await client.embeddings.create({
        model: embeddingModel,
        input,
        dimensions: EMBEDDING_DIMENSIONS,
      });
      return response.data[0].embedding;
    });
  }

  async function createEmbeddingsBatch(inputs: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
      const response = await withRateLimitCheck(async () => {
        return client.embeddings.create({
          model: embeddingModel,
          input: batch,
          dimensions: EMBEDDING_DIMENSIONS,
        });
      });
      const sorted = response.data.sort((a, b) => a.index - b.index);
      for (const item of sorted) {
        results.push(item.embedding);
      }
    }
    return results;
  }

  async function generateSystemPrompt(
    chunks: string[],
    useCase: string,
    targetUser: string,
  ): Promise<string> {
    const samples = getRandomSamples(chunks, RANDOM_SAMPLE_COUNT);

    const metaPrompt = `You are a system prompt generator. Your job is to write a system prompt for an AI assistant that will be deployed for a business use case.

Business use case: ${useCase}
Target users: ${targetUser}

The following are sample chunks from the business's knowledge base that the AI will use to answer questions:

${samples.map((c, i) => `--- Chunk ${i + 1} ---\n${c}`).join("\n\n")}

Write a system prompt (2-3 paragraphs) that:
1. Names and scopes the assistant for this specific use case
2. Sets an appropriate tone for the target user type
3. Includes two or three grounding rules derived from the knowledge base samples
4. Stipulates that the AI must only answer from the provided context and never make up information

The output should read like a human wrote it for this specific business case — not a template or fill-in-the-blank. Do not include any meta-instructions about being a system prompt generator. Write as if you are the final system prompt.`;

    return withRateLimitCheck(async () => {
      const response = await client.chat.completions.create({
        model: chatModel,
        messages: [{ role: "user", content: metaPrompt }],
        temperature: 0.7,
        max_tokens: 500,
      });
      return response.choices[0].message.content ?? "";
    });
  }

  async function regenerateSystemPrompt(
    chunks: string[],
    useCase: string,
    targetUser: string,
  ): Promise<string> {
    const samples = getRandomSamples(chunks, RANDOM_SAMPLE_COUNT);

    const metaPrompt = `You are a system prompt generator. Your job is to write a system prompt for an AI assistant that will be deployed for a business use case.

Business use case: ${useCase}
Target users: ${targetUser}

The following are sample chunks from the business's knowledge base that the AI will use to answer questions:

${samples.map((c, i) => `--- Chunk ${i + 1} ---\n${c}`).join("\n\n")}

Write a system prompt (2-3 paragraphs) that:
1. Names and scopes the assistant for this specific use case
2. Sets an appropriate tone for the target user type
3. Includes two or three grounding rules derived from the knowledge base samples
4. Stipulates that the AI must only answer from the provided context and never make up information

The output should read like a human wrote it for this specific business case. Be creative and thorough. Do not include any meta-instructions about being a system prompt generator.`;

    return withRateLimitCheck(async () => {
      const response = await client.chat.completions.create({
        model: chatModel,
        messages: [{ role: "user", content: metaPrompt }],
        temperature: 0.9,
        max_tokens: 500,
      });
      return response.choices[0].message.content ?? "";
    });
  }

  async function generateEvalQA(
    chunks: string[],
  ): Promise<Array<{ question: string; answer: string }>> {
    const samples = getRandomSamples(chunks, Math.min(RANDOM_SAMPLE_COUNT, chunks.length));

    const prompt = `Based on these document chunks, generate 20 question-answer pairs that test understanding of the content.

Document samples:
${samples.map((c, i) => `--- Chunk ${i + 1} ---\n${c}`).join("\n\n")}

Return a JSON object with a "pairs" field that is an array of objects with "question" and "answer" fields.`;

    const response = await withRateLimitCheck(async () => {
      return client.chat.completions.create({
        model: evalModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    const content = response.choices[0].message.content ?? '{"pairs":[]}';
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : parsed.pairs ?? [];
    } catch {
      return [];
    }
  }

  async function evaluateQA(
    question: string,
    expectedAnswer: string,
    chunks: string[],
    systemPrompt: string,
  ): Promise<{ faithfulness: number; relevance: number }> {
    const context = chunks.join("\n\n");

    const prompt = `You are an evaluator. Judge the following Q&A pair based on the provided context.

System Prompt: ${systemPrompt}

Context:
${context}

Question: ${question}
Expected Answer: ${expectedAnswer}

Rate from 0.0 to 1.0:
1. Faithfulness: Is the answer supported by the context?
2. Relevance: Does the answer address the question?

Return JSON: { "faithfulness": number, "relevance": number }`;

    const response = await withRateLimitCheck(async () => {
      return client.chat.completions.create({
        model: evalModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });
    });

    const content = response.choices[0].message.content ?? '{"faithfulness":0,"relevance":0}';
    try {
      return JSON.parse(content);
    } catch {
      return { faithfulness: 0, relevance: 0 };
    }
  }

  async function chatStream(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const stream = await withRateLimitCheck(async () => {
      return client.chat.completions.create({
        model: chatModel,
        messages,
        temperature: 0.7,
        stream: true,
      });
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }
    return fullContent;
  }

  return {
    createEmbedding,
    createEmbeddingsBatch,
    generateSystemPrompt,
    regenerateSystemPrompt,
    generateEvalQA,
    evaluateQA,
    chatStream,
  };
}

export type OpenAIService = ReturnType<typeof createOpenAIService>;

function getRandomSamples(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
