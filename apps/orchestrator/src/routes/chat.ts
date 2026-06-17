import { Router } from "express";
import type { ChatService } from "../services/chat.js";
import type pino from "pino";

export function chatRoutes(chatService: ChatService, logger: pino.Logger): Router {
  const router = Router();

  router.post("/chat/:tenantId", async (req, res, next) => {
    try {
      const { tenantId } = req.params;
      const { message, sessionId } = req.body;

      if (!message) {
        res.status(400).json({ error: "message is required" });
        return;
      }

      const accept = req.headers.accept ?? "";

      if (accept.includes("text/event-stream")) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });

        const result = await chatService.chat(tenantId, message, sessionId, (chunk) => {
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        });

        res.write(`data: ${JSON.stringify({ type: "done", ...result })}\n\n`);
        res.end();
      } else {
        const result = await chatService.chat(tenantId, message, sessionId);
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
