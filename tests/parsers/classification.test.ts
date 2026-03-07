import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyPage } from "../../src/parsers/classify.js";

describe("page classification", () => {
  it("recognizes course detail pages", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "classification", "course-detail.html"), "utf8");
    expect(classifyPage("https://univis.uni-kiel.de/form?dsc=anew/lecture_view&sem=2025w", html)).toBe("course-detail");
  });

  it("does not misclassify lecture listings as course detail pages", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "classification", "organization-list.html"), "utf8");
    expect(classifyPage("https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn&sem=2025w", html)).toBe("organization-list");
  });
});
