import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("InstitutionsBrowser component", () => {
  it("uses bundled institution organization data instead of fetching it on mount", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "InstitutionsBrowser.vue"), "utf8");

    expect(source).toContain('from "../../data/build/institutions-organizations.json"');
    expect(source).not.toContain('loadPublishedJson<BrowserNode[]>("institutions-organizations.json")');
    expect(source).toContain("state.lectures.length");
  });

  it("renders the institutions browser as a breadcrumb block for the active branch", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "InstitutionsBrowser.vue"), "utf8");

    expect(source).toContain("browser-list__breadcrumb");
    expect(source).not.toContain("browser-list__tree-row");
  });

  it("truncates long organization labels with ellipsis and preserves full text in titles", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "InstitutionsBrowser.vue"), "utf8");

    expect(source).toContain("text-overflow: ellipsis");
    expect(source).toContain(':title="labelFor(child)"');
    expect(source).toContain(':title="labelFor(node)"');
    expect(source).toContain(".browser-list__breadcrumb .browser-list__link--secondary");
    expect(source).toContain("max-width: 14rem");
  });

  it("shows a trailing chevron for rows with children", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "InstitutionsBrowser.vue"), "utf8");

    expect(source).toContain("browser-list__chevron");
    expect(source).toContain("v-if=\"node.children.length\"");
    expect(source).toContain("v-if=\"child.children.length\"");
    expect(source).toContain("class=\"browser-list__link\" :title=\"labelFor(node)\" @click=\"select(node.path)\"");
  });

  it("renders related lecture links under the active institution node", async () => {
    const source = await readFile(join(process.cwd(), "site", "components", "InstitutionsBrowser.vue"), "utf8");

    expect(source).toContain("browser-list__lecture-link");
    expect(source).toContain("lectureHref");
    expect(source).toContain("lectureLabelFor");
  });
});
