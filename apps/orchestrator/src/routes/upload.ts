import { Router } from "express";
import Busboy from "busboy";
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { extname } from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import type pino from "pino";

const UPLOAD_DIR = fileURLToPath(new URL("../../uploads", import.meta.url));
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function uploadRoutes(logger: pino.Logger): Router {
  const router = Router();

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    logger.info({ dir: UPLOAD_DIR }, "Created upload directory");
  }

  router.post("/upload", (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ error: "Content-Type must be multipart/form-data" });
      return;
    }

    const filePaths: string[] = [];
    let rejected = false;

    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });

    bb.on("file", (_name, stream, info) => {
      const ext = extname(info.filename);
      const id = randomUUID();
      const safeName = `${id}${ext || ".bin"}`;
      const filePath = `${UPLOAD_DIR}/${safeName}`;

      const writeStream = createWriteStream(filePath);
      stream.pipe(writeStream);

      stream.on("limit", () => {
        rejected = true;
        writeStream.destroy();
        try { unlinkSync(filePath); } catch {}
      });

      stream.on("close", () => {
        if (!rejected) {
          filePaths.push(filePath);
        }
      });
    });

    bb.on("close", () => {
      if (rejected) {
        for (const f of filePaths) {
          try { unlinkSync(f); } catch {}
        }
        filePaths.length = 0;
        res.status(413).json({ error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        return;
      }
      res.status(200).json({ files: filePaths });
    });

    bb.on("error", (err) => {
      next(err);
    });

    req.pipe(bb);
  });

  return router;
}
