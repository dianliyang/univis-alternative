import * as cheerio from "cheerio";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function depthForPath(path: string): number {
  return path.split("/").filter(Boolean).length;
}

function fallbackLabelForPath(path: string): string {
  return cleanText(path.split("/").filter(Boolean).at(-1) ?? "Lecture directory");
}

export interface ParsedDirectoryChild {
  label: string;
  path: string;
  sourceUrl: string;
}

export interface ParsedDirectoryNode {
  label: string;
  path: string;
  depth: number;
  semester?: string;
  sourceUrl: string;
  children: ParsedDirectoryChild[];
}

export function parseDirectoryPage(sourceUrl: string, html: string): ParsedDirectoryNode | null {
  const url = new URL(sourceUrl);
  const path = url.searchParams.get("tdir") ?? "";
  const depth = depthForPath(path);
  const semester = url.searchParams.get("sem") ?? undefined;

  const $ = cheerio.load(html);
  const label = cleanText($("h2").first().text()) || fallbackLabelForPath(path);

  const childMap = new Map<string, ParsedDirectoryChild>();
  $('a[href*="dsc=anew/tlecture"]').each((_, link) => {
    const href = $(link).attr("href");
    if (!href) {
      return;
    }

    const target = new URL(href, sourceUrl);
    const childPath = target.searchParams.get("tdir") ?? "";
    if (!childPath) {
      return;
    }

    const childDepth = depthForPath(childPath);
    const isDirectChild = childDepth === depth + 1;
    const isDescendant = !path || childPath === path || childPath.startsWith(`${path}/`);
    if (!isDirectChild || !isDescendant) {
      return;
    }

    const childLabel = cleanText($(link).text());
    if (!childLabel) {
      return;
    }

    childMap.set(childPath, {
      label: childLabel,
      path: childPath,
      sourceUrl: target.toString()
    });
  });

  return {
    label,
    path,
    depth,
    semester,
    sourceUrl,
    children: [...childMap.values()].sort((a, b) => a.label.localeCompare(b.label))
  };
}
