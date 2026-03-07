import * as cheerio from "cheerio";

export interface ParsedOrganizationChild {
  label: string;
  dir: string;
  sourceUrl: string;
  section?: string;
}

export interface ParsedOrganizationNode {
  label: string;
  dir: string;
  sourceUrl: string;
  lectureListUrl?: string;
  lectureCount?: number;
  children: ParsedOrganizationChild[];
}

export function parseOrganizationPage(sourceUrl: string, html: string): ParsedOrganizationNode {
  const url = new URL(sourceUrl);
  const dir = url.searchParams.get("dir") ?? "";
  const $ = cheerio.load(html);
  const label = cleanText($("h2").first().text()) || (dir || "Organization");

  const lectureLink = $('a[href*="lecture_zentr=1"]').first();
  const lectureHref = lectureLink.attr("href");
  const lectureCountMatch = cleanText(lectureLink.text()).match(/(\d+)\s+entries/i);

  const children: ParsedOrganizationChild[] = [];
  const seenDirs = new Set<string>();

  $("h4").each((_, heading) => {
    const section = cleanText($(heading).text());
    const list = $(heading).next("ul");
    collectLinks(list, section, children, seenDirs, sourceUrl, $);
  });

  if (children.length === 0) {
    const directList = $("h2").first().nextAll("ul").first();
    collectLinks(directList, undefined, children, seenDirs, sourceUrl, $);
  }

  return {
    label,
    dir,
    sourceUrl,
    lectureListUrl: lectureHref ? new URL(lectureHref, sourceUrl).toString() : undefined,
    lectureCount: lectureCountMatch ? Number.parseInt(lectureCountMatch[1]!, 10) : undefined,
    children
  };
}

function collectLinks(
  list: cheerio.Cheerio<cheerio.Element>,
  section: string | undefined,
  children: ParsedOrganizationChild[],
  seenDirs: Set<string>,
  sourceUrl: string,
  $: cheerio.CheerioAPI
): void {
  list.find('a[href*="dsc=anew/lecture"][href*="dir="]').each((__, link) => {
    const href = $(link).attr("href");
    if (!href) {
      return;
    }
    const target = new URL(href, sourceUrl);
    const childDir = target.searchParams.get("dir") ?? "";
    if (!childDir || seenDirs.has(childDir)) {
      return;
    }
    seenDirs.add(childDir);
    children.push({
      label: cleanText($(link).text()),
      dir: childDir,
      sourceUrl: target.toString(),
      section
    });
  });
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}
