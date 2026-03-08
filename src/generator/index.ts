import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ParsedDirectoryNode } from "../parsers/directory.js";
import type { NormalizedCourse } from "../types.js";
import { compareSemesterCodes } from "../utils/semester.js";
import { deriveFacultyFromSourceUrl } from "../utils/faculty.js";
import { boundedSlug, slugify } from "../utils/url.js";

export interface BuildManifest {
  generatedAt: string;
  courseCount: number;
  semesters: string[];
}

interface BrowserNodeMembershipLookup {
  lecture: Record<string, string[]>;
  tlecture: Record<string, string[]>;
}

interface InstitutionSummaryItem {
  institution: string;
  institutionCode?: string;
  totalCount: number;
  englishCount: number;
  germanCount: number;
  bilingualCount: number;
  unknownCount: number;
  highConfidenceCount: number;
}

interface LecturesBrowserNode {
  text: string;
  textDe?: string;
  path: string;
  route: string;
  sourceUrl: string;
  sourceUrlDe?: string;
  treeUrl: string;
  treeUrlDe?: string;
  lectures: BrowserLectureRef[];
  children: LecturesBrowserNode[];
}

interface LecturesBrowserArtifact {
  semester?: string;
  roots: LecturesBrowserNode[];
}

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

interface MembershipLectureRef {
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
  lectures: MembershipLectureRef[];
}

interface TreeMembershipArtifact {
  semester: string;
  kind: "tlecture" | "lecture";
  generatedAt: string;
  nodes: TreeMembershipNode[];
}

interface BrowserLectureRef {
  key: string;
  id: string;
  text: string;
  textDe?: string;
  route?: string;
  detailRoute?: string;
  sourceUrl: string;
  sourceUrlDe?: string;
}

interface InstitutionNode {
  text: string;
  textDe?: string;
  path: string;
  route: string;
  lectures: BrowserLectureRef[];
  children: InstitutionNode[];
}

interface LanguageMembershipMaps {
  all: Map<string, MembershipLectureRef[]>;
  englishOnly: Map<string, MembershipLectureRef[]>;
}

export async function generateBuildArtifacts(
  rootDir: string,
  courses: NormalizedCourse[],
  directories: ParsedDirectoryNode[] = [],
  organizationTree?: OrganizationTreeNode,
  lectureTree?: LectureTreeNode,
  organizationMembership?: TreeMembershipArtifact,
  lectureMembership?: TreeMembershipArtifact
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
  const institutionSummary = buildInstitutionSummary(courses);
  const latestSemester = semesters.at(-1) ?? directorySemesters.at(-1);
  const courseRouteById = new Map(courses.map((course) => [course.id, `/courses/${course.slug}`] as const));
  const courseById = new Map(courses.map((course) => [course.id, course] as const));
  const lectureMembershipMaps = buildLanguageMembershipMaps(lectureMembership, courseById);
  const organizationMembershipMaps = buildLanguageMembershipMaps(organizationMembership, courseById);
  const lecturesBrowser = buildLecturesBrowser(
    directories,
    latestSemester,
    lectureTree,
    lectureMembershipMaps.englishOnly,
    courseRouteById
  );
  const institutions = buildInstitutions(organizationTree, organizationMembershipMaps.englishOnly, courseRouteById);
  const nodeMembership = buildNodeMembershipLookup(organizationMembership, lectureMembership);

  await writeFile(join(buildDir, "catalog.json"), JSON.stringify(courses, null, 2));
  await writeFile(join(buildDir, "institution-summary.json"), JSON.stringify(institutionSummary, null, 2));
  await writeFile(join(buildDir, "lectures-browser.json"), JSON.stringify(lecturesBrowser, null, 2));
  await writeFile(join(buildDir, "institutions-organizations.json"), JSON.stringify(institutions, null, 2));
  await writeFile(join(buildDir, "node-membership.json"), JSON.stringify(nodeMembership, null, 2));
  await writeFile(join(buildDir, "search-index.json"), JSON.stringify(searchIndex, null, 2));
  await writeFile(join(buildDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(join(publicDir, "catalog.json"), JSON.stringify(courses, null, 2));
  await writeFile(join(publicDir, "institution-summary.json"), JSON.stringify(institutionSummary, null, 2));
  await writeFile(join(publicDir, "lectures-browser.json"), JSON.stringify(lecturesBrowser, null, 2));
  await writeFile(join(publicDir, "institutions-organizations.json"), JSON.stringify(institutions, null, 2));
  await writeFile(join(publicDir, "node-membership.json"), JSON.stringify(nodeMembership, null, 2));
  await writeFile(join(publicDir, "search-index.json"), JSON.stringify(searchIndex, null, 2));
  await writeFile(join(publicDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  await generateMarkdownRoutes(
    rootDir,
    courses,
    manifest,
    institutions,
    buildInstitutions(organizationTree, organizationMembershipMaps.all, courseRouteById),
    lecturesBrowser,
    buildLecturesBrowser(directories, latestSemester, lectureTree, lectureMembershipMaps.all, courseRouteById)
  );

  return manifest;
}

function buildNodeMembershipLookup(
  organizationMembership?: TreeMembershipArtifact,
  lectureMembership?: TreeMembershipArtifact
): BrowserNodeMembershipLookup {
  return {
    lecture: Object.fromEntries(
      (organizationMembership?.nodes ?? [])
        .map((node) => [node.path, node.lectures.map((lecture) => lecture.id)] as const)
        .filter(([, ids]) => ids.length > 0)
        .sort(([left], [right]) => left.localeCompare(right))
    ),
    tlecture: Object.fromEntries(
      (lectureMembership?.nodes ?? [])
        .map((node) => [node.path, node.lectures.map((lecture) => lecture.id)] as const)
        .filter(([, ids]) => ids.length > 0)
        .sort(([left], [right]) => left.localeCompare(right))
    )
  };
}

function buildInstitutions(
  organizationTree: OrganizationTreeNode | undefined,
  lecturesByPath: Map<string, MembershipLectureRef[]>,
  courseRouteById: Map<string, string>
): InstitutionNode[] {
  const rootChildren = organizationTree?.children ?? [];
  return pruneEmptyInstitutionNodes(
    rootChildren
    .map((node) => {
      const facultyText = normalizeOrganizationLabel(node.label?.en ?? node.label?.de ?? node.dir);
      const facultyRoute = `/institutions/${routeSegment(facultyText)}`;
      return {
        text: facultyText,
        textDe: normalizeOrganizationLabel(node.label?.de),
        path: node.dir,
        route: facultyRoute,
        lectures: toBrowserLectureRefs(lecturesByPath.get(node.dir) ?? [], courseRouteById, facultyRoute),
        children: buildInstitutionChildren(node.children ?? [], facultyText, facultyRoute, lecturesByPath, courseRouteById)
      };
    })
    .sort(compareTopLevelOrganizations)
  );
}

function buildInstitutionChildren(
  nodes: OrganizationTreeNode[],
  parentText: string,
  parentRoute: string,
  lecturesByPath: Map<string, MembershipLectureRef[]>,
  courseRouteById: Map<string, string>
): InstitutionNode[] {
  const comparableParentText = comparableOrganizationLabel(parentText);

  return nodes
    .map((node) => {
      const text = normalizeOrganizationLabel(node.label?.en ?? node.label?.de ?? node.dir);
      const route = `${parentRoute}/${routeSegment(text)}`;

      return {
        text,
        textDe: normalizeOrganizationLabel(node.label?.de),
        path: node.dir,
        route,
        lectures: toBrowserLectureRefs(lecturesByPath.get(node.dir) ?? [], courseRouteById, route),
        children: buildInstitutionChildren(node.children ?? [], text, route, lecturesByPath, courseRouteById)
      };
    })
    .filter((node) => comparableOrganizationLabel(node.text) !== comparableParentText);
}

function buildInstitutionSummary(courses: NormalizedCourse[]): InstitutionSummaryItem[] {
  const grouped = new Map<string, InstitutionSummaryItem>();

  for (const course of courses) {
    const institution = course.faculty || "Other";
    const current =
      grouped.get(institution) ??
      {
        institution,
        institutionCode: deriveFacultyFromSourceUrl(course.sourceUrl)?.code,
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
    grouped.set(institution, current);
  }

  return [...grouped.values()].sort((a, b) => a.institution.localeCompare(b.institution));
}

function buildLecturesBrowser(
  directories: ParsedDirectoryNode[],
  latestSemester?: string,
  lectureTree?: LectureTreeNode,
  lecturesByPath: Map<string, MembershipLectureRef[]> = new Map(),
  courseRouteById: Map<string, string> = new Map()
): LecturesBrowserArtifact {
  if (lectureTree) {
    const filteredDirectories = dedupeLectureDirectories(
      directories
        .filter((entry) => !latestSemester || entry.semester === latestSemester)
        .sort((a, b) => a.path.localeCompare(b.path))
    );
    const nodeByPath = new Map(filteredDirectories.map((entry) => [entry.path, entry] as const));

    return {
      semester: latestSemester,
      roots: pruneEmptyLectureNodes(
        lectureTree.children?.map((node) => toLecturesBrowserNode(node, nodeByPath, lecturesByPath, courseRouteById, "/lectures")) ?? []
      )
    };
  }

  const filteredDirectories = dedupeLectureDirectories(
    directories
      .filter((entry) => !latestSemester || entry.semester === latestSemester)
      .sort((a, b) => a.path.localeCompare(b.path))
  );

  const nodeByPath = new Map(filteredDirectories.map((entry) => [entry.path, entry] as const));
  const rootNode = nodeByPath.get("");
  const minDepth = filteredDirectories.length > 0 ? Math.min(...filteredDirectories.map((entry) => entry.depth)) : 0;
  const fallbackRoots = filteredDirectories.filter((entry) => entry.depth === minDepth);
  return {
    semester: latestSemester,
    roots: pruneEmptyLectureNodes(
      rootNode
        ? buildLecturesBrowserChildren(rootNode, nodeByPath, lecturesByPath, courseRouteById, "/lectures")
        : fallbackRoots.map((node) => ({
            text: node.label,
            route: `/lectures/${routeSegment(node.label)}`,
            path: node.path,
            sourceUrl: node.sourceUrl,
            sourceUrlDe: undefined,
            treeUrl: toTreeUrl(node.sourceUrl),
            treeUrlDe: undefined,
            lectures: toBrowserLectureRefs(lecturesByPath.get(node.path) ?? [], courseRouteById, `/lectures/${routeSegment(node.label)}`),
            children: buildLecturesBrowserChildren(
              node,
              nodeByPath,
              lecturesByPath,
              courseRouteById,
              `/lectures/${routeSegment(node.label)}`
            )
          }))
    )
  };
}

function dedupeLectureDirectories(nodes: ParsedDirectoryNode[]): ParsedDirectoryNode[] {
  const bestByPath = new Map<string, ParsedDirectoryNode>();

  for (const node of nodes) {
    const current = bestByPath.get(node.path);
    if (!current || lectureDirectoryPriority(node.sourceUrl) < lectureDirectoryPriority(current.sourceUrl)) {
      bestByPath.set(node.path, node);
    }
  }

  return [...bestByPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function lectureDirectoryPriority(sourceUrl: string): number {
  const lang = new URL(sourceUrl).searchParams.get("lang");
  if (lang === "en") {
    return 0;
  }
  if (lang === "de") {
    return 1;
  }
  return 2;
}

function buildLecturesBrowserChildren(
  node: ParsedDirectoryNode,
  nodeByPath: Map<string, ParsedDirectoryNode>,
  lecturesByPath: Map<string, MembershipLectureRef[]> = new Map(),
  courseRouteById: Map<string, string> = new Map(),
  parentRoute = "/lectures"
): LecturesBrowserNode[] {
  return node.children.map((child) => {
    const fullNode = nodeByPath.get(child.path);
    const sourceUrl = fullNode?.sourceUrl ?? child.sourceUrl;
    const text = fullNode?.label ?? child.label;
    const route = `${parentRoute}/${routeSegment(text)}`;

    return {
      text,
      textDe: undefined,
      path: child.path,
      route,
      sourceUrl,
      sourceUrlDe: undefined,
      treeUrl: toTreeUrl(sourceUrl),
      treeUrlDe: undefined,
      lectures: toBrowserLectureRefs(lecturesByPath.get(child.path) ?? [], courseRouteById, route),
      children: fullNode ? buildLecturesBrowserChildren(fullNode, nodeByPath, lecturesByPath, courseRouteById, route) : []
    };
  });
}

function toLecturesBrowserNode(
  node: LectureTreeNode,
  nodeByPath?: Map<string, ParsedDirectoryNode>,
  lecturesByPath: Map<string, MembershipLectureRef[]> = new Map(),
  courseRouteById: Map<string, string> = new Map(),
  parentRoute = "/lectures"
): LecturesBrowserNode {
  const sourceUrl = node.sourceUrl?.en ?? node.sourceUrl?.de ?? "";
  const sourceUrlDe = node.sourceUrl?.de;
  const treeUrl = node.treeUrl?.en ?? node.treeUrl?.de ?? (sourceUrl ? toTreeUrl(sourceUrl) : "");
  const treeUrlDe = node.treeUrl?.de;
  const fallbackNode = nodeByPath?.get(node.path);
  const route = `${parentRoute}/${routeSegment(node.label?.en ?? node.label?.de ?? node.path)}`;
  const children =
    node.children && node.children.length > 0
      ? node.children.map((child) => toLecturesBrowserNode(child, nodeByPath, lecturesByPath, courseRouteById, route))
      : fallbackNode
        ? buildLecturesBrowserChildren(fallbackNode, nodeByPath ?? new Map(), lecturesByPath, courseRouteById, route)
        : [];

  return {
    text: node.label?.en ?? node.label?.de ?? node.path,
    textDe: node.label?.de,
    path: node.path,
    route,
    sourceUrl,
    sourceUrlDe,
    treeUrl,
    treeUrlDe,
    lectures: toBrowserLectureRefs(lecturesByPath.get(node.path) ?? [], courseRouteById, route),
    children
  };
}

function toBrowserLectureRefs(
  lectures: MembershipLectureRef[],
  courseRouteById: Map<string, string>,
  nodeRoute: string
): BrowserLectureRef[] {
  return lectures.map((lecture) => {
    const membershipSlug = boundedSlug(`${lecture.title.en ?? lecture.title.de ?? lecture.id}-${lecture.id}`);
    const membershipRoute = `/courses/membership/${membershipSlug}`;
    const route = courseRouteById.get(lecture.id) ?? membershipRoute;
    const detailRoute = `${nodeRoute}/${lectureDetailSegment(route)}`;

    return {
      key: lecture.key,
      id: lecture.id,
      text: lectureDisplayTitle(lecture.title.en ?? lecture.title.de ?? lecture.id),
      textDe: lecture.title.de ? lectureDisplayTitle(lecture.title.de) : undefined,
      route,
      detailRoute,
      sourceUrl: lecture.sourceUrl.en ?? lecture.sourceUrl.de ?? "",
      sourceUrlDe: lecture.sourceUrl.de
    };
  });
}

function buildLanguageMembershipMaps(
  membership: TreeMembershipArtifact | undefined,
  courseById: Map<string, NormalizedCourse>
): LanguageMembershipMaps {
  const all = new Map<string, MembershipLectureRef[]>();
  const englishOnly = new Map<string, MembershipLectureRef[]>();

  for (const node of membership?.nodes ?? []) {
    all.set(node.path, node.lectures);
    englishOnly.set(
      node.path,
      node.lectures.filter((lecture) => courseById.get(lecture.id)?.language === "english")
    );
  }

  return { all, englishOnly };
}

function pruneEmptyLectureNodes(nodes: LecturesBrowserNode[]): LecturesBrowserNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: pruneEmptyLectureNodes(node.children)
    }))
    .filter((node) => node.lectures.length > 0 || node.children.length > 0);
}

function pruneEmptyInstitutionNodes(nodes: InstitutionNode[]): InstitutionNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: pruneEmptyInstitutionNodes(node.children)
    }))
    .filter((node) => node.lectures.length > 0 || node.children.length > 0);
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

async function generateMarkdownRoutes(
  rootDir: string,
  courses: NormalizedCourse[],
  manifest: BuildManifest,
  englishInstitutions: InstitutionNode[],
  germanInstitutions: InstitutionNode[],
  englishLecturesBrowser: LecturesBrowserArtifact,
  germanLecturesBrowser: LecturesBrowserArtifact
): Promise<void> {
  const coursesDir = join(rootDir, "site", "docs", "courses");
  const semestersDir = join(rootDir, "site", "docs", "semesters");
  const institutionsDir = join(rootDir, "site", "docs", "institutions");
  const institutionsDeDir = join(rootDir, "site", "docs", "de", "institutions");
  const lecturesDir = join(rootDir, "site", "docs", "lectures");
  const lecturesDeDir = join(rootDir, "site", "docs", "de", "lectures");
  const membershipCoursesDir = join(coursesDir, "membership");
  await mkdir(coursesDir, { recursive: true });
  await mkdir(semestersDir, { recursive: true });
  await mkdir(institutionsDir, { recursive: true });
  await mkdir(institutionsDeDir, { recursive: true });
  await mkdir(lecturesDir, { recursive: true });
  await mkdir(lecturesDeDir, { recursive: true });
  await mkdir(membershipCoursesDir, { recursive: true });
  await clearGeneratedMarkdown(coursesDir);
  await clearGeneratedMarkdown(semestersDir);
  await rm(join(rootDir, "site", "docs", "faculty"), { recursive: true, force: true });
  await rm(join(rootDir, "site", "docs", "de", "faculty"), { recursive: true, force: true });
  await clearGeneratedInstitutionRoutes(institutionsDir);
  await clearGeneratedInstitutionRoutes(institutionsDeDir);
  await clearGeneratedLectureRoutes(lecturesDir);
  await clearGeneratedLectureRoutes(lecturesDeDir);
  await clearGeneratedMembershipRoutes(membershipCoursesDir);

  const coursesById = new Map(courses.map((course) => [course.id, course] as const));

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

  for (const lecture of collectMembershipLectures(germanLecturesBrowser.roots)) {
    const route = lecture.route ?? "";
    if (!route.startsWith("/courses/membership/")) {
      continue;
    }

    const slug = route.replace("/courses/membership/", "");
    const outputPath = join(membershipCoursesDir, `${slug}.md`);
    const content = `# ${lecture.text}

- Lecture ID: ${lecture.id}
- Source: [UnivIS](${lecture.sourceUrl})

Detailed local course content is not available in the catalog build for this lecture yet.
`;

    await writeFile(outputPath, content);
  }

  for (const semester of manifest.semesters) {
    const semesterCourses = courses.filter((course) => course.semester === semester);
    const content = `# ${semester}

Generated ${manifest.generatedAt}

${semesterCourses.map((course) => `- [${course.title}](/courses/${course.slug})`).join("\n")}
`;

    await writeFile(join(semestersDir, `${slugify(semester)}.md`), content);
  }

  await generateInstitutionRoutes(rootDir, englishInstitutions, false);
  await generateInstitutionRoutes(rootDir, germanInstitutions, true);
  await generateLectureRoutes(rootDir, englishLecturesBrowser.roots, coursesById, false);
  await generateLectureRoutes(rootDir, germanLecturesBrowser.roots, coursesById, true);
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

async function clearGeneratedInstitutionRoutes(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === "index.md") {
      continue;
    }
    await rm(join(dir, entry.name), { recursive: true, force: true });
  }
}

async function clearGeneratedLectureRoutes(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === "index.md") {
      continue;
    }
    await rm(join(dir, entry.name), { recursive: true, force: true });
  }
}

async function clearGeneratedMembershipRoutes(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    await rm(join(dir, entry.name), { recursive: true, force: true });
  }
}

async function generateInstitutionRoutes(rootDir: string, nodes: InstitutionNode[], german: boolean): Promise<void> {
  const baseDir = german ? join(rootDir, "site", "docs", "de", "institutions") : join(rootDir, "site", "docs", "institutions");

  for (const node of nodes) {
    await writeInstitutionRouteTree(baseDir, node, german);
  }
}

async function generateLectureRoutes(
  rootDir: string,
  nodes: LecturesBrowserNode[],
  coursesById: Map<string, NormalizedCourse>,
  german: boolean
): Promise<void> {
  const baseDir = german ? join(rootDir, "site", "docs", "de", "lectures") : join(rootDir, "site", "docs", "lectures");
  for (const node of nodes) {
    await writeLectureRouteTree(baseDir, node, coursesById, german, []);
  }
}

async function writeLectureRouteTree(
  baseDir: string,
  node: LecturesBrowserNode,
  coursesById: Map<string, NormalizedCourse>,
  german: boolean,
  ancestors: LecturesBrowserNode[]
): Promise<void> {
  await writeLectureRoute(baseDir, node, german, ancestors);
  await writeLectureDetailRoutes(baseDir, node, coursesById, german, ancestors);
  for (const child of node.children) {
    await writeLectureRouteTree(baseDir, child, coursesById, german, [...ancestors, node]);
  }
}

async function writeLectureRoute(
  baseDir: string,
  node: LecturesBrowserNode,
  german: boolean,
  ancestors: LecturesBrowserNode[]
): Promise<void> {
  const relativeRoute = node.route.replace(/^\/lectures/, "").replace(/^\/de\/lectures/, "");
  const relativePath = relativeRoute.replace(/^\//, "");
  const outputPath = join(baseDir, relativePath, "index.md");
  await mkdir(dirname(outputPath), { recursive: true });
  const title = german ? node.textDe ?? node.text : node.text;
  const backLink = german ? "/de/lectures/" : "/lectures/";
  const content = `---
title: ${JSON.stringify(title)}
pageClass: lecture-node-page
---

# ${title}

- [${german ? "Zur Vorlesungsübersicht" : "Back to lectures overview"}](${backLink})

${german ? "Wählen Sie eine Lehrveranstaltung in der Seitenleiste aus." : "Choose a lecture from the sidebar."}
`;
  await writeFile(outputPath, content);
}

async function writeLectureDetailRoutes(
  baseDir: string,
  node: LecturesBrowserNode,
  coursesById: Map<string, NormalizedCourse>,
  german: boolean,
  ancestors: LecturesBrowserNode[]
): Promise<void> {
  const relativeRoute = node.route.replace(/^\/lectures/, "").replace(/^\/de\/lectures/, "").replace(/^\//, "");
  const outputDir = join(baseDir, relativeRoute);
  await mkdir(outputDir, { recursive: true });

  for (const lecture of node.lectures) {
    const detailFile = join(outputDir, `${lectureDetailSegment(lecture.detailRoute ?? lecture.route ?? lecture.id)}.md`);
    const course = coursesById.get(lecture.id);
    const title = german ? lecture.textDe ?? lecture.text : lecture.text;
    const canonicalCourseRoute = lecture.route
      ? german && lecture.route.startsWith("/courses/") ? `/de${lecture.route}` : lecture.route
      : null;

    const content = course
      ? `---
title: ${JSON.stringify(title)}
pageClass: lecture-node-page
---

# ${title}

- ${german ? "Semester" : "Semester"}: ${course.semester ?? "Unknown"}
- ${german ? "Sprache" : "Language"}: ${course.language}
- ${german ? "Quelle" : "Source"}: [UnivIS](${german ? lecture.sourceUrlDe ?? lecture.sourceUrl : lecture.sourceUrl})
${canonicalCourseRoute ? `- ${german ? "Katalogseite" : "Catalog page"}: [${german ? "Öffnen" : "Open"}](${canonicalCourseRoute})` : ""}

${course.description ?? (german ? "Keine Beschreibung verfügbar." : "No description available.")}
`
      : `---
title: ${JSON.stringify(title)}
pageClass: lecture-node-page
---

# ${title}

- Lecture ID: ${lecture.id}
- ${german ? "Quelle" : "Source"}: [UnivIS](${german ? lecture.sourceUrlDe ?? lecture.sourceUrl : lecture.sourceUrl})

${german
          ? "Detaillierte lokale Kursinhalte sind für diese Lehrveranstaltung im aktuellen Katalog noch nicht verfügbar."
          : "Detailed local course content is not available in the current catalog build for this lecture yet."}
`;

    await writeFile(detailFile, content);
  }
}

async function writeInstitutionRouteTree(baseDir: string, node: InstitutionNode, german: boolean): Promise<void> {
  await writeInstitutionRoute(baseDir, node, german);
  for (const child of node.children) {
    await writeInstitutionRouteTree(baseDir, child, german);
  }
}

async function writeInstitutionRoute(baseDir: string, node: InstitutionNode, german: boolean): Promise<void> {
  const relativeRoute = node.route.replace(/^\/institutions/, "").replace(/^\/de\/institutions/, "");
  const relativePath = relativeRoute.replace(/^\//, "");
  const outputPath = join(baseDir, `${relativePath}.md`);
  await mkdir(dirname(outputPath), { recursive: true });
  const title = german ? node.textDe ?? node.text : node.text;
  const backLink = german ? "/de/institutions/" : "/institutions/";
  const content = `# ${title}

- [${german ? "Zur Institutionsübersicht" : "Back to institutions overview"}](${backLink})

<InstitutionsBrowser />
`;
  await writeFile(outputPath, content);
}

function collectMembershipLectures(nodes: LecturesBrowserNode[]): BrowserLectureRef[] {
  const collected: BrowserLectureRef[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    for (const lecture of node.lectures) {
      if (!seen.has(lecture.route ?? lecture.id)) {
        seen.add(lecture.route ?? lecture.id);
        collected.push(lecture);
      }
    }
    collected.push(...collectMembershipLectures(node.children));
  }

  return collected;
}

function routeSegment(label: string): string {
  return boundedSlug(
    label
      .replace(/^faculty of\s+/i, "")
      .replace(/^department of\s+/i, "")
      .replace(/^institute of\s+/i, "")
      .replace(/^fakult[aä]t\s+f[uü]r\s+/i, "")
      .replace(/^institut f[uü]r\s+/i, "")
      .trim(),
    64
  );
}

function lectureDetailSegment(routeOrId: string): string {
  const normalized = routeOrId.replace(/\/+$/, "");
  const lastSegment = normalized.split("/").filter(Boolean).at(-1);
  return boundedSlug(lastSegment ?? routeOrId, 64);
}

function lectureDisplayTitle(title: string): string {
  return title.replace(/^[^:]{2,40}:\s+/, "").trim();
}

function normalizeOrganizationLabel(label?: string): string {
  if (!label) {
    return "";
  }

  return label
    .replace(/\s+\uFFFD\s+/g, " - ")
    .replace(/f\uFFFD?r/g, "für")
    .replace(/Sch\uFFFDcking/g, "Schöcking")
    .replace(/Schl\uFFFDssel/g, "Schlüssel")
    .replace(/selbst\uFFFDndig/g, "selbständig")
    .trim();
}

function comparableOrganizationLabel(label: string): string {
  return label
    .replace(/^faculty of\s+/i, "")
    .trim()
    .toLowerCase();
}

function compareTopLevelOrganizations(left: InstitutionNode, right: InstitutionNode): number {
  const leftIsFaculty = isFacultyLabel(left.text);
  const rightIsFaculty = isFacultyLabel(right.text);
  if (leftIsFaculty !== rightIsFaculty) {
    return leftIsFaculty ? -1 : 1;
  }
  return left.text.localeCompare(right.text);
}

function isFacultyLabel(label: string): boolean {
  return /^faculty of\s+/i.test(label);
}
