import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateBuildArtifacts } from "../src/generator/index.js";
import type { ParsedDirectoryNode } from "../src/parsers/directory.js";
import type { NormalizedCourse } from "../src/types.js";

const rootDir = process.cwd();

async function main(): Promise<void> {
  const courses = JSON.parse(await readFile(join(rootDir, "data", "normalized", "courses.json"), "utf8")) as NormalizedCourse[];
  const directories = JSON.parse(
    await readFile(join(rootDir, "data", "normalized", "parsed-directories.json"), "utf8").catch(() => "[]")
  ) as ParsedDirectoryNode[];
  const manifest = await generateBuildArtifacts(rootDir, courses, directories);
  console.log(`Generated ${manifest.courseCount} course records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
