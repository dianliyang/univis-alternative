import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { classifyPage } from "../src/parsers/classify.js";
import { parseCourseListPage } from "../src/parsers/course-list.js";
import { parseCoursePage } from "../src/parsers/course.js";
import type { ParsedDirectoryNode } from "../src/parsers/directory.js";
import { parseDirectoryPage } from "../src/parsers/directory.js";
import { parseLecturerPage } from "../src/parsers/lecturer.js";
import { readCrawlManifest } from "../src/crawl/store.js";
import type { CrawlRecord, ParsedCourse } from "../src/types.js";

const rootDir = process.cwd();

async function main(): Promise<void> {
  const rawDir = join(rootDir, "data", "raw");
  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const manifest = (await readCrawlManifest(rootDir)) ?? [];
  const courses: ParsedCourse[] = [];
  const lecturers: unknown[] = [];
  const directories: ParsedDirectoryNode[] = [];

  for (const metadata of manifest) {
    const html = await readFile(join(rawDir, `${metadata.path.split("/").at(-1)?.replace(/\.html$/, "")}.html`), "utf8");
    const type = classifyPage(metadata.sourceUrl, html);

    if (type === "course-detail") {
      courses.push(parseCoursePage(metadata.sourceUrl, html));
    }

    if (type === "semester-index") {
      const directory = parseDirectoryPage(metadata.sourceUrl, html);
      if (directory) {
        directories.push(directory);
      }
      courses.push(...parseCourseListPage(metadata.sourceUrl, html));
    }

    if (type === "lecturer-profile") {
      lecturers.push(parseLecturerPage(metadata.sourceUrl, html));
    }
  }

  await writeFile(join(rootDir, "data", "normalized", "parsed-courses.json"), JSON.stringify(courses, null, 2));
  await writeFile(join(rootDir, "data", "normalized", "parsed-directories.json"), JSON.stringify(directories, null, 2));
  await writeFile(join(rootDir, "data", "normalized", "parsed-lecturers.json"), JSON.stringify(lecturers, null, 2));
  console.log(`Parsed ${courses.length} courses and ${lecturers.length} lecturers.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
