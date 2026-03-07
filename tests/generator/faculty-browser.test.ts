import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateBuildArtifacts } from "../../src/generator/index.js";

describe("faculty browser artifact", () => {
  it("builds a nested faculty tree from parsed tlecture nodes for the latest semester", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-faculty-browser-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "abc123",
          slug: "english-literature-abc123",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=x&sem=2025w&tdir=mathe/mathem",
          title: "English Literature",
          faculty: "Mathematics and Natural Sciences",
          lecturers: [],
          sessions: [],
          searchText: "English Literature",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["English"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [
        {
          label: "Faculty of Mathematics and Natural Sciences",
          path: "mathe",
          depth: 1,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe&sem=2025w",
          children: [
            {
              label: "Mathematics",
              path: "mathe/mathem",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem&sem=2025w"
            }
          ]
        },
        {
          label: "Mathematics",
          path: "mathe/mathem",
          depth: 2,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem&sem=2025w",
          children: [
            {
              label: "One-subject Bachelor's Programme",
              path: "mathe/mathem/1fachb",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/1fachb&sem=2025w"
            }
          ]
        },
        {
          label: "One-subject Bachelor's Programme",
          path: "mathe/mathem/1fachb",
          depth: 3,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/1fachb&sem=2025w",
          children: []
        }
      ]
    );

    const browser = JSON.parse(await readFile(join(rootDir, "data", "build", "faculty-browser.json"), "utf8"));
    expect(browser.semester).toBe("2025w");
    expect(browser.faculties).toHaveLength(1);
    expect(browser.faculties[0].children[0].label).toBe("Mathematics");
    expect(browser.faculties[0].children[0].children[0].label).toBe("One-subject Bachelor's Programme");
    expect(browser.faculties[0].treeUrl).toContain("dsc=anew%2Ftlecture%3Atree");
  });
});
