export async function readResponseText(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  const { charset, inferred } = detectCharset(response, buffer);

  try {
    const decoded = new TextDecoder(charset).decode(buffer);
    if (inferred && charset === "utf-8" && decoded.includes("\uFFFD")) {
      return new TextDecoder("windows-1252").decode(buffer);
    }
    return decoded;
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function detectCharset(response: Response, buffer: ArrayBuffer): { charset: string; inferred: boolean } {
  const contentType = response.headers.get("content-type") ?? "";
  const headerCharset = extractCharset(contentType);
  if (headerCharset) {
    return { charset: normalizeCharset(headerCharset), inferred: false };
  }

  const asciiHead = new TextDecoder("ascii").decode(buffer.slice(0, 2048));
  const metaCharset = extractCharset(asciiHead);
  if (metaCharset) {
    return { charset: normalizeCharset(metaCharset), inferred: false };
  }

  return { charset: "utf-8", inferred: true };
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
