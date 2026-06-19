import { Router, type IRouter } from "express";

export function extractPromptRoutes(groqApiKey?: string): IRouter {
  const router = Router();

  router.post("/extract-prompt", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (!groqApiKey) {
        return res.json({
          useCase: null,
          targetUser: null,
          missingInfo: ["useCase", "targetUser", "documents"],
        });
      }

      const systemMessage = `You are an AI pipeline analyzer. Given a user's plain-English description of what they want to build, extract structured information.

Return ONLY valid JSON with exactly these keys:
- "useCase": what the AI should do (string). Be specific. If unclear, use null.
- "targetUser": who will use the AI (string). If unclear, use null.
- "missingInfo": array of strings listing what's missing. Possible values: "useCase", "targetUser", "documents".

Examples:

User: "I want a chatbot for my product docs so my customers can find answers fast"
{"useCase": "Customer support Q&A over product documentation", "targetUser": "Customers using the product", "missingInfo": ["documents"]}

User: "Build a system that helps my support team answer tickets faster"
{"useCase": "Support ticket response assistant", "targetUser": "Support team members", "missingInfo": ["documents"]}

User: "I need an AI"
{"useCase": null, "targetUser": null, "missingInfo": ["useCase", "targetUser", "documents"]}`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Groq extraction API error:", response.status, text);
        return res.json({
          useCase: null,
          targetUser: null,
          missingInfo: ["useCase", "targetUser", "documents"],
        });
      }

      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content ?? null;

      if (content) {
        const cleaned = content.replace(/```(?:json)?\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return res.json({
          useCase: parsed.useCase ?? null,
          targetUser: parsed.targetUser ?? null,
          missingInfo: Array.isArray(parsed.missingInfo) ? parsed.missingInfo : [],
        });
      }

      return res.json({
        useCase: null,
        targetUser: null,
        missingInfo: ["useCase", "targetUser", "documents"],
      });
    } catch (err) {
      console.error("Extract prompt error:", err);
      return res.json({
        useCase: null,
        targetUser: null,
        missingInfo: ["useCase", "targetUser", "documents"],
      });
    }
  });

  return router;
}
