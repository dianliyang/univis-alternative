import { describe, expect, it } from "vitest";
import { buildPublishedDataKey, resolvePublishedDataFile } from "../../src/cloudflare/data.js";

describe("cloudflare published data helpers", () => {
  it("recognizes allowed API data files", () => {
    expect(resolvePublishedDataFile("/api/data/catalog.json")).toBe("catalog.json");
    expect(resolvePublishedDataFile("/api/data/lectures-browser.json")).toBe("lectures-browser.json");
    expect(resolvePublishedDataFile("/api/data/institutions-organizations.json")).toBe("institutions-organizations.json");
    expect(resolvePublishedDataFile("/api/data/not-allowed.json")).toBeNull();
    expect(resolvePublishedDataFile("/courses/")).toBeNull();
  });

  it("builds stable R2 keys from a prefix", () => {
    expect(buildPublishedDataKey("catalog.json")).toBe("latest/catalog.json");
    expect(buildPublishedDataKey("manifest.json", "/snapshots/2025w/")).toBe("snapshots/2025w/manifest.json");
    expect(buildPublishedDataKey("search-index.json", "")).toBe("search-index.json");
  });
});
