import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("LecturesBrowser component", () => {
  it("uses bundled lecture tree data instead of fetching it on mount", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "LecturesBrowser.vue"), "utf8");

    expect(source).toContain('from "../../data/build/lectures-browser.json"');
    expect(source).toContain("(lecturesBrowser as LecturesBrowserData).roots");
    expect(source).toContain("node.textDe");
    expect(source).toContain("node.lectures ?? []");
    expect(source).toContain('window.location.pathname.startsWith("/de/") ? "/de/lectures/" : "/lectures/"');
  });

  it("renders the lecture browser with the same breadcrumb/list interaction pattern", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "LecturesBrowser.vue"), "utf8");

    expect(source).toContain("browser-list__breadcrumb");
    expect(source).not.toContain("browser-list__page-breadcrumb");
    expect(source).toContain("browser-list__tail");
    expect(source).toContain("browser-list__jump");
    expect(source).toContain("@click.stop");
    expect(source).toContain("browser-list__breadcrumb-track");
    expect(source).toContain("nodeJumpHref");
    expect(source).toContain("target.lectures[0]?.detailRoute ?? target.route");
    expect(source).toContain("browser-list__chevron");
    expect(source).toContain("getBrowserState");
    expect(source).toContain("state.lectures.length");
    expect(source).toContain("browser-list__lecture-link");
  });
});
