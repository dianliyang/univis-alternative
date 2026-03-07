import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOrganizationPage } from "../src/parsers/organization.js";
import { readResponseText } from "../src/utils/http-text.js";

const rootDir = process.cwd();
const semester = process.argv[2] ?? "2025w";
const startDirArg = process.argv[3];
const startDir = !startDirArg || startDirArg === "root" ? "" : startDirArg;
const maxDepth = Number.parseInt(process.argv[4] ?? "3", 10);
const fetchCache = new Map<string, Promise<MonoTreeNode>>();

interface MonoTreeNode {
  dir: string;
  label: string;
  sourceUrl: string;
  lectureListUrl?: string;
  lectureCount?: number;
  children: MonoTreeNode[];
}

interface BilingualTreeNode {
  dir: string;
  label: {
    en?: string;
    de?: string;
  };
  sourceUrl: {
    en?: string;
    de?: string;
  };
  lectureListUrl?: {
    en?: string;
    de?: string;
  };
  lectureCount?: number;
  children: BilingualTreeNode[];
}

async function main(): Promise<void> {
  const enTree = await buildTree(buildOrganizationUrl(semester, startDir, "en"), 1);
  const deTree = await buildTree(buildOrganizationUrl(semester, startDir, "de"), 1);
  const merged = mergeTrees(enTree, deTree);

  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const outputPath = join(rootDir, "data", "normalized", `organization-tree-bilingual-${semester}-${slug(startDir || "root")}.json`);
  await writeFile(outputPath, JSON.stringify(merged, null, 2));

  console.log(renderTree(merged));
  console.log(`\nSaved to ${outputPath}`);
}

async function buildTree(url: string, depth: number): Promise<MonoTreeNode> {
  const cacheKey = url;
  const cached = fetchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = buildTreeUncached(url, depth);
  fetchCache.set(cacheKey, promise);
  return promise;
}

async function buildTreeUncached(url: string, depth: number): Promise<MonoTreeNode> {
  const html = await fetchText(url);
  const parsed = parseOrganizationPage(url, html);
  const node: MonoTreeNode = {
    dir: parsed.dir,
    label: parsed.label,
    sourceUrl: parsed.sourceUrl,
    lectureListUrl: parsed.lectureListUrl,
    lectureCount: parsed.lectureCount,
    children: []
  };

  if (depth >= maxDepth) {
    return node;
  }

  for (const child of parsed.children) {
    node.children.push(await buildTree(child.sourceUrl, depth + 1));
  }

  return node;
}

function mergeTrees(enNode: MonoTreeNode | undefined, deNode: MonoTreeNode | undefined): BilingualTreeNode {
  const childPairs = new Map<string, { en?: MonoTreeNode; de?: MonoTreeNode }>();
  for (const child of enNode?.children ?? []) {
    childPairs.set(child.dir, { ...(childPairs.get(child.dir) ?? {}), en: child });
  }
  for (const child of deNode?.children ?? []) {
    childPairs.set(child.dir, { ...(childPairs.get(child.dir) ?? {}), de: child });
  }

  return {
    dir: enNode?.dir ?? deNode?.dir ?? "",
    label: {
      en: enNode?.label,
      de: deNode?.label
    },
    sourceUrl: {
      en: enNode?.sourceUrl,
      de: deNode?.sourceUrl
    },
    lectureListUrl:
      enNode?.lectureListUrl || deNode?.lectureListUrl
        ? {
            en: enNode?.lectureListUrl,
            de: deNode?.lectureListUrl
          }
        : undefined,
    lectureCount: enNode?.lectureCount ?? deNode?.lectureCount,
    children: [...childPairs.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, pair]) => mergeTrees(pair.en, pair.de))
  };
}

function buildOrganizationUrl(semesterCode: string, dir: string, lang: "en" | "de"): string {
  const url = new URL("https://univis.uni-kiel.de/form");
  url.searchParams.set("__s", "2");
  url.searchParams.set("dsc", dir ? "anew/lecture" : "anew/lecture:");
  url.searchParams.set("dir", dir);
  url.searchParams.set("anonymous", "1");
  url.searchParams.set("lang", lang);
  url.searchParams.set("ref", "lecture");
  url.searchParams.set("sem", semesterCode);
  url.searchParams.set("__e", "519");
  return url.toString();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }
  return readResponseText(response);
}

function renderTree(node: BilingualTreeNode, indent = ""): string {
  const label = `${node.label.en ?? "?"} / ${node.label.de ?? "?"}`;
  const lectureSuffix = node.lectureCount ? ` (${node.lectureCount} lectures)` : "";
  const lines = [`${indent}- ${label} [${node.dir || "root"}]${lectureSuffix}`];
  for (const child of node.children) {
    lines.push(renderTree(child, `${indent}  `));
  }
  return lines.join("\n");
}

function slug(value: string): string {
  return value.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
