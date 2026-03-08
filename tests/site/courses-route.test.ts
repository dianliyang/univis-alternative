import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("courses routes", () => {
  it("uses an institutions browser on /institutions and a lectures browser on /lectures without a catalog page", async () => {
    const institutionsPage = await readFile(join(process.cwd(), "site", "docs", "institutions", "index.md"), "utf8");
    const lecturesPage = await readFile(join(process.cwd(), "site", "docs", "lectures", "index.md"), "utf8");

    expect(institutionsPage).toContain("<InstitutionsBrowser />");
    expect(lecturesPage).toContain("<LecturesBrowser />");
    await expect(readFile(join(process.cwd(), "site", "docs", "courses", "catalog.md"), "utf8")).rejects.toThrow();
  });
});
