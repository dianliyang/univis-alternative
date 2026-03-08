import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { getTreeHttpCachePath, readTreeHttpCache, writeTreeHttpCache } from "../../src/utils/tree-http-cache.js";

describe("tree HTTP cache", () => {
  beforeEach(() => {
    delete process.env.UNIVIS_FORCE_TREE_HTTP_REFRESH;
  });

  it("stores and restores cached responses by request signature", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-tree-http-cache-"));

    await writeTreeHttpCache(rootDir, { url: "https://univis.uni-kiel.de/form?sem=2026s&lang=en" }, "cached html");

    await expect(
      readTreeHttpCache(rootDir, { url: "https://univis.uni-kiel.de/form?lang=en&sem=2026s&__s=2" }, new Date("2026-03-08T00:00:00.000Z"))
    ).resolves.toBe("cached html");
  });

  it("separates GET and POST cache entries", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-tree-http-cache-"));

    const getPath = getTreeHttpCachePath(rootDir, { method: "GET", url: "https://univis.uni-kiel.de/form?sem=2026s" });
    const postPath = getTreeHttpCachePath(rootDir, {
      method: "POST",
      url: "https://univis.uni-kiel.de/form?sem=2026s",
      body: "foo=bar"
    });

    expect(getPath).not.toBe(postPath);
  });

  it("ignores stale cached responses", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-tree-http-cache-"));
    const cacheDir = join(rootDir, "data", "raw", "tree-http-cache");
    await mkdir(cacheDir, { recursive: true });

    const path = getTreeHttpCachePath(rootDir, { url: "https://univis.uni-kiel.de/form?sem=2026s" });
    await writeFile(
      path,
      JSON.stringify({
        fetchedAt: "2025-01-01T00:00:00.000Z",
        text: "old"
      })
    );

    await expect(readTreeHttpCache(rootDir, { url: "https://univis.uni-kiel.de/form?sem=2026s" }, new Date("2026-03-08T00:00:00.000Z"))).resolves.toBeNull();
  });

  it("bypasses cache when forced", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-tree-http-cache-"));

    await writeTreeHttpCache(rootDir, { url: "https://univis.uni-kiel.de/form?sem=2026s" }, "cached html");
    process.env.UNIVIS_FORCE_TREE_HTTP_REFRESH = "1";

    await expect(readTreeHttpCache(rootDir, { url: "https://univis.uni-kiel.de/form?sem=2026s" })).resolves.toBeNull();
  });
});
