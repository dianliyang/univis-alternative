import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("about pages", () => {
  it("uses the sponsor card component on both localized about pages", async () => {
    const about = await readFile(join(process.cwd(), "site", "docs", "about", "index.md"), "utf8");
    const aboutDe = await readFile(join(process.cwd(), "site", "docs", "de", "about", "index.md"), "utf8");

    expect(about).toContain("<SponsorCard");
    expect(aboutDe).toContain("<SponsorCard");
  });

  it("registers the sponsor card component in the VitePress theme", async () => {
    const theme = await readFile(join(process.cwd(), "site", ".vitepress", "theme", "index.ts"), "utf8");

    expect(theme).toContain('import SponsorCard from "../../components/SponsorCard.vue"');
    expect(theme).toContain('app.component("SponsorCard", SponsorCard)');
  });

  it("keeps the sponsor card compact with avatar and sponsor CTA", async () => {
    const component = await readFile(join(process.cwd(), "site", "components", "SponsorCard.vue"), "utf8");

    expect(component).toContain("github.com/dianliyang.png");
    expect(component).toContain("GitHub Sponsors");
    expect(component).toContain("sponsor-card__avatar");
  });
});
