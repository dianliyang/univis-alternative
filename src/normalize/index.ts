import type { NormalizedCourse, ParsedCourse } from "../types.js";
import { detectCourseLanguage } from "./language.js";
import { deriveFacultyFromSourceUrl } from "../utils/faculty.js";
import { boundedSlug, canonicalizeUrl, hashString } from "../utils/url.js";

export function normalizeCourses(courses: ParsedCourse[], lastSeen: string): NormalizedCourse[] {
  const byKey = new Map<string, NormalizedCourse>();

  for (const course of courses) {
    const key = course.sourceUrl ? canonicalizeUrl(course.sourceUrl) : `${course.title}-${course.semester ?? ""}`;
    const id = hashString(key).slice(0, 12);
    const slugBase = boundedSlug(course.title || id) || id;
    const existing = byKey.get(key);
    const merged: ParsedCourse = existing
      ? {
          ...existing,
          ...course,
          sourceUrl: existing.sourceUrl,
          title: existing.title.length >= course.title.length ? existing.title : course.title,
          subtitle: existing.subtitle || course.subtitle,
          semester: existing.semester || course.semester,
          faculty: existing.faculty || course.faculty,
          institute: existing.institute || course.institute,
          description: (existing.description?.length ?? 0) >= (course.description?.length ?? 0) ? existing.description : course.description,
          type: existing.type || course.type,
          languageText: existing.languageText || course.languageText,
          lecturers: existing.lecturers.length > 0 ? existing.lecturers : course.lecturers,
          sessions: existing.sessions.length > 0 ? existing.sessions : course.sessions
        }
      : course;

    const languageInfo = detectCourseLanguage({
      languageText: merged.languageText,
      title: merged.title,
      description: merged.description,
      sessionsText: merged.sessions.map((session) => session.notes ?? "").join(" ")
    });
    const derivedFaculty = merged.faculty ? null : deriveFacultyFromSourceUrl(merged.sourceUrl);

    byKey.set(key, {
      ...merged,
      faculty: merged.faculty || derivedFaculty?.label,
      id,
      slug: `${slugBase}-${id.slice(0, 6)}`,
      searchText: [
        merged.title,
        merged.subtitle,
        merged.description,
        merged.faculty || derivedFaculty?.label,
        merged.type,
        merged.languageText,
        merged.semester,
        ...merged.lecturers.map((lecturer) => lecturer.name)
      ]
        .filter(Boolean)
        .join(" "),
      language: languageInfo.language,
      languageConfidence: languageInfo.confidence,
      languageEvidence: languageInfo.evidence,
      lastSeen
    });
  }

  return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title));
}
