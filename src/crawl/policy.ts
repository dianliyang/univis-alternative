import type { CrawlPolicyDecision } from "../types.js";
import { BASE_URL, canonicalizeUrl } from "../utils/url.js";

export function evaluateCrawlUrl(input: string): CrawlPolicyDecision {
  const url = new URL(input, BASE_URL);

  if (url.hostname !== "univis.uni-kiel.de") {
    return { allowed: false, reason: "foreign-host" };
  }

  if (url.pathname.startsWith("/prg")) {
    return { allowed: false, reason: "blocked-path" };
  }

  if (url.pathname !== "/" && url.pathname !== "/form") {
    return { allowed: false, reason: "unsupported-path" };
  }

  return { allowed: true };
}

export function isAllowedCrawlUrl(input: string): boolean {
  return evaluateCrawlUrl(input).allowed;
}

export function canonicalAllowedUrl(input: string): string | null {
  const canonicalUrl = canonicalizeUrl(input);
  return isAllowedCrawlUrl(canonicalUrl) ? canonicalUrl : null;
}
