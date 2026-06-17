import OpenAI from "openai";
import {
  EMBEDDING_MODEL,
  CHAT_MODEL,
  EVAL_MODEL,
  EMBEDDING_BATCH_SIZE,
  RANDOM_SAMPLE_COUNT,
} from "@cymek/shared";

export function createOpenAIService(apiKey: string, baseURL?: string) {
  const client = new OpenAI({ apiKey, baseURL });

  async function createEmbedding(input: string): Promise<number[]> {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });
    return response.data[0].embedding;
  }

  async function createEmbeddingsBatch(inputs: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
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

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: metaPrompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content ?? "";
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

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: metaPrompt }],
      temperature: 0.9,
      max_tokens: 500,
    });

    return response.choices[0].message.content ?? "";
  }

  async function generateEvalQA(
    chunks: string[],
  ): Promise<Array<{ question: string; answer: string }>> {
    const samples = getRandomSamples(chunks, Math.min(RANDOM_SAMPLE_COUNT, chunks.length));

    const prompt = `Based on these document chunks, generate 20 question-answer pairs that test understanding of the content.

Document samples:
${samples.map((c, i) => `--- Chunk ${i + 1} ---\n${c}`).join("\n\n")}

Return a JSON object with a "pairs" field that is an array of objects with "question" and "answer" fields.`;

    const response = await client.chat.completions.create({
      model: EVAL_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
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

    const response = await client.chat.completions.create({
      model: EVAL_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
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
    const stream = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.7,
      stream: true,
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
