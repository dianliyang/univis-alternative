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
    expect(packageJson.scripts["fetch:data"]).toBeTruthy();
    expect(packageJson.scripts["prepare:trees"]).toBeTruthy();
    expect(packageJson.scripts.crawl).toBeTruthy();
    expect(packageJson.scripts.parse).toBeTruthy();
    expect(packageJson.scripts.normalize).toBeTruthy();
    expect(packageJson.scripts.generate).toBeTruthy();
    expect(packageJson.scripts["fetch:data"]).toBe("npm run discover && npm run crawl");
    expect(packageJson.scripts["build:data"]).toBe("npm run prepare:trees && npm run parse && npm run normalize && npm run generate");
    expect(packageJson.scripts.build).toBeTruthy();
    expect(packageJson.scripts.build).toBe("npm run fetch:data && npm run build:data && npm run build:site");
    expect(packageJson.scripts["cf:build"]).toBe("npm run build:data && npm run build:site");
  });

  it("documents Cloudflare builds as local rebuilds, not crawls", async () => {
    const readme = await readFile(join(process.cwd(), "README.md"), "utf8");
    const deployDoc = await readFile(join(process.cwd(), "cloudflare", "DEPLOY.md"), "utf8");

    expect(readme).toContain("`npm run fetch:data`");
    expect(readme).toContain("`npm run prepare:trees`");
    expect(readme).toContain("`npm run build:data`");
    expect(readme).toContain("`npm run cf:build` rebuilds from existing local data after refreshing tree artifacts");
    expect(readme).toContain("manual GitHub Actions workflow");
    expect(deployDoc).toContain("`npm run cf:build` only rebuilds from existing local crawl data, but it refreshes bilingual tree artifacts first.");
    expect(deployDoc).toContain("Run `npm run fetch:data` before `npm run build:data` when you need fresh remote crawl data.");
    expect(deployDoc).toContain("`CLOUDFLARE_API_TOKEN`");
    expect(deployDoc).toContain("`CLOUDFLARE_ACCOUNT_ID`");
    expect(deployDoc).toContain("GitHub Actions cache");
    expect(deployDoc).toContain("refresh-trees.yml");
    expect(deployDoc).toContain("fresh_crawl");
    expect(deployDoc).toContain("force_tree_refresh");
    expect(deployDoc).toContain("phase timing");
  });

  it("defines a manual remote deploy workflow", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "deploy-cloudflare.yml"),
      "utf8"
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm run fetch:data");
    expect(workflow).toContain("npm run cf:build");
    expect(workflow).toContain("npm run cf:publish-data");
    expect(workflow).toContain("npm run cf:deploy");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(workflow).toContain("actions/cache");
    expect(workflow).toContain("data/discovery");
    expect(workflow).toContain("data/raw");
    expect(workflow).toContain("data/normalized");
    expect(workflow).toContain("fresh_crawl:");
    expect(workflow).toContain("force_tree_refresh:");
    expect(workflow).toContain("if: ${{ inputs.fresh_crawl == 'true' }}");
    expect(workflow).toContain("UNIVIS_FORCE_TREE_REFRESH: ${{ inputs.force_tree_refresh == 'true' && '1' || '0' }}");
    expect(workflow).toContain("date +%s");
    expect(workflow).toContain("Phase timing summary");
  });

  it("defines a separate manual tree refresh workflow", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github", "workflows", "refresh-trees.yml"),
      "utf8"
    );

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("npm run prepare:trees");
    expect(workflow).toContain("actions/cache");
    expect(workflow).toContain("data/normalized");
    expect(workflow).not.toContain("npm run cf:deploy");
    expect(workflow).toContain("Phase timing summary");
  });
});
