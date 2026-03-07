import { describe, expect, it } from "vitest";
import { normalizeCourses } from "../../src/normalize/index.js";

describe("catalog normalization", () => {
  it("generates stable normalized course records", () => {
    const [course] = normalizeCourses(
      [
        {
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=course&id=1",
          title: "English Literature",
          description: "Taught in English.",
          languageText: "English",
          lecturers: [{ name: "Dr. Jane Doe" }],
          sessions: []
        }
      ],
      "2026-03-07T00:00:00.000Z"
    );

    expect(course.slug).toContain("english-literature");
    expect(course.language).toBe("english");
  });
});
