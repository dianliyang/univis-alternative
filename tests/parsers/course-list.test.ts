import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCourseListPage } from "../../src/parsers/course-list.js";

describe("course list parser", () => {
  it("extracts lecture_view summaries with language cues", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "courses", "course-list.html"), "utf8");
    const courses = parseCourseListPage("https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=medizi", html);

    expect(courses).toHaveLength(1);
    expect(courses[0]?.title).toBe("English Scientific Writing I");
    expect(courses[0]?.languageText).toContain("englischer Sprache");
    expect(courses[0]?.type).toBe("UE");
  });
});
