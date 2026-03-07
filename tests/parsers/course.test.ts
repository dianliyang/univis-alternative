import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCoursePage } from "../../src/parsers/course.js";

describe("course parser", () => {
  it("extracts the main structured fields", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "courses", "course.html"), "utf8");
    const course = parseCoursePage("https://univis.uni-kiel.de/form?dsc=course&id=123", html);

    expect(course.title).toBe("Computational Linguistics Seminar");
    expect(course.languageText).toBe("English");
    expect(course.lecturers).toHaveLength(2);
    expect(course.sessions).toHaveLength(2);
  });
});
