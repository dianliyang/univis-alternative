import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateBuildArtifacts } from "../../src/generator/index.js";

describe("browser artifacts", () => {
  it("builds a nested lecture tree from parsed tlecture nodes for the latest semester", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-browser-artifacts-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "abc123",
          slug: "english-literature-abc123",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=x&sem=2025w&tdir=mathe/mathem",
          title: "English Literature",
          faculty: "Mathematics and Natural Sciences",
          lecturers: [],
          sessions: [],
          searchText: "English Literature",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["English"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [
        {
          label: "Faculty of Mathematics and Natural Sciences",
          path: "mathe",
          depth: 1,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe&sem=2025w",
          children: [
            {
              label: "Mathematics",
              path: "mathe/mathem",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem&sem=2025w"
            }
          ]
        },
        {
          label: "Mathematics",
          path: "mathe/mathem",
          depth: 2,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem&sem=2025w",
          children: [
            {
              label: "One-subject Bachelor's Programme",
              path: "mathe/mathem/1fachb",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/1fachb&sem=2025w"
            }
          ]
        },
        {
          label: "One-subject Bachelor's Programme",
          path: "mathe/mathem/1fachb",
          depth: 3,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem/1fachb&sem=2025w",
          children: []
        }
      ],
      undefined,
      undefined,
      undefined,
      {
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "mathe/mathem/1fachb",
            lectures: [
              {
                key: "Lecture.abc123",
                id: "abc123",
                title: { en: "English Literature" },
                sourceUrl: { en: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=x&sem=2025w&tdir=mathe/mathem" }
              }
            ]
          }
        ]
      }
    );

    const browser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    expect(browser.semester).toBe("2025w");
    expect(browser.roots).toHaveLength(1);
    expect(browser.roots[0].text).toBe("Faculty of Mathematics and Natural Sciences");
    expect(browser.roots[0].route).toBe("/lectures/mathematics-and-natural-sciences");
    expect(browser.roots[0].children[0].text).toBe("Mathematics");
    expect(browser.roots[0].children[0].children[0].text).toBe("One-subject Bachelor's Programme");
    expect(browser.roots[0].treeUrl).toContain("dsc=anew%2Ftlecture%3Atree");
    expect(browser.roots[0].lectures).toEqual([]);
  });

  it("builds lecture roots directly from the tlecture root tree, not from course summary buckets", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-browser-artifacts-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "gemei-1",
          slug: "joint-units-course-gemei1",
          sourceUrl: "https://example.test/gemei-1",
          title: "Joint Units Course",
          lecturers: [],
          sessions: [],
          searchText: "Joint Units Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [
        {
          label: "Lecture Directory",
          path: "",
          depth: 0,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&sem=2025w",
          children: [
            {
              label: "Joint Units",
              path: "gemei",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=gemei&sem=2025w"
            }
          ]
        },
        {
          label: "Joint Units",
          path: "gemei",
          depth: 1,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=gemei&sem=2025w",
          children: []
        }
      ],
      undefined,
      undefined,
      undefined,
      {
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "gemei",
            lectures: [{ key: "Lecture.gemei-1", id: "gemei-1", title: { en: "Joint Units Course" }, sourceUrl: { en: "https://example.test/gemei-1" } }]
          }
        ]
      }
    );

    const browser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    expect(browser.roots.map((node: { text: string }) => node.text)).toEqual(["Joint Units"]);
  });

  it("prefers English lecture-directory labels when both English and German nodes exist for the same path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-browser-artifacts-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "techn-1",
          slug: "engineering-course-techn1",
          sourceUrl: "https://example.test/techn-1",
          title: "Engineering Course",
          lecturers: [],
          sessions: [],
          searchText: "Engineering Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [
        {
          label: "Vorlesungsverzeichnis",
          path: "",
          depth: 0,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=de&sem=2025w",
          children: [{ label: "Technische Fakultät", path: "techn", sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=de&tdir=techn&sem=2025w" }]
        },
        {
          label: "Lecture Directory",
          path: "",
          depth: 0,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=en&sem=2025w",
          children: [{ label: "Faculty of Engineering", path: "techn", sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=en&tdir=techn&sem=2025w" }]
        },
        {
          label: "Technische Fakultät",
          path: "techn",
          depth: 1,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=de&tdir=techn&sem=2025w",
          children: []
        },
        {
          label: "Faculty of Engineering",
          path: "techn",
          depth: 1,
          semester: "2025w",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&lang=en&tdir=techn&sem=2025w",
          children: []
        }
      ],
      undefined,
      undefined,
      undefined,
      {
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn",
            lectures: [{ key: "Lecture.techn-1", id: "techn-1", title: { en: "Engineering Course" }, sourceUrl: { en: "https://example.test/techn-1" } }]
          }
        ]
      }
    );

    const browser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    expect(browser.roots[0].text).toBe("Faculty of Engineering");
  });

  it("builds route-backed institution pages from the organization tree", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "inst-1",
          slug: "institution-course-inst1",
          sourceUrl: "https://example.test/inst-1",
          title: "Institution Course",
          lecturers: [],
          sessions: [],
          searchText: "Institution Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn",
            label: {
              en: "Faculty of Engineering",
              de: "Technische Fakultät"
            },
            children: [
              {
                dir: "techn/infor",
                label: {
                  en: "Department of Computer Science",
                  de: "Institut für Informatik"
                },
                children: []
              }
            ]
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infor",
            lectures: [{ key: "Lecture.inst-1", id: "inst-1", title: { en: "Institution Course" }, sourceUrl: { en: "https://example.test/inst-1" } }]
          }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations[0].route).toBe("/institutions/engineering");
    expect(organizations[0].children[0].route).toBe("/institutions/engineering/computer-science");

    const institutionsPage = await readFile(join(rootDir, "site", "docs", "institutions", "engineering.md"), "utf8");
    const childPage = await readFile(join(rootDir, "site", "docs", "institutions", "engineering", "computer-science.md"), "utf8");
    expect(institutionsPage).toContain("<InstitutionsBrowser />");
    expect(childPage).toContain("<InstitutionsBrowser />");
  });

  it("attaches related lectures to lecture and institution nodes when membership data exists", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-browser-artifacts-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "41780504",
          slug: "engineering-secure-software-systems-417805",
          sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/softwa/infess&sem=2025w",
          title: "infESSS-02a: Engineering Secure Software Systems",
          lecturers: [],
          sessions: [],
          searchText: "infESSS-02a: Engineering Secure Software Systems",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn/infor/inform/softwa",
            label: { en: "Software Engineering", de: "Software Engineering" },
            children: []
          }
        ]
      },
      {
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: [
          {
            path: "techn/infora/master/theore",
            label: { en: "Theoretical Computer Science", de: "Theoretische Informatik" },
            sourceUrl: { en: "https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=techn/infora/master/theore&sem=2025w" },
            treeUrl: { en: "https://univis.uni-kiel.de/form?dsc=anew/tlecture:tree&tdir=techn/infora/master/theore&sem=2025w" },
            children: []
          }
        ]
      },
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infor/inform/softwa",
            lectures: [
              {
                key: "Lecture.techn.infor.inform.softwa.infess",
                id: "41780504",
                title: { en: "infESSS-02a: Engineering Secure Software Systems" },
                sourceUrl: { en: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/softwa/infess&sem=2025w" }
              }
            ]
          }
        ]
      },
      {
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infora/master/theore",
            lectures: [
              {
                key: "Lecture.techn.infor.inform.softwa.infess",
                id: "41780504",
                title: { en: "infESSS-02a: Engineering Secure Software Systems" },
                sourceUrl: { en: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/softwa/infess&sem=2025w" }
              }
            ]
          }
        ]
      }
    );

    const lecturesBrowser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    const institutions = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));

    expect(lecturesBrowser.roots[0].lectures[0]).toMatchObject({
      id: "41780504",
      text: "Engineering Secure Software Systems",
      route: "/courses/engineering-secure-software-systems-417805"
    });
    expect(institutions[0].lectures[0]).toMatchObject({
      id: "41780504",
      route: "/courses/engineering-secure-software-systems-417805"
    });

    const lectureNodePage = await readFile(
      join(rootDir, "site", "docs", "lectures", "theoretical-computer-science", "index.md"),
      "utf8"
    );
    expect(lectureNodePage).toContain("pageClass: lecture-node-page");
    expect(lectureNodePage).toContain("Back to lectures overview");
    expect(lectureNodePage).toContain("Choose a lecture from the sidebar");
    expect(lectureNodePage).not.toContain(" > ");

    const lectureDetailPage = await readFile(
      join(rootDir, "site", "docs", "lectures", "theoretical-computer-science", "engineering-secure-software-systems-417805.md"),
      "utf8"
    );
    expect(lectureDetailPage).toContain("pageClass: lecture-node-page");
    expect(lectureDetailPage).toContain('title: "Engineering Secure Software Systems"');
    expect(lectureDetailPage).toContain("Engineering Secure Software Systems");
    expect(lectureDetailPage).not.toContain("infESSS-02a:");
    expect(lectureDetailPage).toContain("Catalog page:");
    expect(lectureDetailPage).not.toContain(" > ");
  });

  it("keeps non-faculty top-level organizations and sorts faculties to the top", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "org-1",
          slug: "organization-course-org1",
          sourceUrl: "https://example.test/org-1",
          title: "Organization Course",
          lecturers: [],
          sessions: [],
          searchText: "Organization Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "praes",
            label: {
              en: "Präsidium (University board)",
              de: "Präsidium"
            },
            children: []
          },
          {
            dir: "rechts",
            label: {
              en: "Faculty of Law",
              de: "Rechtswissenschaftliche Fakultät"
            },
            children: []
          },
          {
            dir: "techn",
            label: {
              en: "Faculty of Engineering",
              de: "Technische Fakultät"
            },
            children: []
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          { path: "praes", lectures: [{ key: "Lecture.org-1", id: "org-1", title: { en: "Organization Course" }, sourceUrl: { en: "https://example.test/org-1" } }] },
          { path: "rechts", lectures: [{ key: "Lecture.org-1", id: "org-1", title: { en: "Organization Course" }, sourceUrl: { en: "https://example.test/org-1" } }] },
          { path: "techn", lectures: [{ key: "Lecture.org-1", id: "org-1", title: { en: "Organization Course" }, sourceUrl: { en: "https://example.test/org-1" } }] }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations.map((node: { text: string }) => node.text)).toEqual([
      "Faculty of Engineering",
      "Faculty of Law",
      "Präsidium (University board)"
    ]);
  });

  it("preserves nested organization children for department pages and generates their routes", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "micro-1",
          slug: "microelectronics-course-micro1",
          sourceUrl: "https://example.test/micro-1",
          title: "Microelectronics Course",
          lecturers: [],
          sessions: [],
          searchText: "Microelectronics Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn",
            label: {
              en: "Faculty of Engineering",
              de: "Technische Fakultät"
            },
            children: [
              {
                dir: "techn/elekt",
                label: {
                  en: "Department of Electrical and Information Engineering",
                  de: "Institut für Elektrotechnik und Informationstechnik"
                },
                children: [
                  {
                    dir: "techn/elekt/micro",
                    label: {
                      en: "Institute of Microelectronics",
                      de: "Institut für Mikroelektronik"
                    },
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/elekt/micro",
            lectures: [{ key: "Lecture.micro-1", id: "micro-1", title: { en: "Microelectronics Course" }, sourceUrl: { en: "https://example.test/micro-1" } }]
          }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations[0].children[0].children[0].text).toBe("Institute of Microelectronics");
    expect(organizations[0].children[0].children[0].route).toBe(
      "/institutions/engineering/electrical-and-information-engineering/microelectronics"
    );

    const nestedPage = await readFile(
      join(rootDir, "site", "docs", "institutions", "engineering", "electrical-and-information-engineering", "microelectronics.md"),
      "utf8"
    );
    expect(nestedPage).toContain("<InstitutionsBrowser />");
  });

  it("normalizes replacement-character separators in institution labels", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "zbw-1",
          slug: "zbw-course-zbw1",
          sourceUrl: "https://example.test/zbw-1",
          title: "ZBW Course",
          lecturers: [],
          sessions: [],
          searchText: "ZBW Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "wiso",
            label: {
              en: "Faculty of Business, Economics, and Social Sciences",
              de: "Wirtschafts- und Sozialwissenschaftliche Fakultät"
            },
            children: [
              {
                dir: "angegl/zbwdeu",
                label: {
                  en: "ZBW � Leibniz Information Centre for Economics",
                  de: "ZBW � Leibniz-Informationszentrum Wirtschaft"
                },
                children: []
              }
            ]
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "angegl/zbwdeu",
            lectures: [{ key: "Lecture.zbw-1", id: "zbw-1", title: { en: "ZBW Course" }, sourceUrl: { en: "https://example.test/zbw-1" } }]
          }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations[0].children[0].text).toBe("ZBW - Leibniz Information Centre for Economics");
    expect(organizations[0].children[0].textDe).toBe("ZBW - Leibniz-Informationszentrum Wirtschaft");

    const childPage = await readFile(
      join(
        rootDir,
        "site",
        "docs",
        "institutions",
        "business-economics-and-social-sciences",
        "zbw-leibniz-information-centre-for-economics.md"
      ),
      "utf8"
    );
    expect(childPage).toContain("# ZBW - Leibniz Information Centre for Economics");
  });

  it("drops child items whose label duplicates the parent institution label", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "dup-1",
          slug: "duplicate-course-dup1",
          sourceUrl: "https://example.test/dup-1",
          title: "Duplicate Course",
          lecturers: [],
          sessions: [],
          searchText: "Duplicate Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn",
            label: {
              en: "Faculty of Engineering",
              de: "Technische Fakultät"
            },
            children: [
              {
                dir: "techn/self",
                label: {
                  en: "Faculty of Engineering",
                  de: "Technische Fakultät"
                },
                children: []
              },
              {
                dir: "techn/infor",
                label: {
                  en: "Department of Computer Science",
                  de: "Institut für Informatik"
                },
                children: []
              }
            ]
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          {
            path: "techn/infor",
            lectures: [{ key: "Lecture.dup-1", id: "dup-1", title: { en: "Duplicate Course" }, sourceUrl: { en: "https://example.test/dup-1" } }]
          }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations[0].children).toHaveLength(1);
    expect(organizations[0].children[0].text).toBe("Department of Computer Science");
  });

  it("repairs common replacement-character mojibake in organization labels", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-institutions-routes-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "law-1",
          slug: "law-course-law1",
          sourceUrl: "https://example.test/law-1",
          title: "Law Course",
          lecturers: [],
          sessions: [],
          searchText: "Law Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-07T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "rechts",
            label: {
              en: "Faculty of Law",
              de: "Rechtswissenschaftliche Fakultät"
            },
            children: [
              {
                dir: "rechts/walthe",
                label: {
                  en: "Walther Sch�cking Institute for International Law",
                  de: "Walther-Sch�cking-Institut für Internationales Recht"
                },
                children: []
              },
              {
                dir: "rechts/zentru",
                label: {
                  en: "Zentrum f�r Gesundheitsrecht",
                  de: "Zentrum f�r Gesundheitsrecht"
                },
                children: []
              },
              {
                dir: "rechts/gesell",
                label: {
                  en: "Gesellschaft f�r Betriebswirtschaft zu Kiel e.V.",
                  de: "Gesellschaft f�r Betriebswirtschaft zu Kiel e.V."
                },
                children: []
              }
            ]
          }
        ]
      },
      undefined,
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-07T00:00:00.000Z",
        nodes: [
          { path: "rechts/walthe", lectures: [{ key: "Lecture.law-1", id: "law-1", title: { en: "Law Course" }, sourceUrl: { en: "https://example.test/law-1" } }] },
          { path: "rechts/zentru", lectures: [{ key: "Lecture.law-1", id: "law-1", title: { en: "Law Course" }, sourceUrl: { en: "https://example.test/law-1" } }] },
          { path: "rechts/gesell", lectures: [{ key: "Lecture.law-1", id: "law-1", title: { en: "Law Course" }, sourceUrl: { en: "https://example.test/law-1" } }] }
        ]
      }
    );

    const organizations = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    expect(organizations[0].children[0].text).toBe("Walther Schöcking Institute for International Law");
    expect(organizations[0].children[1].text).toBe("Zentrum für Gesundheitsrecht");
    expect(organizations[0].children[2].text).toBe("Gesellschaft für Betriebswirtschaft zu Kiel e.V.");
  });

  it("prunes empty lecture and institution branches recursively when no lectures survive", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-prune-empty-branches-"));
    await generateBuildArtifacts(
      rootDir,
      [],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn",
            label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
            children: [
              {
                dir: "techn/infor",
                label: { en: "Department of Computer Science", de: "Institut für Informatik" },
                children: [
                  {
                    dir: "techn/infor/empty",
                    label: { en: "Empty Lab", de: "Leeres Labor" },
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: [
          {
            path: "techn",
            label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
            sourceUrl: { en: "https://example.test/techn" },
            treeUrl: { en: "https://example.test/tree/techn" },
            children: [
              {
                path: "techn/empty",
                label: { en: "Empty Branch", de: "Leerer Zweig" },
                sourceUrl: { en: "https://example.test/techn/empty" },
                treeUrl: { en: "https://example.test/tree/techn/empty" },
                children: []
              }
            ]
          }
        ]
      }
    );

    const lecturesBrowser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    const institutions = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));

    expect(lecturesBrowser.roots).toEqual([]);
    expect(institutions).toEqual([]);
  });

  it("keeps only explicitly english courses in english outputs while german outputs keep all courses", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-language-filter-"));
    await generateBuildArtifacts(
      rootDir,
      [
        {
          id: "en-1",
          slug: "english-course-en1",
          sourceUrl: "https://example.test/course/en-1",
          title: "English Course",
          lecturers: [],
          sessions: [],
          searchText: "English Course",
          language: "english",
          languageConfidence: "high",
          languageEvidence: ["english"],
          lastSeen: "2026-03-08T00:00:00.000Z"
        },
        {
          id: "de-1",
          slug: "german-course-de1",
          sourceUrl: "https://example.test/course/de-1",
          title: "German Course",
          lecturers: [],
          sessions: [],
          searchText: "German Course",
          language: "german",
          languageConfidence: "high",
          languageEvidence: ["german"],
          lastSeen: "2026-03-08T00:00:00.000Z"
        },
        {
          id: "unknown-1",
          slug: "unknown-course-unknown1",
          sourceUrl: "https://example.test/course/unknown-1",
          title: "Unknown Course",
          lecturers: [],
          sessions: [],
          searchText: "Unknown Course",
          language: "unknown",
          languageConfidence: "low",
          languageEvidence: [],
          lastSeen: "2026-03-08T00:00:00.000Z"
        }
      ],
      [],
      {
        dir: "",
        children: [
          {
            dir: "techn",
            label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
            children: []
          }
        ]
      },
      {
        path: "",
        label: { en: "Lecture Directory", de: "Vorlesungsverzeichnis" },
        children: [
          {
            path: "techn",
            label: { en: "Faculty of Engineering", de: "Technische Fakultät" },
            sourceUrl: { en: "https://example.test/techn" },
            treeUrl: { en: "https://example.test/tree/techn" },
            children: []
          }
        ]
      },
      {
        semester: "2025w",
        kind: "lecture",
        generatedAt: "2026-03-08T00:00:00.000Z",
        nodes: [
          {
            path: "techn",
            lectures: [
              { key: "Lecture.en-1", id: "en-1", title: { en: "English Course" }, sourceUrl: { en: "https://example.test/course/en-1" } },
              { key: "Lecture.de-1", id: "de-1", title: { en: "German Course" }, sourceUrl: { en: "https://example.test/course/de-1" } },
              { key: "Lecture.unknown-1", id: "unknown-1", title: { en: "Unknown Course" }, sourceUrl: { en: "https://example.test/course/unknown-1" } }
            ]
          }
        ]
      },
      {
        semester: "2025w",
        kind: "tlecture",
        generatedAt: "2026-03-08T00:00:00.000Z",
        nodes: [
          {
            path: "techn",
            lectures: [
              { key: "Lecture.en-1", id: "en-1", title: { en: "English Course" }, sourceUrl: { en: "https://example.test/course/en-1" } },
              { key: "Lecture.de-1", id: "de-1", title: { en: "German Course" }, sourceUrl: { en: "https://example.test/course/de-1" } },
              { key: "Lecture.unknown-1", id: "unknown-1", title: { en: "Unknown Course" }, sourceUrl: { en: "https://example.test/course/unknown-1" } }
            ]
          }
        ]
      }
    );

    const lecturesBrowser = JSON.parse(await readFile(join(rootDir, "data", "build", "lectures-browser.json"), "utf8"));
    const institutions = JSON.parse(await readFile(join(rootDir, "data", "build", "institutions-organizations.json"), "utf8"));
    const englishLecturePage = await readFile(join(rootDir, "site", "docs", "lectures", "engineering", "index.md"), "utf8");
    const germanLecturePage = await readFile(join(rootDir, "site", "docs", "de", "lectures", "engineering", "index.md"), "utf8");

    expect(lecturesBrowser.roots[0].lectures.map((lecture: { id: string }) => lecture.id)).toEqual(["en-1"]);
    expect(institutions[0].lectures.map((lecture: { id: string }) => lecture.id)).toEqual(["en-1"]);
    await expect(readFile(join(rootDir, "site", "docs", "lectures", "engineering", "english-course-en1.md"), "utf8")).resolves.toContain(
      "English Course"
    );
    await expect(readFile(join(rootDir, "site", "docs", "lectures", "engineering", "german-course-de1.md"), "utf8")).rejects.toThrow();
    await expect(readFile(join(rootDir, "site", "docs", "lectures", "engineering", "unknown-course-unknown1.md"), "utf8")).rejects.toThrow();
    await expect(readFile(join(rootDir, "site", "docs", "de", "lectures", "engineering", "english-course-en1.md"), "utf8")).resolves.toContain(
      "English Course"
    );
    await expect(readFile(join(rootDir, "site", "docs", "de", "lectures", "engineering", "german-course-de1.md"), "utf8")).resolves.toContain(
      "German Course"
    );
    await expect(readFile(join(rootDir, "site", "docs", "de", "lectures", "engineering", "unknown-course-unknown1.md"), "utf8")).resolves.toContain(
      "Unknown Course"
    );
    expect(englishLecturePage).toContain("Choose a lecture from the sidebar");
    expect(germanLecturePage).toContain("Wählen Sie eine Lehrveranstaltung in der Seitenleiste aus.");
  });
});
