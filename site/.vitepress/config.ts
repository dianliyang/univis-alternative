import { defineConfig } from "vitepress";

export default defineConfig({
  title: "UnivIS Kiel Catalog",
  description: "Static, searchable UnivIS browser for Kiel",
  srcDir: "docs",
  themeConfig: {
    nav: [
      { text: "Courses", link: "/courses/" },
      { text: "Semesters", link: "/semesters/" },
      { text: "Accessibility", link: "/about/accessibility" }
    ],
    sidebar: [
      {
        text: "Browse",
        items: [
          { text: "Home", link: "/" },
          { text: "Courses", link: "/courses/" },
          { text: "Semesters", link: "/semesters/" }
        ]
      }
    ]
  }
});
