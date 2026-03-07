import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("language landing pages", () => {
  it("links the homepage to dedicated English and German course views", async () => {
    const index = await readFile(join(process.cwd(), "site", "docs", "index.md"), "utf8");
    expect(index).toContain("/courses/catalog/?language=english");
    expect(index).toContain("/courses/catalog/?language=german");
  });
});
