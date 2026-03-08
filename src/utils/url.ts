import { createHash } from "node:crypto";

export const BASE_URL = "https://univis.uni-kiel.de";
const DROPPED_QUERY_KEYS = new Set(["__s", "__e", "anonymous", "donedef", "submitimg-English", "submitimg-Semester", "setsem_jump"]);

export function canonicalizeUrl(input: string): string {
  const url = new URL(input, BASE_URL);
  url.protocol = "https:";
  url.hostname = "univis.uni-kiel.de";
  url.hash = "";

  const dsc = url.searchParams.get("dsc") ?? "";
  const dynamicDroppedKeys = new Set<string>();
  if (dsc === "anew/lecture_view" || dsc === "anew/tel_view" || dsc === "anew/room_view") {
    dynamicDroppedKeys.add("ref");
    dynamicDroppedKeys.add("tdir");
  }

  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !DROPPED_QUERY_KEYS.has(key) && !dynamicDroppedKeys.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.append(key, value);
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

export function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function boundedSlug(value: string, maxLength = 88): string {
  const slug = slugify(value);
  if (slug.length <= maxLength) {
    return slug || "id";
  }
  const hash = hashString(value).slice(0, 6);
  const truncated = slug.slice(0, maxLength - 7).replace(/-+$/g, "");
  return truncated ? `${truncated}-${hash}` : hash;
}
