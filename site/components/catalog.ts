import type { NormalizedCourse } from "../../src/types.js";

export interface CatalogFilters {
  query: string;
  language: string;
  semester: string;
  type: string;
  lecturer: string;
  confidence: string;
  faculty: string;
}

export function filterCourses(courses: NormalizedCourse[], filters: CatalogFilters): NormalizedCourse[] {
  const query = filters.query.trim().toLowerCase();
  return courses.filter((course) => {
    const matchesQuery = !query || course.searchText.toLowerCase().includes(query) || course.title.toLowerCase().includes(query);
    const matchesLanguage = !filters.language || filters.language === "all" || course.language === filters.language;
    const matchesSemester = !filters.semester || filters.semester === "all" || course.semester === filters.semester;
    const matchesType = !filters.type || filters.type === "all" || course.type === filters.type;
    const matchesLecturer =
      !filters.lecturer ||
      filters.lecturer === "all" ||
      course.lecturers.some((lecturer) => lecturer.name === filters.lecturer);
    const matchesConfidence =
      !filters.confidence || filters.confidence === "all" || course.languageConfidence === filters.confidence;
    const matchesFaculty = !filters.faculty || filters.faculty === "all" || course.faculty === filters.faculty;
    return matchesQuery && matchesLanguage && matchesSemester && matchesType && matchesLecturer && matchesConfidence && matchesFaculty;
  });
}
