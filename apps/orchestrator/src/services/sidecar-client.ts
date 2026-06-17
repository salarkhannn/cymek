export interface ExtractResult {
  filename: string;
  content: string;
}

export function createSidecarClient(sidecarUrl: string) {
  async function extractFile(filePath: string): Promise<ExtractResult> {
    const response = await fetch(`${sidecarUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown error");
      throw new Error(`Sidecar extract failed (${response.status}): ${errorBody}`);
    }

    return response.json() as Promise<ExtractResult>;
  }

  async function extractUrl(url: string): Promise<ExtractResult> {
    const response = await fetch(`${sidecarUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown error");
      throw new Error(`Sidecar extract failed (${response.status}): ${errorBody}`);
    }

    return response.json() as Promise<ExtractResult>;
  }

  return { extractFile, extractUrl };
}

export type SidecarClient = ReturnType<typeof createSidecarClient>;
