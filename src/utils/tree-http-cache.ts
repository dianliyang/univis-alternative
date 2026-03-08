import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hashString, canonicalizeUrl } from "./url.js";

const DEFAULT_TREE_HTTP_CACHE_MAX_AGE_HOURS = Number(process.env.UNIVIS_TREE_HTTP_CACHE_MAX_AGE_HOURS ?? "168");

interface TreeHttpCacheRecord {
  fetchedAt: string;
  text: string;
}

export interface TreeHttpCacheRequest {
  method?: string;
  url: string;
  body?: string;
}

export function getTreeHttpCachePath(projectRoot: string, request: TreeHttpCacheRequest): string {
  const key = hashString([
    (request.method ?? "GET").toUpperCase(),
    canonicalizeUrl(request.url),
    request.body ?? ""
  ].join("\n"));
  return join(projectRoot, "data", "raw", "tree-http-cache", `${key}.json`);
}

export async function readTreeHttpCache(
  projectRoot: string,
  request: TreeHttpCacheRequest,
  referenceDate = new Date()
): Promise<string | null> {
  if (process.env.UNIVIS_FORCE_TREE_HTTP_REFRESH === "1") {
    return null;
  }

  const path = getTreeHttpCachePath(projectRoot, request);

  try {
    const record = JSON.parse(await readFile(path, "utf8")) as TreeHttpCacheRecord;
    if (isTreeHttpCacheStale(record, referenceDate)) {
      return null;
    }
    return record.text;
  } catch {
    return null;
  }
}

export async function writeTreeHttpCache(projectRoot: string, request: TreeHttpCacheRequest, text: string): Promise<void> {
  const path = getTreeHttpCachePath(projectRoot, request);
  await mkdir(join(projectRoot, "data", "raw", "tree-http-cache"), { recursive: true });
  await writeFile(
    path,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        text
      } satisfies TreeHttpCacheRecord,
      null,
      2
    )
  );
}

function isTreeHttpCacheStale(record: TreeHttpCacheRecord, referenceDate: Date): boolean {
  if (!record.fetchedAt || typeof record.text !== "string") {
    return true;
  }

  const fetchedAt = new Date(record.fetchedAt);
  if (Number.isNaN(fetchedAt.getTime())) {
    return true;
  }

  const ageHours = (referenceDate.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
  return ageHours > DEFAULT_TREE_HTTP_CACHE_MAX_AGE_HOURS;
}
