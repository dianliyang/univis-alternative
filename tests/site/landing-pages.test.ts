import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("language landing pages", () => {
  it("uses the built-in VitePress home layout with institution entry points", async () => {
    const index = await readFile(join(process.cwd(), "site", "docs", "index.md"), "utf8");
    const indexDe = await readFile(join(process.cwd(), "site", "docs", "de", "index.md"), "utf8");
    expect(index).toContain("layout: home");
    expect(index).toContain("hero:");
    expect(index).toContain("image:");
    expect(index).toContain("src: /logo-light.svg");
    expect(index).toContain("features:");
    expect(index).toContain("Faculty of Engineering");
    expect(index).toContain("Browse Institutions");
    expect(index).not.toContain("/courses/catalog");
    expect(index).toContain("link: /lectures/engineering/");
    expect(index).toContain("link: /lectures/mathematics-and-natural-sciences/");
    expect(indexDe).toContain("image:");
    expect(indexDe).toContain("src: /logo-light.svg");
    expect(indexDe).toContain("link: /de/lectures/engineering/");
    expect(indexDe).not.toContain("/de/courses/catalog");
  });
});
