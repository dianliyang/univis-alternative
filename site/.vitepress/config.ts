import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitepress";

interface LectureSidebarNode {
  text: string;
  textDe?: string;
  path?: string;
  route: string;
  lectures?: Array<{
    text: string;
    textDe?: string;
    route?: string;
    detailRoute?: string;
    id: string;
  }>;
  children?: LectureSidebarNode[];
}

interface SidebarLectureRef {
  text: string;
  textDe?: string;
  route?: string;
  detailRoute?: string;
  id?: string;
}

interface LectureBrowserArtifact {
  roots: LectureSidebarNode[];
}

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

function loadLectureBrowser(): LectureBrowserArtifact {
  const source = readFileSync(join(process.cwd(), "data", "build", "lectures-browser.json"), "utf8");
  return JSON.parse(source) as LectureBrowserArtifact;
}

function ensureTrailingSlash(route: string): string {
  return route.endsWith("/") ? route : `${route}/`;
}

function lectureDetailLink(node: LectureSidebarNode, lecture: NonNullable<LectureSidebarNode["lectures"]>[number], german: boolean): string {
  const detailRoute = lecture.detailRoute ?? `${node.route}/${(lecture.route ?? lecture.id).split("/").filter(Boolean).at(-1)}`;
  return german ? `/de${detailRoute}` : detailRoute;
}

export function isSidebarExerciseLecture(lecture: SidebarLectureRef): boolean {
  const label = (lecture.textDe ?? lecture.text ?? "").trim();
  const route = `${lecture.detailRoute ?? ""} ${lecture.route ?? ""}`;
  return /(?:^|\/)exercise-[^/]+$/i.test(lecture.detailRoute ?? "") || /^(exercise|übung)\s*:/i.test(label);
}

function buildLectureSidebar(german: boolean): Record<string, SidebarItem[]> {
  const sidebars: Record<string, SidebarItem[]> = {};
  const roots = loadLectureBrowser().roots;

  function sidebarLink(route: string): string {
    return german ? `/de${route}` : route;
  }

  function lectureItems(node: LectureSidebarNode): SidebarItem[] {
    return (node.lectures ?? [])
      .filter((lecture) => !isSidebarExerciseLecture(lecture))
      .map((lecture) => ({
        text: german ? lecture.textDe ?? lecture.text : lecture.text,
        link: lectureDetailLink(node, lecture, german)
      }));
  }

  function toCategoryItem(node: LectureSidebarNode, expandedPath?: string): SidebarItem {
    const lectures = lectureItems(node);
    const item: SidebarItem = {
      text: german ? node.textDe ?? node.text : node.text,
      link: sidebarLink(ensureTrailingSlash(node.route))
    };

    if (lectures.length > 0) {
      item.items = lectures;
      item.collapsed = node.path !== expandedPath;
    }

    return item;
  }

  function hasLectureDescendants(node: LectureSidebarNode): boolean {
    if ((node.lectures?.length ?? 0) > 0) {
      return true;
    }

    return (node.children ?? []).some(hasLectureDescendants);
  }

  function visit(node: LectureSidebarNode, siblings: LectureSidebarNode[]): void {
    if (!hasLectureDescendants(node)) {
      return;
    }

    const key = sidebarLink(ensureTrailingSlash(node.route));
    sidebars[key] = siblings.map((sibling) => toCategoryItem(sibling, node.path));

    for (const lecture of lectureItems(node)) {
      if (lecture.link) {
        sidebars[ensureTrailingSlash(lecture.link)] = siblings.map((sibling) => toCategoryItem(sibling, node.path));
      }
    }

    const allChildren = node.children ?? [];
    const relevantChildren = allChildren.filter(hasLectureDescendants);
    if (relevantChildren.length > 0 && (node.lectures?.length ?? 0) === 0) {
      const childKey = sidebarLink(ensureTrailingSlash(node.route));
      sidebars[childKey] = allChildren.map((child) => toCategoryItem(child));
      for (const child of relevantChildren) {
        visit(child, allChildren);
      }
      return;
    }

    for (const child of relevantChildren) {
      visit(child, allChildren);
    }
  }

  for (const root of roots) {
    visit(root, roots);
  }

  return sidebars;
}

const lectureSidebar = buildLectureSidebar(false);
const lectureSidebarDe = buildLectureSidebar(true);

export default defineConfig({
  title: "UnivIS - CAU",
  description: "Static, searchable UnivIS browser for Kiel",
  head: [["link", { rel: "icon", href: "/logo-light.svg" }]],
  srcDir: "docs",
  appearance: true,
  locales: {
    root: {
      label: "English",
      lang: "en",
      themeConfig: {
        nav: [
          { text: "Institutions", link: "/institutions/", activeMatch: "^/institutions/" },
          { text: "Lectures", link: "/lectures/", activeMatch: "^/lectures/" },
          { text: "About", link: "/about/", activeMatch: "^/about/" }
        ],
        sidebar: lectureSidebar,
        socialLinks: [{ icon: "github", link: "https://github.com/dianliyang/univis-alternative" }]
      }
    },
    de: {
      label: "Deutsch",
      lang: "de",
      link: "/de/",
      themeConfig: {
        nav: [
          { text: "Institutionen", link: "/de/institutions/", activeMatch: "^/de/institutions/" },
          { text: "Lehrveranstaltungen", link: "/de/lectures/", activeMatch: "^/de/lectures/" },
          { text: "Über", link: "/de/about/", activeMatch: "^/de/about/" }
        ],
        sidebar: lectureSidebarDe,
        socialLinks: [{ icon: "github", link: "https://github.com/dianliyang/univis-alternative" }]
      }
    }
  },
  themeConfig: {
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      alt: "UnivIS - CAU"
    },
    nav: [
      { text: "Institutions", link: "/institutions/", activeMatch: "^/institutions/" },
      { text: "Lectures", link: "/lectures/", activeMatch: "^/lectures/" },
      { text: "About", link: "/about/", activeMatch: "^/about/" }
    ],
    sidebar: lectureSidebar,
    socialLinks: [{ icon: "github", link: "https://github.com/dianliyang/univis-alternative" }]
  }
});
