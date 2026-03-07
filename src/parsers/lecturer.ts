import * as cheerio from "cheerio";

export interface ParsedLecturer {
  sourceUrl: string;
  name: string;
  role?: string;
  organization?: string;
  email?: string;
  phone?: string;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

export function parseLecturerPage(sourceUrl: string, html: string): ParsedLecturer {
  const $ = cheerio.load(html);
  const rows = new Map<string, string>();
  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) {
      return;
    }
    rows.set(cleanText($(cells[0]).text()).replace(/:$/, "").toLowerCase(), cleanText($(cells[1]).text()));
  });

  const bodyText = cleanText($("body").text());
  return {
    sourceUrl,
    name: cleanText($("h1").first().text() || rows.get("name") || $("title").text()),
    role: rows.get("funktion"),
    organization: rows.get("einrichtung"),
    email: bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0],
    phone: rows.get("telefon")
  };
}
