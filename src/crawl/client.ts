import { readResponseText } from "../utils/http-text.js";

export interface FetchPageOptions {
  delayMs?: number;
}

let lastRequestAt = 0;

export async function fetchPage(url: string, options: FetchPageOptions = {}): Promise<{ status: number; html: string }> {
  const delayMs = options.delayMs ?? 400;
  const waitMs = Math.max(0, lastRequestAt + delayMs - Date.now());
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  lastRequestAt = Date.now();
  const response = await fetch(url, {
    headers: {
      "user-agent": "univis-kiel-static-catalog/0.1 (+https://univis.uni-kiel.de)"
    }
  });

  return {
    status: response.status,
    html: await readResponseText(response)
  };
}
