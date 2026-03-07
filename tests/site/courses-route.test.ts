import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("courses routes", () => {
  it("uses a faculty browser on /courses and keeps the heavy catalog on /courses/catalog", async () => {
    const indexPage = await readFile(join(process.cwd(), "site", "docs", "courses", "index.md"), "utf8");
    const catalogPage = await readFile(join(process.cwd(), "site", "docs", "courses", "catalog.md"), "utf8");

    expect(indexPage).toContain("<FacultyBrowser />");
    expect(catalogPage).toContain("<CourseSearch />");
  });
});
