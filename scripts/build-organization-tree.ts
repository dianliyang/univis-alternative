import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOrganizationPage, type ParsedOrganizationNode } from "../src/parsers/organization.js";
import { readResponseText } from "../src/utils/http-text.js";

const rootDir = process.cwd();
const semester = process.argv[2] ?? "2025w";
const startDir = process.argv[3] ?? "techn";
const maxDepth = Number.parseInt(process.argv[4] ?? "3", 10);

interface OrganizationTreeNode {
  label: string;
  dir: string;
  sourceUrl: string;
  lectureListUrl?: string;
  lectureCount?: number;
  children: OrganizationTreeNode[];
}

async function main(): Promise<void> {
  const rootUrl = buildOrganizationUrl(semester, startDir);
  const tree = await buildTree(rootUrl, 1);

  await mkdir(join(rootDir, "data", "normalized"), { recursive: true });
  const outputPath = join(rootDir, "data", "normalized", `organization-tree-${semester}-${slug(startDir || "root")}.json`);
  await writeFile(outputPath, JSON.stringify(tree, null, 2));

  console.log(renderTree(tree));
  console.log(`\nSaved to ${outputPath}`);
}

async function buildTree(url: string, depth: number): Promise<OrganizationTreeNode> {
  const html = await fetchText(url);
  const parsed = parseOrganizationPage(url, html);

  const node: OrganizationTreeNode = {
    label: parsed.label,
    dir: parsed.dir,
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

function buildOrganizationUrl(semesterCode: string, dir: string): string {
  const url = new URL("https://univis.uni-kiel.de/form");
  url.searchParams.set("__s", "2");
  url.searchParams.set("dsc", dir ? "anew/lecture" : "anew/lecture:");
  url.searchParams.set("dir", dir);
  url.searchParams.set("anonymous", "1");
  url.searchParams.set("lang", "en");
  url.searchParams.set("ref", "lecture");
  url.searchParams.set("sem", semesterCode);
  url.searchParams.set("__e", "519");
  return url.toString();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} for ${url}`);
  }
  return readResponseText(response);
}

function renderTree(node: OrganizationTreeNode, indent = ""): string {
  const lectureSuffix = node.lectureCount ? ` (${node.lectureCount} lectures)` : "";
  const lines = [`${indent}- ${node.label} [${node.dir || "root"}]${lectureSuffix}`];
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
