import { describe, expect, it } from "vitest";

describe("discovery seeds", () => {
  it("starts from the public root and documents teaching entrypoints", async () => {
    const seeds = (await import("../../data/discovery/seed-urls.json", { with: { type: "json" } })).default as string[];
    const pageTypes = (await import("../../data/discovery/page-types.json", { with: { type: "json" } })).default as Record<string, string[]>;
    expect(seeds[0]).toBe("https://univis.uni-kiel.de/");
    expect(seeds.some((url) => url.includes("dsc=anew/tlecture") && url.includes("lang=en") && url.includes("sem=2026s"))).toBe(true);
    expect(pageTypes["semester-index"]).toContain("dsc=anew/tlecture");
    expect(pageTypes["course-detail"]).toContain("dsc=anew/lecture_view");
  });
});
