import { boundedSlug, canonicalizeUrl } from "../utils/url.js";

export type XmlLectureLanguage = "english_taught" | "non_english_taught";

export interface XmlLectureTerm {
  startdate?: string;
  enddate?: string;
  starttime?: string;
  endtime?: string;
  repeat?: string;
  exclude?: string;
  roomKey?: string;
}

export interface XmlLectureRecord {
  key: string;
  lecturePath: string;
  id: string;
  title: string;
  short?: string;
  number?: string;
  semester?: string;
  language: XmlLectureLanguage;
  classificationKey?: string;
  classificationPath?: string;
  orgName?: string;
  orgUnits: string[];
  lecturerKeys: string[];
  terms: XmlLectureTerm[];
  sourceUrl: string;
  slug: string;
  extraFields: Record<string, string[]>;
  rawXml: string;
}

const HANDLED_LEAF_TAGS = new Set([
  "id",
  "name",
  "short",
  "number",
  "orgname",
  "englisch",
  "startdate",
  "enddate",
  "starttime",
  "endtime",
  "repeat",
  "exclude"
]);

export function parseLectureExportXml(
  xml: string,
  options: {
    detailLang?: "en" | "de";
  } = {}
): XmlLectureRecord[] {
  const semester = matchAttribute(xml, "UnivIS", "semester");
  const detailLang = options.detailLang ?? "en";
  const lectures = [...xml.matchAll(/<Lecture\b([^>]*)>([\s\S]*?)<\/Lecture>/g)];

  return lectures.map(([, attrs = "", block = ""]) => {
    const key = matchNamedAttribute(attrs, "key") ?? "";
    const lecturePath = key.replace(/^Lecture\./, "").replace(/\./g, "/");
    const title = decodeXmlEntities(extractText(block, "name") ?? "Untitled lecture");
    const id = decodeXmlEntities(extractText(block, "id") ?? key);
    const short = decodeXmlEntities(extractText(block, "short") ?? "");
    const number = decodeXmlEntities(extractText(block, "number") ?? "");
    const orgName = decodeXmlEntities(extractText(block, "orgname") ?? "");
    const orgUnits = extractAllTexts(block, "orgunit");
    const lecturerKeys = extractAllRefKeys(withinTag(block, "dozs"));
    const classificationKey = extractFirstRefKey(withinTag(block, "classification"));
    const classificationPath = classificationKey?.replace(/^Title\./, "").replace(/\./g, "/");
    const language = /<englisch>\s*ja\s*<\/englisch>/i.test(block) ? "english_taught" : "non_english_taught";
    const terms = extractTermBlocks(block).map(parseTermBlock);
    const sourceUrl = buildLectureDetailUrl({
      lecturePath,
      semester: semester || undefined,
      classificationPath,
      lang: detailLang
    });

    return {
      key,
      lecturePath,
      id,
      title,
      short: short || undefined,
      number: number || undefined,
      semester: semester || undefined,
      language,
      classificationKey,
      classificationPath,
      orgName: orgName || undefined,
      orgUnits,
      lecturerKeys,
      terms,
      sourceUrl,
      slug: boundedSlug(`${title}-${id}`),
      extraFields: extractExtraLeafFields(block),
      rawXml: `<Lecture${attrs}>${block}</Lecture>`
    };
  });
}

export function buildLectureDetailUrl(input: {
  lecturePath: string;
  semester?: string;
  classificationPath?: string;
  lang?: "en" | "de";
}): string {
  const url = new URL("https://univis.uni-kiel.de/form");
  url.searchParams.set("__s", "2");
  url.searchParams.set("dsc", "anew/lecture_view");
  url.searchParams.set("lvs", input.lecturePath);
  url.searchParams.set("anonymous", "1");
  url.searchParams.set("lang", input.lang ?? "en");
  if (input.semester) {
    url.searchParams.set("sem", input.semester);
  }
  url.searchParams.set("ref", "main");
  const tdir = parentClassificationPath(input.classificationPath);
  if (tdir) {
    url.searchParams.set("tdir", tdir);
  }
  url.searchParams.set("__e", "519");
  return url.toString();
}

function parentClassificationPath(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return value;
  }
  return parts.slice(0, -1).join("/");
}

function parseTermBlock(block: string): XmlLectureTerm {
  return {
    startdate: decodeXmlEntities(extractText(block, "startdate") ?? "") || undefined,
    enddate: decodeXmlEntities(extractText(block, "enddate") ?? "") || undefined,
    starttime: decodeXmlEntities(extractText(block, "starttime") ?? "") || undefined,
    endtime: decodeXmlEntities(extractText(block, "endtime") ?? "") || undefined,
    repeat: decodeXmlEntities(extractText(block, "repeat") ?? "") || undefined,
    exclude: decodeXmlEntities(extractText(block, "exclude") ?? "") || undefined,
    roomKey: extractFirstRefKey(withinTag(block, "room"))
  };
}

function extractTermBlocks(block: string): string[] {
  return [...block.matchAll(/<term>([\s\S]*?)<\/term>/g)].map((match) => match[1] ?? "");
}

function extractExtraLeafFields(block: string): Record<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const match of block.matchAll(/<([A-Za-z_][\w:-]*)>([^<]+)<\/\1>/g)) {
    const tag = match[1] ?? "";
    const value = decodeXmlEntities((match[2] ?? "").trim());
    if (!tag || !value || HANDLED_LEAF_TAGS.has(tag)) {
      continue;
    }

    const current = grouped.get(tag) ?? [];
    if (!current.includes(value)) {
      current.push(value);
    }
    grouped.set(tag, current);
  }

  return Object.fromEntries([...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function extractText(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function extractAllTexts(block: string | null, tag: string): string[] {
  if (!block) {
    return [];
  }

  return [...block.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "gi"))]
    .map((match) => decodeXmlEntities((match[1] ?? "").trim()))
    .filter(Boolean);
}

function withinTag(block: string, tag: string): string | null {
  return extractText(block, tag);
}

function extractAllRefKeys(block: string | null): string[] {
  if (!block) {
    return [];
  }

  return [...block.matchAll(/<UnivISRef\b[^>]*\bkey="([^"]+)"[^>]*\/>/g)].map((match) => decodeXmlEntities(match[1] ?? ""));
}

function extractFirstRefKey(block: string | null): string | undefined {
  return extractAllRefKeys(block)[0];
}

function matchAttribute(xml: string, tag: string, attribute: string): string | null {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${attribute}="([^"]+)"`, "i"));
  return match?.[1] ?? null;
}

function matchNamedAttribute(attrs: string, attribute: string): string | null {
  const match = attrs.match(new RegExp(`\\b${attribute}="([^"]+)"`, "i"));
  return match?.[1] ?? null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
