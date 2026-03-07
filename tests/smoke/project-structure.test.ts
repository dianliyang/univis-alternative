import { describe, expect, it } from "vitest";
import type { CourseLanguage, NormalizedCourse, PageType } from "../../src/types.js";

describe("project structure", () => {
  it("exports shared types for later pipeline stages", () => {
    const pageType: PageType = "course-detail";
    const language: CourseLanguage = "english";
    const course: NormalizedCourse = {
      id: "course-1",
      slug: "course-1",
      sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture",
      title: "Example Course",
      lecturers: [],
      sessions: [],
      searchText: "Example Course",
      language,
      languageConfidence: "high",
      languageEvidence: ["type check"],
      lastSeen: "2026-03-07T00:00:00.000Z"
    };

    expect(pageType).toBe("course-detail");
    expect(course.language).toBe("english");
  });
});
