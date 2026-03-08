export const PUBLIC_DATA_FILES = [
  "catalog.json",
  "institution-summary.json",
  "institutions-organizations.json",
  "lectures-browser.json",
  "manifest.json",
  "search-index.json"
] as const;

const PUBLIC_DATA_FILE_SET = new Set<string>(PUBLIC_DATA_FILES);

export function resolvePublishedDataFile(pathname: string): string | null {
  const prefix = "/api/data/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const candidate = pathname.slice(prefix.length);
  return PUBLIC_DATA_FILE_SET.has(candidate) ? candidate : null;
}

export function buildPublishedDataKey(fileName: string, prefix = "latest"): string {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  return normalizedPrefix ? `${normalizedPrefix}/${fileName}` : fileName;
}
