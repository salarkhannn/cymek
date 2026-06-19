import { readFileSync } from "fs";
import { basename } from "path";

export interface ExtractResult {
  filename: string;
  content: string;
}

interface SidecarResponse {
  text: string;
  metadata: { source: string; page_count: number; char_count: number };
}

export function createSidecarClient(sidecarUrl: string) {
  async function extractFile(filePath: string): Promise<ExtractResult> {
    const fileBuffer = readFileSync(filePath);
    const fileName = basename(filePath);

    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), fileName);

    const response = await fetch(`${sidecarUrl}/extract/file`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown error");
      throw new Error(`Sidecar extract failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as SidecarResponse;
    return { filename: data.metadata.source, content: data.text };
  }

  async function extractUrl(url: string): Promise<ExtractResult> {
    const response = await fetch(`${sidecarUrl}/extract/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown error");
      throw new Error(`Sidecar extract failed (${response.status}): ${errorBody}`);
    }

    const data = (await response.json()) as SidecarResponse;
    return { filename: data.metadata.source, content: data.text };
  }

  return { extractFile, extractUrl };
}

export type SidecarClient = ReturnType<typeof createSidecarClient>;
