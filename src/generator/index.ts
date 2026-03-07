import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ParsedDirectoryNode } from "../parsers/directory.js";
import type { NormalizedCourse } from "../types.js";
import { compareSemesterCodes } from "../utils/semester.js";
import { deriveFacultyFromSourceUrl } from "../utils/faculty.js";
import { slugify } from "../utils/url.js";

export interface BuildManifest {
  generatedAt: string;
  courseCount: number;
  semesters: string[];
}

interface FacultySummaryItem {
  faculty: string;
  facultyCode?: string;
  totalCount: number;
  englishCount: number;
  germanCount: number;
  bilingualCount: number;
  unknownCount: number;
  highConfidenceCount: number;
}

interface FacultyBrowserNode {
  label: string;
  path: string;
  sourceUrl: string;
  treeUrl: string;
  children: FacultyBrowserNode[];
}

interface FacultyBrowserArtifact {
  semester?: string;
  faculties: Array<FacultySummaryItem & FacultyBrowserNode>;
}

export async function generateBuildArtifacts(
  rootDir: string,
  courses: NormalizedCourse[],
  directories: ParsedDirectoryNode[] = []
): Promise<BuildManifest> {
  const generatedAt = new Date().toISOString();
  const semesters = [...new Set(courses.map((course) => course.semester).filter(Boolean) as string[])].sort(compareSemesterCodes);
  const directorySemesters = [...new Set(directories.map((entry) => entry.semester).filter(Boolean) as string[])].sort(compareSemesterCodes);
  const manifest: BuildManifest = {
    generatedAt,
    courseCount: courses.length,
    semesters
  };

  const buildDir = join(rootDir, "data", "build");
  const publicDir = join(rootDir, "site", "public", "data");
  await mkdir(buildDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  const searchIndex = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    semester: course.semester,
    language: course.language,
    text: course.searchText
  }));
  const facultySummary = buildFacultySummary(courses);
  const latestSemester = semesters.at(-1) ?? directorySemesters.at(-1);
  const facultyBrowser = buildFacultyBrowser(facultySummary, directories, latestSemester);

  await writeFile(join(buildDir, "catalog.json"), JSON.stringify(courses, null, 2));
  await writeFile(join(buildDir, "faculty-summary.json"), JSON.stringify(facultySummary, null, 2));
  await writeFile(join(buildDir, "faculty-browser.json"), JSON.stringify(facultyBrowser, null, 2));
  await writeFile(join(buildDir, "search-index.json"), JSON.stringify(searchIndex, null, 2));
  await writeFile(join(buildDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(join(publicDir, "catalog.json"), JSON.stringify(courses, null, 2));
  await writeFile(join(publicDir, "faculty-summary.json"), JSON.stringify(facultySummary, null, 2));
  await writeFile(join(publicDir, "faculty-browser.json"), JSON.stringify(facultyBrowser, null, 2));
  await writeFile(join(publicDir, "search-index.json"), JSON.stringify(searchIndex, null, 2));
  await writeFile(join(publicDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  await generateMarkdownRoutes(rootDir, courses, manifest);

  return manifest;
}

function buildFacultySummary(courses: NormalizedCourse[]): FacultySummaryItem[] {
  const grouped = new Map<string, FacultySummaryItem>();

  for (const course of courses) {
    const faculty = course.faculty || "Other";
    const current =
      grouped.get(faculty) ??
      {
        faculty,
        facultyCode: deriveFacultyFromSourceUrl(course.sourceUrl)?.code,
        totalCount: 0,
        englishCount: 0,
        germanCount: 0,
        bilingualCount: 0,
        unknownCount: 0,
        highConfidenceCount: 0
      };
    current.totalCount += 1;
    if (course.language === "english") current.englishCount += 1;
    if (course.language === "german") current.germanCount += 1;
    if (course.language === "bilingual") current.bilingualCount += 1;
    if (course.language === "unknown") current.unknownCount += 1;
    if (course.languageConfidence === "high") current.highConfidenceCount += 1;
    grouped.set(faculty, current);
  }

  return [...grouped.values()].sort((a, b) => a.faculty.localeCompare(b.faculty));
}

function buildFacultyBrowser(
  facultySummary: FacultySummaryItem[],
  directories: ParsedDirectoryNode[],
  latestSemester?: string
): FacultyBrowserArtifact {
  const filteredDirectories = directories
    .filter((entry) => !latestSemester || entry.semester === latestSemester)
    .sort((a, b) => a.path.localeCompare(b.path));

  const nodeByPath = new Map(filteredDirectories.map((entry) => [entry.path, entry] as const));
  const rootNode = nodeByPath.get("");
  const rootChildrenByPath = new Map((rootNode?.children ?? []).map((child) => [child.path, child] as const));

  const faculties = facultySummary.map((summary) => {
    const facultyPath = summary.facultyCode ?? "";
    const node = nodeByPath.get(facultyPath);
    const rootChild = rootChildrenByPath.get(facultyPath);
    const sourceUrl = node?.sourceUrl ?? rootChild?.sourceUrl ?? "";
    return {
      ...summary,
      label: rootChild?.label ?? node?.label ?? summary.faculty,
      path: facultyPath,
      sourceUrl,
      treeUrl: sourceUrl ? toTreeUrl(sourceUrl) : "",
      children: node ? buildBrowserChildren(node, nodeByPath) : []
    };
  });

  return {
    semester: latestSemester,
    faculties: faculties.sort((a, b) => a.faculty.localeCompare(b.faculty))
  };
}

function buildBrowserChildren(
  node: ParsedDirectoryNode,
  nodeByPath: Map<string, ParsedDirectoryNode>
): FacultyBrowserNode[] {
  return node.children.map((child) => {
    const fullNode = nodeByPath.get(child.path);
    const sourceUrl = fullNode?.sourceUrl ?? child.sourceUrl;

    return {
      label: fullNode?.label ?? child.label,
      path: child.path,
      sourceUrl,
      treeUrl: toTreeUrl(sourceUrl),
      children: fullNode ? buildBrowserChildren(fullNode, nodeByPath) : []
    };
  });
}

function toTreeUrl(sourceUrl: string): string {
  if (!sourceUrl) {
    return "";
  }

  const url = new URL(sourceUrl);
  url.searchParams.set("dsc", "anew/tlecture:tree");
  if (!url.searchParams.get("ref")) {
    url.searchParams.set("ref", "tlecture");
  }
  return url.toString();
}

async function generateMarkdownRoutes(rootDir: string, courses: NormalizedCourse[], manifest: BuildManifest): Promise<void> {
  const coursesDir = join(rootDir, "site", "docs", "courses");
  const semestersDir = join(rootDir, "site", "docs", "semesters");
  await mkdir(coursesDir, { recursive: true });
  await mkdir(semestersDir, { recursive: true });
  await clearGeneratedMarkdown(coursesDir);
  await clearGeneratedMarkdown(semestersDir);

  for (const course of courses) {
    const content = `# ${course.title}

- Semester: ${course.semester ?? "Unknown"}
- Language: ${course.language}
- Confidence: ${course.languageConfidence}
- Source: [UnivIS](${course.sourceUrl})

${course.description ?? "No description available."}
`;

    await writeFile(join(coursesDir, `${course.slug}.md`), content);
  }

  for (const semester of manifest.semesters) {
    const semesterCourses = courses.filter((course) => course.semester === semester);
    const content = `# ${semester}

Generated ${manifest.generatedAt}

${semesterCourses.map((course) => `- [${course.title}](/courses/${course.slug})`).join("\n")}
`;

    await writeFile(join(semestersDir, `${slugify(semester)}.md`), content);
  }
}

async function clearGeneratedMarkdown(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".md") || entry.name === "index.md" || entry.name === "catalog.md") {
      continue;
    }
    await rm(join(dir, entry.name), { force: true });
  }
}
