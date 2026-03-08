import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateBuildArtifacts } from "../../src/generator/index.js";

describe("build generator", () => {
  it("writes catalog assets", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generator-"));
    const manifest = await generateBuildArtifacts(rootDir, [
      {
        id: "abc123",
        slug: "english-literature-abc123",
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=course&id=1",
        title: "English Literature",
        faculty: "Medicine",
        semester: "WS 2025/2026",
        lecturers: [],
        sessions: [],
        searchText: "English Literature",
        language: "english",
        languageConfidence: "high",
        languageEvidence: ["English"],
        lastSeen: "2026-03-07T00:00:00.000Z"
      }
    ]);

    const catalog = await readFile(join(rootDir, "data", "build", "catalog.json"), "utf8");
    const institutionSummary = await readFile(join(rootDir, "data", "build", "institution-summary.json"), "utf8");
    const lecturesBrowser = await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8");
    const nodeMembership = await readFile(join(rootDir, "data", "build", "node-membership.json"), "utf8");
    const publicCatalog = await readFile(join(rootDir, "site", "public", "data", "catalog.json"), "utf8");
    expect(manifest.courseCount).toBe(1);
    expect(catalog).toContain("English Literature");
    expect(institutionSummary).toContain("Medicine");
    expect(lecturesBrowser).toContain('"roots": []');
    expect(nodeMembership).toContain('"lecture"');
    expect(publicCatalog).toContain("English Literature");
  });
});
