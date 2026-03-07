import { describe, expect, it } from "vitest";
import { hydrateQueueItems, shouldRefetchSnapshot } from "../../src/crawl/frontier.js";

describe("crawl revalidation", () => {
  it("revalidates stale snapshots", () => {
    expect(
      shouldRefetchSnapshot(
        { fetchedAt: "2026-03-01T00:00:00.000Z", status: 200 },
        { now: "2026-03-07T00:00:00.000Z", maxAgeHours: 24 }
      )
    ).toBe(true);
  });

  it("keeps fresh successful snapshots", () => {
    expect(
      shouldRefetchSnapshot(
        { fetchedAt: "2026-03-06T12:00:00.000Z", status: 200 },
        { now: "2026-03-07T00:00:00.000Z", maxAgeHours: 24 }
      )
    ).toBe(false);
  });

  it("rehydrates stored discovered links from cached pages", () => {
    const items = hydrateQueueItems([
      "https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture_view&lvs=x&anonymous=1&ref=tlecture&sem=2025w&tdir=mathe&__e=519"
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.canonicalUrl).toBe("https://univis.uni-kiel.de/form?dsc=anew%2Flecture_view&lvs=x&sem=2025w");
  });
});
