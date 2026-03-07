import { describe, expect, it } from "vitest";
import { hydrateQueueItems } from "../../src/crawl/frontier.js";

describe("crawl frontier priority", () => {
  it("prefers shallow tlecture branches before deep branches and detail pages", () => {
    const items = hydrateQueueItems([
      "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=alpha&sem=2025w",
      "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/analysis&sem=2025w",
      "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe&sem=2025w"
    ]);

    expect(items.map((item) => item.fetchUrl)).toEqual([
      "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe&sem=2025w",
      "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/analysis&sem=2025w",
      "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=alpha&sem=2025w"
    ]);
  });
});
