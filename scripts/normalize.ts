import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { normalizeCourses } from "../src/normalize/index.js";
import type { ParsedCourse } from "../src/types.js";

const rootDir = process.cwd();

async function main(): Promise<void> {
  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const parsedCourses = JSON.parse(await readFile(join(rootDir, "data", "normalized", "parsed-courses.json"), "utf8")) as ParsedCourse[];
  const courses = normalizeCourses(parsedCourses, new Date().toISOString());
  await writeFile(join(rootDir, "data", "normalized", "courses.json"), JSON.stringify(courses, null, 2));
  console.log(`Normalized ${courses.length} courses.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
