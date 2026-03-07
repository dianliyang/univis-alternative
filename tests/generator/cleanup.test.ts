import { mkdtemp, mkdir, writeFile, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateBuildArtifacts } from "../../src/generator/index.js";

describe("generator cleanup", () => {
  it("removes stale course routes before writing new ones", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generator-clean-"));
    const staleFile = join(rootDir, "site", "docs", "courses", "stale.md");
    await mkdir(join(rootDir, "site", "docs", "courses"), { recursive: true });
    await writeFile(staleFile, "# stale");

    await generateBuildArtifacts(rootDir, [
      {
        id: "abc123",
        slug: "english-literature-abc123",
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=1&sem=2025w",
        title: "English Literature",
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

    await expect(access(staleFile)).rejects.toThrow();
  });

  it("preserves manually maintained index pages during cleanup", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generator-clean-"));
    const indexFile = join(rootDir, "site", "docs", "courses", "index.md");
    await mkdir(join(rootDir, "site", "docs", "courses"), { recursive: true });
    await writeFile(indexFile, "# Courses");

    await generateBuildArtifacts(rootDir, [
      {
        id: "abc123",
        slug: "english-literature-abc123",
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=1&sem=2025w",
        title: "English Literature",
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

    expect(await readFile(indexFile, "utf8")).toBe("# Courses");
  });
});
