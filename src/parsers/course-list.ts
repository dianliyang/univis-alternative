import * as cheerio from "cheerio";
import type { ParsedCourse } from "../types.js";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

export function parseCourseListPage(sourceUrl: string, html: string): ParsedCourse[] {
  const $ = cheerio.load(html);
  return $('a[href*="lecture_view"]')
    .map((_, link) => {
      const href = $(link).attr("href");
      if (!href) {
        return null;
      }

      const title = cleanText($(link).text());
      if (!title) {
        return null;
      }

      const small = cleanText($(link).closest("h4").next("small").text());
      const parts = small.split(";").map((part) => cleanText(part)).filter(Boolean);

      return {
        sourceUrl: new URL(href, sourceUrl).toString(),
        title,
        description: small,
        type: parts[0],
        languageText: parts.find((part) => /englisch|english|deutsch|german/i.test(part)),
        lecturers: [],
        sessions: []
      } satisfies ParsedCourse;
    })
    .get()
    .filter((course): course is ParsedCourse => Boolean(course));
}
