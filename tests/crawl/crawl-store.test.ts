import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendCrawlLog, writeSnapshot } from "../../src/crawl/store.js";

describe("crawl store", () => {
  it("writes snapshots and log entries", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-crawl-store-"));
    const record = {
      canonicalUrl: "https://univis.uni-kiel.de/form?dsc=anew/main&sem=2025w",
      sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/main&sem=2025w",
      fetchedAt: "2026-03-07T00:00:00.000Z",
      status: 200,
      contentHash: "abc",
      path: "data/raw/example.html",
      discoveredLinks: ["https://univis.uni-kiel.de/form?dsc=anew/tlecture&sem=2025w"],
      html: "<html><body>ok</body></html>"
    };

    await writeSnapshot(rootDir, record);
    await appendCrawlLog(rootDir, record);

    const log = await readFile(join(rootDir, "data", "logs", "crawl-log.jsonl"), "utf8");
    expect(log).toContain("\"status\":200");
  });
});
