import { describe, expect, it } from "vitest";
import { normalizeCourses } from "../../src/normalize/index.js";

describe("slug length", () => {
  it("bounds generated slugs so route filenames stay within filesystem limits", () => {
    const longTitle = "A".repeat(400);
    const [course] = normalizeCourses(
      [
        {
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=long&sem=2025w",
          title: longTitle,
          lecturers: [],
          sessions: []
        }
      ],
      "2026-03-07T00:00:00.000Z"
    );

    expect(course?.slug.length).toBeLessThanOrEqual(96);
  });
});
