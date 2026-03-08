import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("site theme", () => {
  it("reduces the font size of sidebar child items", async () => {
    const css = await readFile(join(process.cwd(), "site", ".vitepress", "theme", "custom.css"), "utf8");

    expect(css).toContain(".VPSidebarItem.level-1 .text");
    expect(css).toContain("font-size: 0.86rem");
  });

  it("widens lecture sidebars and adds more spacing between lecture items", async () => {
    const css = await readFile(join(process.cwd(), "site", ".vitepress", "theme", "custom.css"), "utf8");

    expect(css).toContain(".VPDoc.has-sidebar.lecture-node-page .content");
    expect(css).toContain("--vp-sidebar-width: 360px");
    expect(css).toContain(".lecture-node-page .VPSidebarItem.level-1 + .VPSidebarItem.level-1");
    expect(css).toContain("margin-top: 0.3rem");
    expect(css).toContain(".lecture-node-page .VPSidebarItem.level-1 .text");
    expect(css).toContain("padding: 0.45rem 0");
  });

});
