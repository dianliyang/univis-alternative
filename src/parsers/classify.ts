import * as cheerio from "cheerio";
import type { PageType } from "../types.js";

export function classifyPage(sourceUrl: string, html: string): PageType {
  const $ = cheerio.load(html);
  const title = $("title").text().toLowerCase();
  const heading = $("h1").first().text().toLowerCase();
  const body = $("body").text().toLowerCase();
  const url = new URL(sourceUrl);
  const dsc = url.searchParams.get("dsc") ?? "";

  if (title.includes("browser fehler") || body.includes("referenzseite veraltet")) {
    return "unknown";
  }

  if (dsc.includes("main")) {
    return "home";
  }

  if (dsc.includes("tlecture") || heading.includes("vorlesungsverzeichnis")) {
    return "semester-index";
  }

  if (dsc.includes("lecture_view") || (title === "lehrveranstaltung" && body.includes("dozentinnen/dozenten") && body.includes("angaben"))) {
    return "course-detail";
  }

  if (dsc.includes("lecture") && !dsc.includes("lecture_view")) {
    return "organization-list";
  }

  if (dsc.includes("tel_view") || body.includes("sprechstunde") || body.includes("e-mail") || body.includes("telefon")) {
    return "lecturer-profile";
  }

  if (body.includes("uhr") && body.includes("raum")) {
    return "schedule-list";
  }

  return "unknown";
}
