import { describe, expect, it } from "vitest";
import { filterCourses } from "../../site/components/catalog.js";

describe("language filter", () => {
  const courses = [
    {
      id: "1",
      slug: "english-1",
      sourceUrl: "https://univis.uni-kiel.de/1",
      title: "English Course",
      semester: "WS 2025/2026",
      type: "Seminar",
      lecturers: [{ name: "Dr. Jane Doe" }],
      sessions: [],
      searchText: "English Course Dr. Jane Doe Seminar",
      language: "english",
      languageConfidence: "high",
      languageEvidence: ["English"],
      lastSeen: "2026-03-07T00:00:00.000Z"
    },
    {
      id: "2",
      slug: "german-2",
      sourceUrl: "https://univis.uni-kiel.de/2",
      title: "German Course",
      semester: "WS 2025/2026",
      type: "Vorlesung",
      lecturers: [{ name: "Prof. Max Mustermann" }],
      sessions: [],
      searchText: "German Course Prof. Max Mustermann Vorlesung",
      language: "german",
      languageConfidence: "high",
      languageEvidence: ["Deutsch"],
      lastSeen: "2026-03-07T00:00:00.000Z"
    },
    {
      id: "3",
      slug: "unknown-3",
      sourceUrl: "https://univis.uni-kiel.de/3",
      title: "Unknown Course",
      semester: "SS 2026",
      type: "Seminar",
      lecturers: [{ name: "Dr. Jane Doe" }],
      sessions: [],
      searchText: "Unknown Course Dr. Jane Doe Seminar",
      language: "unknown",
      languageConfidence: "low",
      languageEvidence: [],
      lastSeen: "2026-03-07T00:00:00.000Z"
    }
  ];

  it("shows all courses by default", () => {
    expect(
      filterCourses(courses, {
        query: "",
        language: "all",
        semester: "all",
        type: "all",
        lecturer: "all",
        confidence: "all"
      })
    ).toHaveLength(3);
  });

  it("filters to english-taught courses when requested", () => {
    expect(
      filterCourses(courses, {
        query: "",
        language: "english",
        semester: "all",
        type: "all",
        lecturer: "all",
        confidence: "all"
      })
    ).toHaveLength(1);
  });

  it("filters by course type and lecturer", () => {
    expect(
      filterCourses(courses, {
        query: "",
        language: "all",
        semester: "all",
        type: "Seminar",
        lecturer: "Dr. Jane Doe",
        confidence: "all"
      })
    ).toHaveLength(2);
  });

  it("filters by language confidence", () => {
    expect(
      filterCourses(courses, {
        query: "",
        language: "all",
        semester: "all",
        type: "all",
        lecturer: "all",
        confidence: "high"
      })
    ).toHaveLength(2);
  });
});
