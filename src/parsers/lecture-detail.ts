import * as cheerio from "cheerio";

export interface HtmlDetailSection {
  heading: string;
  content: string;
}

export interface HtmlAssignedLecture {
  label?: string;
  title: string;
  number?: string;
  detailUrl?: string;
  content: string;
}

export interface HtmlLectureDetail {
  title: string;
  lecturers: string[];
  sections: HtmlDetailSection[];
  assignedLectures: HtmlAssignedLecture[];
  department?: {
    label: string;
    sourceUrl: string;
  };
}

export function parseLectureDetailPage(sourceUrl: string, html: string): HtmlLectureDetail {
  const $ = cheerio.load(html);
  const container = $("dl").first();
  const title = cleanText(container.find("h3").first().text());
  const lecturers: string[] = [];
  const sections: HtmlDetailSection[] = [];
  const assignedLectures: HtmlAssignedLecture[] = [];
  let department: HtmlLectureDetail["department"];

  const items = container.children().toArray();
  for (let index = 0; index < items.length; index += 1) {
    const element = items[index];
    if (element?.tagName !== "dt") {
      continue;
    }

    const dt = $(element);
    if (dt.find("h3").length > 0) {
      continue;
    }

    const heading = cleanHeading(dt.text());
    if (!heading) {
      continue;
    }

    if (heading === "Department" || heading.startsWith("Department:")) {
      const link = dt.find("a").first();
      const href = link.attr("href");
      if (href) {
        department = {
          label: cleanText(link.text()),
          sourceUrl: new URL(href, sourceUrl).toString()
        };
      }
      continue;
    }

    const next = items[index + 1];
    if (next?.tagName !== "dd") {
      continue;
    }

    const dd = $(next);
    if (heading === "Lecturer") {
      lecturers.push(...extractLecturerNames(dd, sourceUrl));
      sections.push({ heading, content: toPlainText(dd, sourceUrl) });
      continue;
    }

    if (heading === "Assigned lectures") {
      assignedLectures.push(...parseAssignedLectures(dd, sourceUrl));
    }

    sections.push({ heading, content: toPlainText(dd, sourceUrl) });
  }

  return {
    title,
    lecturers,
    sections,
    assignedLectures,
    department
  };
}

function extractLecturerNames(dd: cheerio.Cheerio<cheerio.Element>, sourceUrl: string): string[] {
  const clone = cheerio.load(dd.html() ?? "");
  clone("a").each((_, link) => {
    const href = clone(link).attr("href") ?? "";
    if (!href.includes("dsc=anew/tel_view")) {
      return;
    }

    const name = cleanText(clone(link).text());
    clone(link).replaceWith(name);
  });

  return splitLines(clone.root().text())
    .map((line) => line.replace(/,\s*M\.?Sc\.?$/i, "").trim())
    .filter(Boolean);
}

function parseAssignedLectures(dd: cheerio.Cheerio<cheerio.Element>, sourceUrl: string): HtmlAssignedLecture[] {
  return dd
    .find("dl")
    .first()
    .children("dt")
    .map((_, element) => {
      const dt = dd.find(element);
      const next = dt.next("dd");
      const titleLink = dt.find('a[href*="dsc=anew/lecture_view"]').first();
      const href = titleLink.attr("href");
      const dtText = cleanText(dt.text());
      const labelMatch = dtText.match(/^([^:]+):\s*/);
      const numberMatch = dtText.match(/\((\d+)\)\s*$/);

      return {
        label: labelMatch?.[1]?.trim(),
        title: cleanText(titleLink.text()),
        number: numberMatch?.[1],
        detailUrl: href ? new URL(href, sourceUrl).toString() : undefined,
        content: toPlainText(next, sourceUrl)
      };
    })
    .get()
    .filter((entry) => entry.title);
}

function toPlainText(selection: cheerio.Cheerio<cheerio.Element>, sourceUrl: string): string {
  const clone = cheerio.load(selection.html() ?? "");
  clone("br").replaceWith("\n");
  clone("p").replaceWith("\n\n");
  clone("a").each((_, link) => {
    const text = cleanText(clone(link).text());
    const href = clone(link).attr("href");
    const replacement = href ? `${text} (${safeUrl(href, sourceUrl) ?? href})` : text;
    clone(link).replaceWith(replacement);
  });
  clone("i").each((_, node) => {
    clone(node).replaceWith(cleanText(clone(node).text()));
  });

  return splitLines(clone.root().text()).join("\n");
}

function safeUrl(href: string, sourceUrl: string): string | null {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

function splitLines(value: string): string[] {
  return value
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function cleanHeading(value: string): string {
  return cleanText(value).replace(/:$/, "");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}
