import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { fetchPage } from "../src/crawl/client.js";
import { hydrateQueueItems, priorityForUrl, shouldKeepLink, shouldRefetchSnapshot } from "../src/crawl/frontier.js";
import { canonicalAllowedUrl } from "../src/crawl/policy.js";
import { appendCrawlLog, readSnapshotMetadata, writeCrawlManifest, writeSnapshot } from "../src/crawl/store.js";
import { canonicalizeUrl, hashString } from "../src/utils/url.js";

const rootDir = process.cwd();
const maxPages = Number(process.env.UNIVIS_MAX_PAGES ?? "80");
const force = process.env.UNIVIS_FORCE === "1";
const maxAgeHours = Number(process.env.UNIVIS_MAX_AGE_HOURS ?? "24");

function extractLinks(currentUrl: string, html: string): QueueItem[] {
  const $ = cheerio.load(html);
  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get()
    .map((href) => new URL(href, currentUrl))
    .filter(shouldKeepLink)
    .map((url) => {
      const fetchUrl = url.toString();
      const canonicalUrl = canonicalAllowedUrl(fetchUrl);
      return canonicalUrl ? { fetchUrl, canonicalUrl } : null;
    })
    .filter((value): value is QueueItem => Boolean(value));

  return links.sort((a, b) => priorityForUrl(a.fetchUrl) - priorityForUrl(b.fetchUrl));
}

async function main(): Promise<void> {
  await mkdir(join(rootDir, "data", "raw"), { recursive: true });
  const seedUrls = JSON.parse(await readFile(join(rootDir, "data", "discovery", "seed-urls.json"), "utf8")) as string[];
  const queue: QueueItem[] = seedUrls.map((url) => ({
    canonicalUrl: canonicalizeUrl(url),
    fetchUrl: url
  }));
  const seen = new Set<string>();
  const crawledRecords = [];

  while (queue.length > 0 && seen.size < maxPages) {
    const item = queue.shift()!;
    if (seen.has(item.canonicalUrl)) {
      continue;
    }
    seen.add(item.canonicalUrl);

    const existingMetadata = await readSnapshotMetadata(rootDir, item.canonicalUrl);
    if (!force && !shouldRefetchSnapshot(existingMetadata, { maxAgeHours })) {
      if (existingMetadata) {
        crawledRecords.push(existingMetadata);
        for (const discoveredLink of hydrateQueueItems(existingMetadata.discoveredLinks)) {
          if (!seen.has(discoveredLink.canonicalUrl)) {
            queue.push(discoveredLink);
          }
        }
      }
      continue;
    }

    const { status, html } = await fetchPage(item.fetchUrl);
    const discoveredLinks = extractLinks(item.fetchUrl, html);
    const record = {
      canonicalUrl: item.canonicalUrl,
      sourceUrl: item.fetchUrl,
      fetchedAt: new Date().toISOString(),
      status,
      contentHash: hashString(html),
      path: `data/raw/${hashString(item.canonicalUrl)}.html`,
      discoveredLinks: discoveredLinks.map((link) => link.fetchUrl)
    };

    await writeSnapshot(rootDir, { ...record, html });
    await appendCrawlLog(rootDir, record);
    crawledRecords.push(record);

    for (const discoveredLink of discoveredLinks) {
      if (!seen.has(discoveredLink.canonicalUrl)) {
        queue.push(discoveredLink);
      }
    }
  }

  await writeCrawlManifest(rootDir, crawledRecords);

  console.log(`Crawled ${seen.size} page(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
