import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compareSemesterCodes, getRecentSemesterCodes } from "../src/utils/semester.js";

const rootDir = process.cwd();

export async function resolveLatestBuildSemester(projectRoot: string): Promise<string> {
  if (process.env.UNIVIS_SEMESTER) {
    return process.env.UNIVIS_SEMESTER;
  }

  const seedUrls = JSON.parse(
    await readFile(`${projectRoot}/data/discovery/seed-urls.json`, "utf8").catch(() => "[]")
  ) as string[];
  const semesters = [...new Set(seedUrls.map(extractSemesterCode).filter((value): value is string => Boolean(value)))].sort(compareSemesterCodes);

  return semesters.at(-1) ?? getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"))[0]!;
}

export function extractSemesterCode(urlText: string): string | null {
  try {
    return new URL(urlText).searchParams.get("sem");
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const semester = await resolveLatestBuildSemester(rootDir);

  execFileSync("npx", ["tsx", "scripts/build-bilingual-lecture-tree.ts", semester], {
    stdio: "inherit"
  });
  execFileSync("npx", ["tsx", "scripts/build-bilingual-organization-tree.ts", semester], {
    stdio: "inherit"
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
