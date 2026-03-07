export async function readResponseText(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  const charset = detectCharset(response, buffer);

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function detectCharset(response: Response, buffer: ArrayBuffer): string {
  const contentType = response.headers.get("content-type") ?? "";
  const headerCharset = extractCharset(contentType);
  if (headerCharset) {
    return normalizeCharset(headerCharset);
  }

  const asciiHead = new TextDecoder("ascii").decode(buffer.slice(0, 2048));
  const metaCharset = extractCharset(asciiHead);
  return normalizeCharset(metaCharset ?? "utf-8");
}

function extractCharset(value: string): string | undefined {
  const match = value.match(/charset\s*=\s*["']?([^"';\s>]+)/i);
  return match?.[1];
}

function normalizeCharset(charset: string): string {
  const normalized = charset.trim().toLowerCase();
  if (normalized === "iso-8859-1" || normalized === "latin1" || normalized === "latin-1") {
    return "windows-1252";
  }
  return normalized;
}
