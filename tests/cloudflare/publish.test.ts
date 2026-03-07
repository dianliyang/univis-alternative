import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { collectPublishedDataEntries } from "../../src/cloudflare/publish.js";

const tempRoots: string[] = [];

describe("published data collection", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("collects the expected public JSON files with R2 keys", async () => {
    const root = join(tmpdir(), `univis-cloudflare-${Date.now()}`);
    tempRoots.push(root);

    const dataDir = join(root, "site", "public", "data");
    await mkdir(dataDir, { recursive: true });
    await writeFile(join(dataDir, "catalog.json"), "[]");
    await writeFile(join(dataDir, "faculty-browser.json"), "[]");
    await writeFile(join(dataDir, "faculty-summary.json"), "[]");
    await writeFile(join(dataDir, "manifest.json"), "{}");
    await writeFile(join(dataDir, "search-index.json"), "[]");

    const entries = await collectPublishedDataEntries(root, "snapshots/2025w");

    expect(entries.map((entry) => entry.objectKey)).toEqual([
      "snapshots/2025w/catalog.json",
      "snapshots/2025w/faculty-browser.json",
      "snapshots/2025w/faculty-summary.json",
      "snapshots/2025w/manifest.json",
      "snapshots/2025w/search-index.json"
    ]);
  });
});
