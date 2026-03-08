import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseLectureExportXml } from "../src/parsers/lecture-xml.js";
import { parseOrganizationPage } from "../src/parsers/organization.js";
import { extractNodeXmlExportUrl, parseXmlExportPage } from "../src/parsers/xml-export.js";
import { createTaskQueue } from "../src/utils/task-queue.js";
import { readResponseText } from "../src/utils/http-text.js";
import { retryAsync } from "../src/utils/retry.js";
import { shouldFetchTerminalMembership } from "../src/utils/tree-refresh.js";

const rootDir = process.cwd();
const semester = process.argv[2] ?? "2025w";
const startDirArg = process.argv[3];
const startDir = !startDirArg || startDirArg === "root" ? "" : startDirArg;
const maxDepthArg = process.argv[4];
const maxDepth = maxDepthArg ? Number.parseInt(maxDepthArg, 10) : Number.POSITIVE_INFINITY;
const concurrencyArg = process.argv[5] ?? process.env.UNIVIS_TREE_CONCURRENCY;
const concurrency = concurrencyArg ? Number.parseInt(concurrencyArg, 10) : 6;
const fetchCache = new Map<string, Promise<MonoTreeNode>>();
const queue = createTaskQueue(concurrency);

interface MonoTreeNode {
  dir: string;
  label: string;
  sourceUrl: string;
  lectureListUrl?: string;
  lectureCount?: number;
  exportUrl?: string;
  exportForm?: Record<string, string>;
  lectures: MonoLectureMembershipLecture[];
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
  exportUrl?: {
    en?: string;
    de?: string;
  };
  exportForm?: {
    en?: Record<string, string>;
    de?: Record<string, string>;
  };
  lectures: BilingualLectureMembershipLecture[];
  children: BilingualTreeNode[];
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

interface BilingualOrganizationMembershipNode {
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

interface OrganizationMembershipArtifact {
  semester: string;
  kind: "lecture";
  generatedAt: string;
  nodes: BilingualOrganizationMembershipNode[];
}

async function main(): Promise<void> {
  const enTree = await buildTree(buildOrganizationUrl(semester, startDir, "en"), 1);
  const deTree = await buildTree(buildOrganizationUrl(semester, startDir, "de"), 1);
  const merged = mergeTrees(enTree, deTree);

  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const outputPath = join(rootDir, "data", "normalized", `organization-tree-bilingual-${semester}-${slug(startDir || "root")}.json`);
  const membershipOutputPath = join(
    rootDir,
    "data",
    "normalized",
    `organization-tree-membership-bilingual-${semester}-${slug(startDir || "root")}.json`
  );
  await writeFile(outputPath, JSON.stringify(stripTreeMembership(merged), null, 2));
  await writeFile(membershipOutputPath, JSON.stringify(buildMembershipArtifact(merged), null, 2));

  console.log(renderTree(merged));
  console.log(`\nSaved to ${outputPath}`);
  console.log(`Saved to ${membershipOutputPath}`);
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
  const { html, parsed } = await queue.run(async () => {
    const html = await fetchText(url);
    return { html, parsed: parseOrganizationPage(url, html) };
  });
  const fetchMembership = shouldFetchTerminalMembership(parsed.children.length, depth, maxDepth);
  const exportMembership = fetchMembership ? await fetchLectureMembership(url, html) : { lectures: [] };
  const node: MonoTreeNode = {
    dir: parsed.dir,
    label: parsed.label,
    sourceUrl: parsed.sourceUrl,
    lectureListUrl: parsed.lectureListUrl,
    lectureCount: parsed.lectureCount,
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

function stripTreeMembership(node: BilingualTreeNode): BilingualTreeNode {
  return {
    dir: node.dir,
    label: node.label,
    sourceUrl: node.sourceUrl,
    lectureListUrl: node.lectureListUrl,
    lectureCount: node.lectureCount,
    lectures: [],
    children: node.children.map(stripTreeMembership)
  };
}

function buildMembershipArtifact(root: BilingualTreeNode): OrganizationMembershipArtifact {
  return {
    semester,
    kind: "lecture",
    generatedAt: new Date().toISOString(),
    nodes: flattenMembership(root)
  };
}

function flattenMembership(node: BilingualTreeNode): BilingualOrganizationMembershipNode[] {
  const current: BilingualOrganizationMembershipNode = {
    path: node.dir,
    sourceUrl: node.sourceUrl,
    exportUrl: node.exportUrl,
    exportForm: node.exportForm,
    lectures: node.lectures
  };

  return [current, ...node.children.flatMap(flattenMembership)];
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
