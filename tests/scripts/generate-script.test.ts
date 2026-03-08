import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertValidBuildInputs,
  loadLatestLectureTree,
  loadLatestLectureTreeMembership,
  loadLatestOrganizationTree,
  loadLatestOrganizationTreeMembership
} from "../../scripts/generate.js";
import { resolveLatestBuildSemester } from "../../scripts/prepare-trees.js";
import { shouldRefreshTrees } from "../../scripts/prepare-trees.js";

describe("generate script organization tree loading", () => {
  it("enriches the root tree with faculty-specific bilingual trees", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "organization-tree-bilingual-2025w-root.json"),
      JSON.stringify({
        dir: "",
        children: [
          {
            dir: "techn",
            label: { en: "Faculty of Engineering" },
            children: [{ dir: "techn/elekt", label: { en: "Department of Electrical and Information Engineering" }, children: [] }]
          }
        ]
      })
    );

    await writeFile(
      join(normalizedDir, "organization-tree-bilingual-2025w-techn.json"),
      JSON.stringify({
        dir: "techn",
        label: { en: "Faculty of Engineering" },
        children: [
          {
            dir: "techn/elekt",
            label: { en: "Department of Electrical and Information Engineering" },
            children: [{ dir: "techn/elekt/allge", label: { en: "Offers Prior to Start of Study" }, children: [] }]
          }
        ]
      })
    );

    const tree = await loadLatestOrganizationTree(rootDir);
    const elekt = tree?.children?.[0]?.children?.[0];

    expect(elekt?.children?.[0]?.label?.en).toBe("Offers Prior to Start of Study");
  });

  it("loads the latest bilingual lecture tree", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "lecture-tree-bilingual-2025w-root.json"),
      JSON.stringify({
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: [{ path: "techn", label: { en: "Faculty of Engineering", de: "Technische Fakultät" }, children: [] }]
      })
    );

    const tree = await loadLatestLectureTree(rootDir);

    expect(tree?.children?.[0]?.label?.en).toBe("Faculty of Engineering");
    expect(tree?.children?.[0]?.label?.de).toBe("Technische Fakultät");
  });

  it("enriches the root lecture tree with branch-specific bilingual trees", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "lecture-tree-bilingual-2025w-root.json"),
      JSON.stringify({
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: [{ path: "techn", label: { en: "Faculty of Engineering" }, children: [] }]
      })
    );

    await writeFile(
      join(normalizedDir, "lecture-tree-bilingual-2025w-techn.json"),
      JSON.stringify({
        path: "techn",
        label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
        children: [{ path: "techn/etit", label: { en: "Department of Electrical and Information Engineering" }, children: [] }]
      })
    );

    const tree = await loadLatestLectureTree(rootDir);

    expect(tree?.children?.[0]?.children?.[0]?.label?.en).toBe("Department of Electrical and Information Engineering");
  });

  it("rebuilds lecture-tree root children from branch overlays when the stored root is empty", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "lecture-tree-bilingual-2026s-root.json"),
      JSON.stringify({
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: []
      })
    );

    await writeFile(
      join(normalizedDir, "lecture-tree-bilingual-2026s-techn.json"),
      JSON.stringify({
        path: "techn",
        label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
        children: [{ path: "techn/infora", label: { en: "Department of Computer Science" }, children: [] }]
      })
    );

    const tree = await loadLatestLectureTree(rootDir);

    expect(tree?.children?.[0]?.path).toBe("techn");
    expect(tree?.children?.[0]?.children?.[0]?.path).toBe("techn/infora");
  });

  it("loads and merges lecture-tree membership overlays", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2025w-root.json"),
      JSON.stringify({
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [{ path: "techn", lectures: [] }]
      })
    );

    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2025w-techn.json"),
      JSON.stringify({
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/etit",
            lectures: [
              {
                key: "Lecture.x",
                id: "1",
                title: { en: "Signals" },
                sourceUrl: { en: "https://example.test/lecture/x" }
              }
            ]
          }
        ]
      })
    );

    const membership = await loadLatestLectureTreeMembership(rootDir);

    expect(membership?.nodes.find((node) => node.path === "techn/etit")?.lectures[0]?.title.en).toBe("Signals");
  });

  it("does not fall back to cross-semester lecture-tree membership overlays", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({
        semester: "2026s",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [{ path: "techn/infora/master/theore", lectures: [] }]
      })
    );

    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2025w-techn-infora-master-theore.json"),
      JSON.stringify({
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infora/master/theore",
            lectures: [
              {
                key: "Lecture.z",
                id: "3",
                title: { en: "Theoretical Computer Science Seminar" },
                sourceUrl: { en: "https://example.test/lecture/z" }
              }
            ]
          }
        ]
      })
    );

    const membership = await loadLatestLectureTreeMembership(rootDir);

    expect(membership?.nodes.find((node) => node.path === "techn/infora/master/theore")?.lectures).toEqual([]);
  });

  it("loads and merges organization-tree membership overlays", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(
      join(normalizedDir, "organization-tree-membership-bilingual-2025w-root.json"),
      JSON.stringify({
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [{ path: "techn", lectures: [] }]
      })
    );

    await writeFile(
      join(normalizedDir, "organization-tree-membership-bilingual-2025w-techn.json"),
      JSON.stringify({
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infor",
            lectures: [
              {
                key: "Lecture.y",
                id: "2",
                title: { en: "Distributed Systems" },
                sourceUrl: { en: "https://example.test/lecture/y" }
              }
            ]
          }
        ]
      })
    );

    const membership = await loadLatestOrganizationTreeMembership(rootDir);

    expect(membership?.nodes.find((node) => node.path === "techn/infor")?.lectures[0]?.title.en).toBe("Distributed Systems");
  });

  it("derives the latest build semester from discovery seed URLs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-prepare-trees-"));
    const discoveryDir = join(rootDir, "data", "discovery");
    await mkdir(discoveryDir, { recursive: true });

    await writeFile(
      join(discoveryDir, "seed-urls.json"),
      JSON.stringify([
        "https://univis.uni-kiel.de/form?dsc=anew/main&sem=2025w",
        "https://univis.uni-kiel.de/form?dsc=anew/tlecture&sem=2026s",
        "https://univis.uni-kiel.de/form?dsc=anew/main&sem=2024w"
      ])
    );

    await expect(resolveLatestBuildSemester(rootDir)).resolves.toBe("2026s");
  });

  it("fails when bilingual tree roots are missing", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(join(normalizedDir, "lecture-tree-bilingual-2026s-root.json"), JSON.stringify({ path: "", children: [] }));
    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({ semester: "2026s", kind: "tlecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );

    await expect(assertValidBuildInputs(rootDir)).rejects.toThrow("Missing required organization tree root artifact");
  });

  it("fails when lecture and organization trees come from different semesters", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-generate-script-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(join(normalizedDir, "lecture-tree-bilingual-2026s-root.json"), JSON.stringify({ path: "", children: [] }));
    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({ semester: "2026s", kind: "tlecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );
    await writeFile(join(normalizedDir, "organization-tree-bilingual-2025w-root.json"), JSON.stringify({ dir: "", children: [] }));
    await writeFile(
      join(normalizedDir, "organization-tree-membership-bilingual-2025w-root.json"),
      JSON.stringify({ semester: "2025w", kind: "lecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );

    await expect(assertValidBuildInputs(rootDir)).rejects.toThrow("Tree artifacts span multiple semesters");
  });

  it("skips tree refresh when the semester root artifacts already exist", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-prepare-trees-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(join(normalizedDir, "lecture-tree-bilingual-2026s-root.json"), JSON.stringify({ path: "", children: [] }));
    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({ semester: "2026s", kind: "tlecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );
    await writeFile(join(normalizedDir, "organization-tree-bilingual-2026s-root.json"), JSON.stringify({ dir: "", children: [] }));
    await writeFile(
      join(normalizedDir, "organization-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({ semester: "2026s", kind: "lecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );

    await expect(shouldRefreshTrees(rootDir, "2026s")).resolves.toBe(false);
  });

  it("refreshes trees when a required semester root artifact is missing", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-prepare-trees-"));
    const normalizedDir = join(rootDir, "data", "normalized");
    await mkdir(normalizedDir, { recursive: true });

    await writeFile(join(normalizedDir, "lecture-tree-bilingual-2026s-root.json"), JSON.stringify({ path: "", children: [] }));
    await writeFile(
      join(normalizedDir, "lecture-tree-membership-bilingual-2026s-root.json"),
      JSON.stringify({ semester: "2026s", kind: "tlecture", generatedAt: "2026-03-08T00:00:00.000Z", nodes: [] })
    );
    await writeFile(join(normalizedDir, "organization-tree-bilingual-2026s-root.json"), JSON.stringify({ dir: "", children: [] }));

    await expect(shouldRefreshTrees(rootDir, "2026s")).resolves.toBe(true);
  });
});
