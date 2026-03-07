import type { CrawlRecord } from "../types.js";
import { canonicalAllowedUrl } from "./policy.js";
import { getRecentSemesterCodes, isRecentSemesterCode } from "../utils/semester.js";

export interface RevalidateOptions {
  now?: string;
  maxAgeHours?: number;
}

export function shouldKeepLink(url: URL): boolean {
  const recent = new Set(getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z")));
  if (url.pathname === "/") {
    return true;
  }

  if (url.pathname !== "/form") {
    return false;
  }

  const dsc = url.searchParams.get("dsc") ?? "";
  const sem = url.searchParams.get("sem") ?? "";
  if (!isRecentSemesterCode(sem, recent)) {
    return false;
  }
  return (
    dsc === "" ||
    dsc.startsWith("anew/main") ||
    dsc.startsWith("anew/tlecture") ||
    dsc.startsWith("anew/lecture_view") ||
    dsc.startsWith("anew/lecture_plan") ||
    dsc.startsWith("anew/tel_view")
  );
}

export function priorityForUrl(url: string): number {
  const parsedUrl = new URL(url);
  const dsc = parsedUrl.searchParams.get("dsc") ?? "";
  if (dsc.startsWith("anew/tlecture")) {
    const depth = (parsedUrl.searchParams.get("tdir") ?? "").split("/").filter(Boolean).length;
    return depth;
  }
  if (dsc.startsWith("anew/lecture_view")) return 100;
  if (dsc.startsWith("anew/tel_view")) return 200;
  return 300;
}

export function hydrateQueueItems(
  links: string[]
): Array<{
  canonicalUrl: string;
  fetchUrl: string;
}> {
  return links
    .map((fetchUrl) => {
      const canonicalUrl = canonicalAllowedUrl(fetchUrl);
      return canonicalUrl ? { fetchUrl, canonicalUrl } : null;
    })
    .filter((value): value is { canonicalUrl: string; fetchUrl: string } => Boolean(value))
    .sort((a, b) => priorityForUrl(a.fetchUrl) - priorityForUrl(b.fetchUrl));
}

export function shouldRefetchSnapshot(
  metadata: Pick<CrawlRecord, "fetchedAt" | "status"> | null,
  options: RevalidateOptions = {}
): boolean {
  if (!metadata) {
    return true;
  }

  if (metadata.status >= 400) {
    return true;
  }

  const now = new Date(options.now ?? new Date().toISOString());
  const fetchedAt = new Date(metadata.fetchedAt);
  const maxAgeHours = options.maxAgeHours ?? 24;
  return now.getTime() - fetchedAt.getTime() > maxAgeHours * 60 * 60 * 1000;
}
