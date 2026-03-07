import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("docs and scripts", () => {
  it("documents the accessibility checklist", async () => {
    const checklist = await readFile(join(process.cwd(), "docs", "accessibility-checklist.md"), "utf8");
    expect(checklist).toContain("Language shown as text");
  });

  it("exposes the rebuild commands", async () => {
    const packageJson = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(packageJson.scripts.crawl).toBeTruthy();
    expect(packageJson.scripts.parse).toBeTruthy();
    expect(packageJson.scripts.normalize).toBeTruthy();
    expect(packageJson.scripts.generate).toBeTruthy();
    expect(packageJson.scripts.build).toBeTruthy();
  });
});
