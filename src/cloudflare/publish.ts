import { access } from "node:fs/promises";
import { join } from "node:path";
import { PUBLIC_DATA_FILES, buildPublishedDataKey } from "./data.js";

export interface PublishedDataEntry {
  fileName: string;
  filePath: string;
  objectKey: string;
}

export async function collectPublishedDataEntries(rootDir: string, prefix = "latest"): Promise<PublishedDataEntry[]> {
  const entries: PublishedDataEntry[] = [];

  for (const fileName of PUBLIC_DATA_FILES) {
    const filePath = join(rootDir, "site", "public", "data", fileName);
    await access(filePath);
    entries.push({
      fileName,
      filePath,
      objectKey: buildPublishedDataKey(fileName, prefix)
    });
  }

  return entries;
}
