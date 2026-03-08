import * as cheerio from "cheerio";

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function depthForPath(path: string): number {
  return path.split("/").filter(Boolean).length;
}

function fallbackLabelForPath(path: string): string {
  const segment = path.split("/").filter(Boolean).at(-1) ?? "";
  return ROOT_LABEL_FALLBACKS[segment] ?? cleanText(segment || "Lecture directory");
}

const ROOT_LABEL_FALLBACKS: Record<string, string> = {
  agrar: "Faculty of Agricultural and Nutritional Sciences",
  angebo: "Continuing Education Offers",
  angebo_1: "Offers from PerLe (Project Successful Teaching and Learning)",
  lehran: "Teaching Offers of the Excellence Initiatives",
  _gradu: "Teaching Offers of the Research Training Groups and Integrated Graduate Schools",
  _lehra: "Teaching Offers of the Centres and Networks",
  _frhre: "Teaching Offers for Students of All Faculties",
  lehrve: "Lectures for ERASMUS and Exchange Students",
  mathe: "Faculty of Mathematics and Natural Sciences",
  medizi: "Faculty of Medicine",
  philos: "Faculty of Arts and Humanities",
  profil: "Teacher Training Profile for Grammar and Comprehensive Schools",
  rechts: "Faculty of Law",
  _ringv: "Ring Lectures",
  zentra: "German as a Foreign Language Courses",
  techn: "Faculty of Engineering",
  theol: "Faculty of Theology",
  wirtsc: "Faculty of Business, Economics, and Social Sciences"
};

function normalizeDirectoryLabel(label: string, path: string): string {
  const normalized = cleanText(label);

  if (!normalized || normalized === path.split("/").filter(Boolean).at(-1)) {
    return fallbackLabelForPath(path);
  }

  return normalized;
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
  const label = normalizeDirectoryLabel($("h2").first().text(), path);

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

    const childLabel = normalizeDirectoryLabel($(link).text(), childPath);
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
