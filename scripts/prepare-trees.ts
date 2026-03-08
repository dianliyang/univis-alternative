import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compareSemesterCodes, getRecentSemesterCodes } from "../src/utils/semester.js";

const rootDir = process.cwd();
const REQUIRED_ROOT_ARTIFACT_PREFIXES = [
  "lecture-tree-bilingual",
  "lecture-tree-membership-bilingual",
  "organization-tree-bilingual",
  "organization-tree-membership-bilingual"
] as const;

interface RootLectureTree {
  children?: Array<{ path: string }>;
}

interface RootOrganizationTree {
  children?: Array<{ dir: string }>;
}

export async function resolveLatestBuildSemester(projectRoot: string): Promise<string> {
  if (process.env.UNIVIS_SEMESTER) {
    return process.env.UNIVIS_SEMESTER;
  }

  const seedUrls = JSON.parse(
    await readFile(`${projectRoot}/data/discovery/seed-urls.json`, "utf8").catch(() => "[]")
  ) as string[];
  const semesters = [...new Set(seedUrls.map(extractSemesterCode).filter((value): value is string => Boolean(value)))].sort(compareSemesterCodes);

  return semesters.at(-1) ?? getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"))[0]!;
}

export function extractSemesterCode(urlText: string): string | null {
  try {
    return new URL(urlText).searchParams.get("sem");
  } catch {
    return null;
  }
}

export async function shouldRefreshTrees(projectRoot: string, semester: string): Promise<boolean> {
  if (process.env.UNIVIS_FORCE_TREE_REFRESH === "1") {
    return true;
  }

  for (const prefix of REQUIRED_ROOT_ARTIFACT_PREFIXES) {
    const artifactPath = `${projectRoot}/data/normalized/${prefix}-${semester}-root.json`;
    try {
      await access(artifactPath);
    } catch {
      return true;
    }
  }

  return false;
}

export async function findMissingTreeBranches(
  projectRoot: string,
  semester: string
): Promise<{ lecture: string[]; organization: string[] }> {
  const normalizedDir = `${projectRoot}/data/normalized`;
  const lectureRoot = JSON.parse(
    await readFile(`${normalizedDir}/lecture-tree-bilingual-${semester}-root.json`, "utf8")
  ) as RootLectureTree;
  const organizationRoot = JSON.parse(
    await readFile(`${normalizedDir}/organization-tree-bilingual-${semester}-root.json`, "utf8")
  ) as RootOrganizationTree;

  const lecture = await collectMissingBranches(
    normalizedDir,
    semester,
    lectureRoot.children?.map((child) => child.path).filter(Boolean) ?? [],
    "lecture-tree-bilingual",
    "lecture-tree-membership-bilingual"
  );
  const organization = await collectMissingBranches(
    normalizedDir,
    semester,
    organizationRoot.children?.map((child) => child.dir).filter(Boolean) ?? [],
    "organization-tree-bilingual",
    "organization-tree-membership-bilingual"
  );

  return { lecture, organization };
}

async function main(): Promise<void> {
  const semester = await resolveLatestBuildSemester(rootDir);
  if (await shouldRefreshTrees(rootDir, semester)) {
    execFileSync("npx", ["tsx", "scripts/build-bilingual-lecture-tree.ts", semester], {
      stdio: "inherit"
    });
    execFileSync("npx", ["tsx", "scripts/build-bilingual-organization-tree.ts", semester], {
      stdio: "inherit"
    });
    return;
  }

  const missingBranches = await findMissingTreeBranches(rootDir, semester);
  if (missingBranches.lecture.length === 0 && missingBranches.organization.length === 0) {
    console.log(`Using existing tree artifacts for ${semester}.`);
    return;
  }

  for (const path of missingBranches.lecture) {
    execFileSync("npx", ["tsx", "scripts/build-bilingual-lecture-tree.ts", semester, path], {
      stdio: "inherit"
    });
  }

  for (const dir of missingBranches.organization) {
    execFileSync("npx", ["tsx", "scripts/build-bilingual-organization-tree.ts", semester, dir], {
      stdio: "inherit"
    });
  }
}

async function collectMissingBranches(
  normalizedDir: string,
  semester: string,
  branches: string[],
  treePrefix: string,
  membershipPrefix: string
): Promise<string[]> {
  const missing: string[] = [];

  for (const branch of branches) {
    const slug = branchSlug(branch);
    const treePath = `${normalizedDir}/${treePrefix}-${semester}-${slug}.json`;
    const membershipPath = `${normalizedDir}/${membershipPrefix}-${semester}-${slug}.json`;
    const exists = await Promise.all([artifactExists(treePath), artifactExists(membershipPath)]);
    if (!exists.every(Boolean)) {
      missing.push(branch);
    }
  }

  return missing;
}

async function artifactExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function branchSlug(value: string): string {
  return value.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
