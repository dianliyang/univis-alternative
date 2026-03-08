import { describe, expect, it } from "vitest";
import config, { isSidebarExerciseLecture } from "../../site/.vitepress/config.js";

describe("site config", () => {
  it("defines the main navigation, GitHub link, appearance switch, and locales", () => {
    expect(config.title).toBe("UnivIS - CAU");
    expect(config.head).toEqual([["link", { rel: "icon", href: "/logo-light.svg" }]]);
    expect(config.themeConfig?.logo).toEqual({
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      alt: "UnivIS - CAU"
    });
    expect(config.themeConfig?.nav).toEqual([
      { text: "Institutions", link: "/institutions/", activeMatch: "^/institutions/" },
      { text: "Lectures", link: "/lectures/", activeMatch: "^/lectures/" },
      { text: "About", link: "/about/", activeMatch: "^/about/" }
    ]);
    expect(config.themeConfig?.socialLinks).toEqual([{ icon: "github", link: "https://github.com/dianliyang/univis-alternative" }]);
    expect(config.appearance).toBe(true);
    expect(config.locales?.de?.label).toBe("Deutsch");
  });

  it("does not repeat the institutions page as the first child item in sidebar groups", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;

    expect(Object.keys(rootSidebar ?? {})).not.toContain("/institutions/");
  });

  it("does not include a standalone institutions browser sidebar entry", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;
    const germanSidebar = config.locales?.de?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;

    expect(Object.keys(rootSidebar ?? {}).some((key) => key.startsWith("/institutions/"))).toBe(false);
    expect(Object.keys(germanSidebar ?? {}).some((key) => key.startsWith("/de/institutions/"))).toBe(false);
  });

  it("does not define institution sidebar groups", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;

    expect(Object.keys(rootSidebar ?? {}).every((key) => key.startsWith("/lectures/"))).toBe(true);
  });

  it("defines native lecture sidebars for generated lecture node routes", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;
    const germanSidebar = config.locales?.de?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;

    expect(rootSidebar).toBeDefined();
    expect(germanSidebar).toBeDefined();
    expect(rootSidebar).toHaveProperty("/lectures/engineering/computer-science/masters-degree-program-in-computer-science/theoretical-computer-science/");
    expect(germanSidebar).toHaveProperty(
      "/de/lectures/engineering/computer-science/masters-degree-program-in-computer-science/theoretical-computer-science/"
    );
  });

  it("does not materialize lecture sidebars for every tree route", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;
    const germanSidebar = config.locales?.de?.themeConfig?.sidebar as Record<string, unknown[]> | undefined;

    expect(Object.keys(rootSidebar ?? {}).length).toBeLessThan(100);
    expect(Object.keys(germanSidebar ?? {}).length).toBeLessThan(100);
  });

  it("builds expandable lecture sidebars from sibling categories", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as
      | Record<string, Array<{ text: string; link?: string; items?: Array<{ text: string; link: string }> }>>
      | undefined;
    const items =
      rootSidebar?.["/lectures/engineering/computer-science/masters-degree-program-in-computer-science/theoretical-computer-science/"] ?? [];

    expect(items.some((item) => item.text === "Open Elective")).toBe(true);
    expect(items.some((item) => item.text === "Theoretical Computer Science")).toBe(true);
    const theory = items.find((item) => item.text === "Theoretical Computer Science");
    expect(theory?.items?.some((item) => item.text === "Automata and Logics")).toBe(true);
  });

  it("does not include exercise entries in lecture sidebars", () => {
    const rootSidebar = config.locales?.root?.themeConfig?.sidebar as
      | Record<string, Array<{ text: string; link?: string; items?: Array<{ text: string; link: string }> }>>
      | undefined;
    const items =
      rootSidebar?.["/lectures/engineering/computer-science/masters-degree-program-in-computer-science/theoretical-computer-science/"] ?? [];
    const theory = items.find((item) => item.text === "Theoretical Computer Science");

    expect(theory?.items?.some((item) => item.text === "Exercise: Automata and Logics")).toBe(false);
  });

  it("filters exercise lecture labels out of lecture sidebars", () => {
    expect(isSidebarExerciseLecture({ text: "Exercise: Automata and Logics" })).toBe(true);
    expect(isSidebarExerciseLecture({ text: "Übung: Automaten und Logiken" })).toBe(true);
    expect(isSidebarExerciseLecture({ text: "Automata and Logics", detailRoute: "/lectures/x/exercise-automata-and-logics-22334670" })).toBe(true);
    expect(isSidebarExerciseLecture({ text: "Automata and Logics", detailRoute: "/lectures/x/infautlog-01a-automata-and-logics-22381849" })).toBe(false);
  });
});
