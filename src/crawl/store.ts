import { mkdir, readFile, writeFile, appendFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CrawlRecord } from "../types.js";
import { hashString } from "../utils/url.js";

export interface SnapshotRecord extends CrawlRecord {
  html: string;
}

export function getSnapshotStem(rootDir: string, canonicalUrl: string): string {
  return join(rootDir, "data", "raw", hashString(canonicalUrl));
}

export async function snapshotExists(rootDir: string, canonicalUrl: string): Promise<boolean> {
  try {
    await access(`${getSnapshotStem(rootDir, canonicalUrl)}.html`);
    return true;
  } catch {
    return false;
  }
}

export async function writeSnapshot(rootDir: string, record: SnapshotRecord): Promise<void> {
  const stem = getSnapshotStem(rootDir, record.canonicalUrl);
  await mkdir(dirname(stem), { recursive: true });
  await writeFile(`${stem}.html`, record.html, "utf8");
  const { html: _html, ...metadata } = record;
  await writeFile(`${stem}.json`, JSON.stringify(metadata, null, 2));
}

export async function appendCrawlLog(rootDir: string, record: CrawlRecord): Promise<void> {
  const logPath = join(rootDir, "data", "logs", "crawl-log.jsonl");
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(record)}\n`);
}

export async function writeCrawlManifest(rootDir: string, records: CrawlRecord[]): Promise<void> {
  const manifestPath = join(rootDir, "data", "logs", "crawl-manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(records, null, 2));
}

export async function readCrawlManifest(rootDir: string): Promise<CrawlRecord[] | null> {
  try {
    const manifestPath = join(rootDir, "data", "logs", "crawl-manifest.json");
    const raw = await readFile(manifestPath, "utf8");
    return JSON.parse(raw) as CrawlRecord[];
  } catch {
    return null;
  }
}

export async function readSnapshotMetadata(rootDir: string, canonicalUrl: string): Promise<CrawlRecord | null> {
  try {
    const stem = getSnapshotStem(rootDir, canonicalUrl);
    const raw = await readFile(`${stem}.json`, "utf8");
    return JSON.parse(raw) as CrawlRecord;
  } catch {
    return null;
  }
}
