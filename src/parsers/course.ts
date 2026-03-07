import * as cheerio from "cheerio";
import type { ParsedCourse, Session } from "../types.js";

const WEEKDAY_RE = /(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
const TIME_RE = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function extractLabelMap($: cheerio.CheerioAPI): Map<string, string> {
  const map = new Map<string, string>();
  $("dl > dt").each((_, dt) => {
    const label = cleanText($(dt).text()).replace(/:$/, "").toLowerCase();
    const value = cleanText($(dt).next("dd").text());
    if (label && value) {
      map.set(label, value);
    }
  });
  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) {
      return;
    }
    const label = cleanText($(cells[0]).text()).replace(/:$/, "").toLowerCase();
    const value = cleanText($(cells[1]).text());
    if (label && value) {
      map.set(label, value);
    }
  });
  return map;
}

function extractSessions(text: string): Session[] {
  return text
    .split(/;|\n/)
    .map((part) => cleanText(part))
    .filter(Boolean)
    .map((part) => {
      const weekday = part.match(WEEKDAY_RE)?.[1];
      const time = part.match(TIME_RE);
      return {
        day: weekday,
        start: time?.[1],
        end: time?.[2],
        room: part.match(/raum\s+([^,;]+)/i)?.[1] ?? part.match(/\b([A-Z]{1,4}[-\s]?\d[\w-]*)\b/)?.[1],
        notes: part
      } satisfies Session;
    })
    .filter((session) => session.day || session.start || session.room);
}

export function parseCoursePage(sourceUrl: string, html: string): ParsedCourse {
  const $ = cheerio.load(html);
  const fields = extractLabelMap($);
  const title = cleanText($("dl h3").first().text() || $("h1").first().text() || $("title").text()).replace(/^[^\p{L}\p{N}]+/u, "") || "Untitled course";
  const description = cleanText(fields.get("inhalt") ?? fields.get("voraussetzungen / organisatorisches") ?? fields.get("kommentar") ?? $("p").slice(0, 3).text());
  const lecturerText = fields.get("dozentinnen/dozenten") ?? fields.get("dozent") ?? fields.get("lehrende") ?? fields.get("verantwortlich") ?? "";
  const detailsText = fields.get("angaben") ?? "";
  const sessionText = [fields.get("zeit und ort"), fields.get("termine"), fields.get("zeit/ort"), detailsText].filter(Boolean).join("; ");

  return {
    sourceUrl,
    title,
    subtitle: fields.get("untertitel"),
    semester: fields.get("semester"),
    faculty: fields.get("fakultät") ?? fields.get("fakultat"),
    institute: fields.get("einrichtung"),
    description,
    type: cleanText(detailsText.split(",")[0] ?? fields.get("art") ?? fields.get("typ") ?? ""),
    languageText: fields.get("sprache") ?? fields.get("unterrichtssprache"),
    lecturers: lecturerText
      .split(/,|;|\band\b/i)
      .map((name) => cleanText(name))
      .filter(Boolean)
      .map((name) => ({ name })),
    sessions: extractSessions(sessionText)
  };
}
