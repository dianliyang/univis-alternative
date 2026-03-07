import { describe, expect, it } from "vitest";
import { normalizeCourses } from "../../src/normalize/index.js";

describe("course merge normalization", () => {
  it("merges listing and detail records for the same lecture_view URL", () => {
    const courses = normalizeCourses(
      [
        {
          sourceUrl: "https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture_view&lvs=x&anonymous=1&ref=tlecture&sem=2025w&__e=519",
          title: "English Scientific Writing I",
          description: "",
          languageText: "in englischer Sprache",
          type: "UE",
          lecturers: [],
          sessions: []
        },
        {
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=x&ref=tlecture&sem=2025w",
          title: "English Scientific Writing I",
          description: "Detailed description",
          lecturers: [{ name: "Dr. Jane Doe" }],
          sessions: []
        }
      ],
      "2026-03-07T00:00:00.000Z"
    );

    expect(courses).toHaveLength(1);
    expect(courses[0]?.description).toBe("Detailed description");
    expect(courses[0]?.language).toBe("english");
    expect(courses[0]?.lecturers).toHaveLength(1);
  });
});
