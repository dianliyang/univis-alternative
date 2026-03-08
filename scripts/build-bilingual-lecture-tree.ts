import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDirectoryPage } from "../src/parsers/directory.js";
import { parseLectureExportXml } from "../src/parsers/lecture-xml.js";
import { extractNodeXmlExportUrl, parseXmlExportPage } from "../src/parsers/xml-export.js";
import { createTaskQueue } from "../src/utils/task-queue.js";
import { readResponseText } from "../src/utils/http-text.js";
import { retryAsync } from "../src/utils/retry.js";

const rootDir = process.cwd();
const semester = process.argv[2] ?? "2025w";
const startPathArg = process.argv[3];
const startPath = !startPathArg || startPathArg === "root" ? "" : startPathArg;
const maxDepthArg = process.argv[4];
const maxDepth = maxDepthArg ? Number.parseInt(maxDepthArg, 10) : Number.POSITIVE_INFINITY;
const concurrencyArg = process.argv[5] ?? process.env.UNIVIS_TREE_CONCURRENCY;
const concurrency = concurrencyArg ? Number.parseInt(concurrencyArg, 10) : 6;
const fetchCache = new Map<string, Promise<MonoLectureTreeNode>>();
const queue = createTaskQueue(concurrency);

interface MonoLectureTreeNode {
  path: string;
  label: string;
  sourceUrl: string;
  treeUrl: string;
  exportUrl?: string;
  exportForm?: Record<string, string>;
  lectures: MonoLectureMembershipLecture[];
  children: MonoLectureTreeNode[];
}

interface BilingualLectureTreeNode {
  path: string;
  label: {
    en?: string;
    de?: string;
  };
  sourceUrl: {
    en?: string;
    de?: string;
  };
  treeUrl: {
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
  lectures: BilingualLectureMembershipLecture[];
  children: BilingualLectureTreeNode[];
}

interface MonoLectureMembershipLecture {
  key: string;
  id: string;
  title: string;
  sourceUrl: string;
}

interface BilingualLectureMembershipLecture {
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

interface BilingualLectureMembershipNode {
  path: string;
  sourceUrl: {
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
  lectures: BilingualLectureMembershipLecture[];
}

interface LectureMembershipArtifact {
  semester: string;
  kind: "tlecture";
  generatedAt: string;
  nodes: BilingualLectureMembershipNode[];
}

async function main(): Promise<void> {
  const enTree = await buildTree(buildLectureUrl(semester, startPath, "en"));
  const deTree = await buildTree(buildLectureUrl(semester, startPath, "de"));
  const merged = mergeTrees(enTree, deTree);

  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const outputPath = join(rootDir, "data", "normalized", `lecture-tree-bilingual-${semester}-${slug(startPath || "root")}.json`);
  const membershipOutputPath = join(
    rootDir,
    "data",
    "normalized",
    `lecture-tree-membership-bilingual-${semester}-${slug(startPath || "root")}.json`
  );
  await writeFile(outputPath, JSON.stringify(stripTreeMembership(merged), null, 2));
  await writeFile(membershipOutputPath, JSON.stringify(buildMembershipArtifact(merged), null, 2));

  console.log(renderTree(merged));
  console.log(`\nSaved to ${outputPath}`);
  console.log(`Saved to ${membershipOutputPath}`);
}

async function buildTree(url: string, depth = 1): Promise<MonoLectureTreeNode> {
  const cached = fetchCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = buildTreeUncached(url, depth);
  fetchCache.set(url, promise);
  return promise;
}

async function buildTreeUncached(url: string, depth: number): Promise<MonoLectureTreeNode> {
  const { html, parsed } = await queue.run(async () => {
    const html = await fetchText(url);
    const result = parseDirectoryPage(url, html);
    if (!result) {
      throw new Error(`Failed to parse lecture directory page ${url}`);
    }
    return { html, parsed: result };
  });
  const exportMembership = await fetchLectureMembership(url, html);

  const node: MonoLectureTreeNode = {
    path: parsed.path,
    label: parsed.label,
    sourceUrl: parsed.sourceUrl,
    treeUrl: toTreeUrl(parsed.sourceUrl),
    exportUrl: exportMembership.exportUrl,
    exportForm: exportMembership.exportForm,
    lectures: exportMembership.lectures,
    children: []
  };

  if (Number.isFinite(maxDepth) && depth >= maxDepth) {
    return node;
  }

  node.children = await Promise.all(parsed.children.map((child) => buildTree(child.sourceUrl, depth + 1)));

  return node;
}

function mergeTrees(enNode: MonoLectureTreeNode | undefined, deNode: MonoLectureTreeNode | undefined): BilingualLectureTreeNode {
  const childPairs = new Map<string, { en?: MonoLectureTreeNode; de?: MonoLectureTreeNode }>();

  for (const child of enNode?.children ?? []) {
    childPairs.set(child.path, { ...(childPairs.get(child.path) ?? {}), en: child });
  }
  for (const child of deNode?.children ?? []) {
    childPairs.set(child.path, { ...(childPairs.get(child.path) ?? {}), de: child });
  }

  return {
    path: enNode?.path ?? deNode?.path ?? "",
    label: {
      en: enNode?.label,
      de: deNode?.label
    },
    sourceUrl: {
      en: enNode?.sourceUrl,
      de: deNode?.sourceUrl
    },
    treeUrl: {
      en: enNode?.treeUrl,
      de: deNode?.treeUrl
    },
    exportUrl:
      enNode?.exportUrl || deNode?.exportUrl
        ? {
            en: enNode?.exportUrl,
            de: deNode?.exportUrl
          }
        : undefined,
    exportForm:
      enNode?.exportForm || deNode?.exportForm
        ? {
            en: enNode?.exportForm,
            de: deNode?.exportForm
          }
        : undefined,
    lectures: mergeLectureRefs(enNode?.lectures ?? [], deNode?.lectures ?? []),
    children: [...childPairs.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, pair]) => mergeTrees(pair.en, pair.de))
  };
}

function stripTreeMembership(node: BilingualLectureTreeNode): BilingualLectureTreeNode {
  return {
    path: node.path,
    label: node.label,
    sourceUrl: node.sourceUrl,
    treeUrl: node.treeUrl,
    lectures: [],
    children: node.children.map(stripTreeMembership)
  };
}

function buildMembershipArtifact(root: BilingualLectureTreeNode): LectureMembershipArtifact {
  return {
    semester,
    kind: "tlecture",
    generatedAt: new Date().toISOString(),
    nodes: flattenMembership(root)
  };
}

function mergeLectureRefs(
  enLectures: MonoLectureMembershipLecture[],
  deLectures: MonoLectureMembershipLecture[]
): BilingualLectureMembershipLecture[] {
  const lecturePairs = new Map<string, { en?: MonoLectureMembershipLecture; de?: MonoLectureMembershipLecture }>();

  for (const lecture of enLectures) {
    lecturePairs.set(lecture.key, { ...(lecturePairs.get(lecture.key) ?? {}), en: lecture });
  }
  for (const lecture of deLectures) {
    lecturePairs.set(lecture.key, { ...(lecturePairs.get(lecture.key) ?? {}), de: lecture });
  }

  return [...lecturePairs.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, pair]) => ({
      key: pair.en?.key ?? pair.de?.key ?? "",
      id: pair.en?.id ?? pair.de?.id ?? "",
      title: {
        en: pair.en?.title,
        de: pair.de?.title
      },
      sourceUrl: {
        en: pair.en?.sourceUrl,
        de: pair.de?.sourceUrl
      }
    }));
}

function flattenMembership(node: BilingualLectureTreeNode): BilingualLectureMembershipNode[] {
  const current: BilingualLectureMembershipNode = {
    path: node.path,
    sourceUrl: node.sourceUrl,
    exportUrl: node.exportUrl,
    exportForm: node.exportForm,
    lectures: node.lectures
  };

  return [current, ...node.children.flatMap(flattenMembership)];
}

function buildLectureUrl(semesterCode: string, path: string, lang: "en" | "de"): string {
  const url = new URL("https://univis.uni-kiel.de/form");
  url.searchParams.set("__s", "2");
  url.searchParams.set("dsc", "anew/tlecture");
  if (path) {
    url.searchParams.set("tdir", path);
  }
  url.searchParams.set("anonymous", "1");
  url.searchParams.set("lang", lang);
  url.searchParams.set("ref", "tlecture");
  url.searchParams.set("sem", semesterCode);
  url.searchParams.set("__e", "519");
  return url.toString();
}

function toTreeUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  url.searchParams.set("dsc", "anew/tlecture:tree");
  if (!url.searchParams.get("ref")) {
    url.searchParams.set("ref", "tlecture");
  }
  return url.toString();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithRetry(url, {
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }
  return readResponseText(response);
}

async function postForm(url: string, body: URLSearchParams): Promise<string> {
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body,
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }
  return readResponseText(response);
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  return retryAsync(
    async () => {
      const response = await fetch(input, init);
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Transient request failure ${response.status} for ${input}`);
      }
      return response;
    },
    {
      maxAttempts: 3,
      shouldRetry: isTransientFetchError
    }
  );
}

function isTransientFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("transient request failure") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("fetch failed") ||
    message.includes("socket hang up")
  );
}

async function fetchLectureMembership(
  sourceUrl: string,
  html: string
): Promise<{
  exportUrl?: string;
  exportForm?: Record<string, string>;
  lectures: MonoLectureMembershipLecture[];
}> {
  const exportUrl = extractNodeXmlExportUrl(sourceUrl, html);
  if (!exportUrl) {
    return { lectures: [] };
  }

  const exportPageHtml = await queue.run(() => fetchText(exportUrl));
  const { actionUrl, formData } = parseXmlExportPage(exportUrl, exportPageHtml);
  const xml = await queue.run(() => postForm(actionUrl, new URLSearchParams(formData)));
  const detailLang = new URL(sourceUrl).searchParams.get("lang") === "de" ? "de" : "en";
  const lectures = parseLectureExportXml(xml, { detailLang }).map((lecture) => ({
    key: lecture.key,
    id: lecture.id,
    title: lecture.title,
    sourceUrl: lecture.sourceUrl
  }));

  return {
    exportUrl,
    exportForm: formData,
    lectures
  };
}

function renderTree(node: BilingualLectureTreeNode, indent = ""): string {
  const label = `${node.label.en ?? "?"} / ${node.label.de ?? "?"}`;
  const lines = [`${indent}- ${label} [${node.path || "root"}]`];
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
