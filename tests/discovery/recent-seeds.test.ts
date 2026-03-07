import { describe, expect, it } from "vitest";

describe("recent semester discovery seeds", () => {
  it("includes only the recent teaching entrypoints", async () => {
    const seeds = (await import("../../data/discovery/seed-urls.json", { with: { type: "json" } })).default as string[];
    expect(seeds.some((url) => url.includes("sem=2026s"))).toBe(true);
    expect(seeds.some((url) => url.includes("sem=2024s"))).toBe(true);
    expect(seeds.some((url) => url.includes("sem=2023w"))).toBe(false);
  });
});
