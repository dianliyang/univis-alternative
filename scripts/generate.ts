import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateBuildArtifacts } from "../src/generator/index.js";
import type { ParsedDirectoryNode } from "../src/parsers/directory.js";
import type { NormalizedCourse } from "../src/types.js";
import { compareSemesterCodes } from "../src/utils/semester.js";

const rootDir = process.cwd();

interface OrganizationTreeNode {
  dir: string;
  label?: {
    en?: string;
    de?: string;
  };
  children?: OrganizationTreeNode[];
}

interface LectureTreeNode {
  path: string;
  label?: {
    en?: string;
    de?: string;
  };
  sourceUrl?: {
    en?: string;
    de?: string;
  };
  treeUrl?: {
    en?: string;
    de?: string;
  };
  children?: LectureTreeNode[];
}

interface BilingualMembershipLecture {
  key: string;
  id: string;
  title: {
    en?: string;
    de?: string;
  };
  sourceUrl: {
    en?: string;
    de?: string;
  };
}

interface TreeMembershipNode {
  path: string;
  sourceUrl?: {
    en?: string;
    de?: string;
  };
  exportUrl?: {
    en?: string;
    de?: string;
  };
  exportForm?: {
    en?: Record<string, string>;
    de?: Record<string, string>;
  };
  lectures: BilingualMembershipLecture[];
}

interface TreeMembershipArtifact {
  semester: string;
  kind: "tlecture" | "lecture";
  generatedAt: string;
  nodes: TreeMembershipNode[];
}

interface RootArtifactInfo {
  name: string;
  semester: string;
}

async function main(): Promise<void> {
  await assertValidBuildInputs(rootDir);
  const courses = JSON.parse(await readFile(join(rootDir, "data", "normalized", "courses.json"), "utf8")) as NormalizedCourse[];
  const directories = JSON.parse(
    await readFile(join(rootDir, "data", "normalized", "parsed-directories.json"), "utf8").catch(() => "[]")
  ) as ParsedDirectoryNode[];
  const organizationTree = await loadLatestOrganizationTree(rootDir);
  const lectureTree = await loadLatestLectureTree(rootDir);
  const organizationMembership = await loadLatestOrganizationTreeMembership(rootDir);
  const lectureMembership = await loadLatestLectureTreeMembership(rootDir);
  const manifest = await generateBuildArtifacts(
    rootDir,
    courses,
    directories,
    organizationTree,
    lectureTree,
    organizationMembership,
    lectureMembership
  );
  console.log(`Generated ${manifest.courseCount} course records.`);
}

export async function assertValidBuildInputs(projectRoot: string): Promise<string> {
  const lectureTree = await getLatestRootArtifact(projectRoot, "lecture-tree-bilingual");
  const lectureMembership = await getLatestRootArtifact(projectRoot, "lecture-tree-membership-bilingual");
  const organizationTree = await getLatestRootArtifact(projectRoot, "organization-tree-bilingual");
  const organizationMembership = await getLatestRootArtifact(projectRoot, "organization-tree-membership-bilingual");

  if (!lectureTree) {
    throw new Error("Missing required lecture tree root artifact in data/normalized.");
  }
  if (!lectureMembership) {
    throw new Error("Missing required lecture tree membership root artifact in data/normalized.");
  }
  if (!organizationTree) {
    throw new Error("Missing required organization tree root artifact in data/normalized.");
  }
  if (!organizationMembership) {
    throw new Error("Missing required organization tree membership root artifact in data/normalized.");
  }

  const semesters = [lectureTree.semester, lectureMembership.semester, organizationTree.semester, organizationMembership.semester];
  if (new Set(semesters).size !== 1) {
    throw new Error(
      `Tree artifacts span multiple semesters: lecture-tree=${lectureTree.semester}, lecture-membership=${lectureMembership.semester}, organization-tree=${organizationTree.semester}, organization-membership=${organizationMembership.semester}.`
    );
  }

  return lectureTree.semester;
}

export async function loadLatestOrganizationTree(projectRoot: string): Promise<OrganizationTreeNode | undefined> {
  const normalizedDir = join(projectRoot, "data", "normalized");
  const entries = await readdir(normalizedDir).catch(() => []);
  const candidates = entries
    .filter((name) => /^organization-tree-bilingual-.*-root\.json$/.test(name))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) {
    return undefined;
  }

  const rootTree = JSON.parse(await readFile(join(normalizedDir, latest), "utf8")) as OrganizationTreeNode;
  const semester = latest.match(/^organization-tree-bilingual-(.*)-root\.json$/)?.[1];
  if (!semester) {
    return rootTree;
  }

  const facultyTrees = await Promise.all(
    entries
      .filter((name) => name.startsWith(`organization-tree-bilingual-${semester}-`) && !name.endsWith("-root.json"))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(normalizedDir, name), "utf8")) as OrganizationTreeNode)
  );

  return mergeOrganizationTrees(rootTree, facultyTrees);
}

export async function loadLatestLectureTree(projectRoot: string): Promise<LectureTreeNode | undefined> {
  const normalizedDir = join(projectRoot, "data", "normalized");
  const entries = await readdir(normalizedDir).catch(() => []);
  const candidates = entries
    .filter((name) => /^lecture-tree-bilingual-.*-root\.json$/.test(name))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) {
    return undefined;
  }

  const rootTree = JSON.parse(await readFile(join(normalizedDir, latest), "utf8")) as LectureTreeNode;
  const semester = latest.match(/^lecture-tree-bilingual-(.*)-root\.json$/)?.[1];
  if (!semester) {
    return rootTree;
  }

  const branchTrees = await Promise.all(
    entries
      .filter((name) => name.startsWith(`lecture-tree-bilingual-${semester}-`) && !name.endsWith("-root.json"))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(normalizedDir, name), "utf8")) as LectureTreeNode)
  );

  return mergeLectureTrees(rootTree, branchTrees);
}

export async function loadLatestLectureTreeMembership(projectRoot: string): Promise<TreeMembershipArtifact | undefined> {
  return loadLatestMembershipArtifact(projectRoot, "lecture-tree-membership-bilingual", "tlecture");
}

export async function loadLatestOrganizationTreeMembership(projectRoot: string): Promise<TreeMembershipArtifact | undefined> {
  return loadLatestMembershipArtifact(projectRoot, "organization-tree-membership-bilingual", "lecture");
}

function mergeLectureTrees(rootTree: LectureTreeNode, overlays: LectureTreeNode[]): LectureTreeNode {
  const overlayByPath = new Map(overlays.map((node) => [node.path, node] as const));
  const baseChildren =
    rootTree.children && rootTree.children.length > 0
      ? rootTree.children
      : overlays
          .filter((node) => Boolean(node.path))
          .sort((a, b) => a.path.localeCompare(b.path));

  return {
    ...rootTree,
    children: mergeLectureChildren(baseChildren, overlayByPath)
  };
}

async function loadLatestMembershipArtifact(
  projectRoot: string,
  prefix: "lecture-tree-membership-bilingual" | "organization-tree-membership-bilingual",
  expectedKind: "tlecture" | "lecture"
): Promise<TreeMembershipArtifact | undefined> {
  const normalizedDir = join(projectRoot, "data", "normalized");
  const entries = await readdir(normalizedDir).catch(() => []);
  const candidates = entries
    .filter((name) => new RegExp(`^${prefix}-.*-root\\.json$`).test(name))
    .sort();
  const latest = candidates.at(-1);
  if (!latest) {
    return undefined;
  }

  const rootArtifact = JSON.parse(await readFile(join(normalizedDir, latest), "utf8")) as TreeMembershipArtifact;
  const semester = latest.match(new RegExp(`^${prefix}-(.*)-root\\.json$`))?.[1];
  if (!semester) {
    return rootArtifact;
  }

  const overlays = await Promise.all(
    entries
      .filter((name) => name.startsWith(`${prefix}-${semester}-`) && !name.endsWith("-root.json"))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(normalizedDir, name), "utf8")) as TreeMembershipArtifact)
  );

  return {
    semester: rootArtifact.semester,
    kind: expectedKind,
    generatedAt: rootArtifact.generatedAt,
    nodes: mergeMembershipNodes(rootArtifact.nodes, overlays.flatMap((artifact) => artifact.nodes))
  };
}

function mergeMembershipNodes(rootNodes: TreeMembershipNode[], overlayNodes: TreeMembershipNode[]): TreeMembershipNode[] {
  const nodesByPath = new Map(rootNodes.map((node) => [node.path, node] as const));

  for (const overlay of overlayNodes) {
    const current = nodesByPath.get(overlay.path);
    if (!current || current.lectures.length === 0) {
      nodesByPath.set(overlay.path, overlay);
    }
  }

  return [...nodesByPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function getLatestRootArtifact(
  projectRoot: string,
  prefix: "lecture-tree-bilingual" | "lecture-tree-membership-bilingual" | "organization-tree-bilingual" | "organization-tree-membership-bilingual"
): Promise<RootArtifactInfo | undefined> {
  const normalizedDir = join(projectRoot, "data", "normalized");
  const entries = await readdir(normalizedDir).catch(() => []);
  const matches = entries
    .map((name) => {
      const match = name.match(new RegExp(`^${prefix}-(.*)-root\\.json$`));
      return match ? { name, semester: match[1]! } : null;
    })
    .filter((entry): entry is RootArtifactInfo => Boolean(entry))
    .sort((left, right) => compareSemesterCodes(left.semester, right.semester));

  return matches.at(-1);
}

function mergeLectureChildren(children: LectureTreeNode[], overlayByPath: Map<string, LectureTreeNode>): LectureTreeNode[] {
  return children.map((child) => {
    const overlay = overlayByPath.get(child.path);
    const merged = overlay
      ? {
          ...child,
          ...overlay,
          label: overlay.label ?? child.label,
          sourceUrl: overlay.sourceUrl ?? child.sourceUrl,
          treeUrl: overlay.treeUrl ?? child.treeUrl
        }
      : child;

    return {
      ...merged,
      children: mergeLectureChildren(merged.children ?? [], overlayByPath)
    };
  });
}

function mergeOrganizationTrees(rootTree: OrganizationTreeNode, overlays: OrganizationTreeNode[]): OrganizationTreeNode {
  const overlayByDir = new Map(overlays.map((node) => [node.dir, node] as const));

  return {
    ...rootTree,
    children: mergeChildren(rootTree.children ?? [], overlayByDir)
  };
}

function mergeChildren(
  children: OrganizationTreeNode[],
  overlayByDir: Map<string, OrganizationTreeNode>
): OrganizationTreeNode[] {
  return children.map((child) => {
    const overlay = overlayByDir.get(child.dir);
    const merged = overlay
      ? {
          ...child,
          ...overlay,
          label: overlay.label ?? child.label
        }
      : child;

    return {
      ...merged,
      children: mergeChildren(merged.children ?? [], overlayByDir)
    };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
