import { describe, expect, it } from "vitest";
import { filterCourses } from "../../site/components/catalog.js";

describe("faculty filter", () => {
  const courses = [
    {
      id: "1",
      slug: "medicine-1",
      sourceUrl: "https://univis.uni-kiel.de/1",
      title: "Clinical Seminar",
      faculty: "Medicine",
      semester: "SS 2026",
      type: "Seminar",
      lecturers: [],
      sessions: [],
      searchText: "Clinical Seminar Medicine",
      language: "english",
      languageConfidence: "high",
      languageEvidence: ["English"],
      lastSeen: "2026-03-07T00:00:00.000Z"
    },
    {
      id: "2",
      slug: "humanities-2",
      sourceUrl: "https://univis.uni-kiel.de/2",
      title: "Philosophy Colloquium",
      faculty: "Humanities",
      semester: "SS 2026",
      type: "Seminar",
      lecturers: [],
      sessions: [],
      searchText: "Philosophy Colloquium Humanities",
      language: "german",
      languageConfidence: "high",
      languageEvidence: ["Deutsch"],
      lastSeen: "2026-03-07T00:00:00.000Z"
    }
  ];

  it("filters courses by faculty label", () => {
    expect(
      filterCourses(courses, {
        query: "",
        language: "all",
        semester: "all",
        type: "all",
        lecturer: "all",
        confidence: "all",
        faculty: "Medicine"
      })
    ).toHaveLength(1);
  });
});
