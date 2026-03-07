import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeXmlLectureMarkdown } from "../../src/generator/xml-markdown.js";

describe("XML markdown generator", () => {
  it("writes one markdown file per lecture", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-xml-md-"));
    await writeXmlLectureMarkdown(
      rootDir,
      [
        {
          key: "Lecture.techn.infor.inform.softwa.infess",
          lecturePath: "techn/infor/inform/softwa/infess",
          id: "41780504",
        title: "infESSS-02a: Engineering Secure Software Systems",
        short: "infESSS-02a",
        number: "080022",
        semester: "2025w",
        language: "english_taught",
        classificationKey: "Title.techn.infora.master.theore",
        classificationPath: "techn/infora/master/theore",
        orgName: "Software Engineering",
        orgUnits: ["Technische Fakultät", "Institut für Informatik"],
        lecturerKeys: ["Person.techn.infor.inform.softwa.schnoo_5"],
        terms: [{ starttime: "14:15", endtime: "15:45", repeat: "w1 1", roomKey: "Room.example" }],
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/softwa/infess&sem=2025w&lang=en",
        rawXml: "<Lecture />",
          extraFields: {
            ects_cred: ["6"],
            sws: ["3"]
          }
        }
      ],
      new Map([
        [
          "Lecture.techn.infor.inform.softwa.infess",
          {
            title: "infESSS-02a: Engineering Secure Software Systems",
            lecturers: ["Prof. Dr. Example"],
            sections: [
              {
                heading: "Contents",
                content: "Intro\nAdvanced topics"
              }
            ],
            assignedLectures: [],
            department: {
              label: "Software Engineering",
              sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn/infor/inform/softwa"
            }
          }
        ]
      ])
    );

    const index = await readFile(join(rootDir, "site", "docs", "courses", "xml-import", "index.md"), "utf8");
    const filesDir = join(rootDir, "site", "docs", "courses", "xml-import");
    expect(index).toContain("1 XML-imported lecture");

    const courseFileName = (await readdir(filesDir)).find((entry) => entry !== "index.md");
    expect(courseFileName).toBeTruthy();
    const courseFile = await readFile(join(filesDir, courseFileName!), "utf8");
    expect(courseFile).toContain("# infESSS-02a: Engineering Secure Software Systems");
    expect(courseFile).toContain("english_taught");
    expect(courseFile).toContain("techn/infora/master/theore");
    expect(courseFile).toContain("ects_cred");
    expect(courseFile).toContain("## Contents");
    expect(courseFile).toContain("## Department");
  });

  it("avoids filename collisions for bounded slugs", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "univis-xml-md-"));
    const longTitle = "A".repeat(140);

    await writeXmlLectureMarkdown(rootDir, [
      {
        key: "Lecture.one",
        lecturePath: "a/b/c",
        id: "1",
        title: longTitle,
        semester: "2025w",
        language: "non_english_taught",
        orgUnits: [],
        lecturerKeys: [],
        terms: [],
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=a/b/c&sem=2025w&lang=en",
        rawXml: "<Lecture />",
        slug: `${"a".repeat(88)}-1`,
        extraFields: {}
      },
      {
        key: "Lecture.two",
        lecturePath: "a/b/d",
        id: "2",
        title: longTitle,
        semester: "2025w",
        language: "non_english_taught",
        orgUnits: [],
        lecturerKeys: [],
        terms: [],
        sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=a/b/d&sem=2025w&lang=en",
        rawXml: "<Lecture />",
        slug: `${"a".repeat(88)}-1`,
        extraFields: {}
      }
    ]);

    const entries = (await readdir(join(rootDir, "site", "docs", "courses", "xml-import"))).filter((entry) => entry !== "index.md");
    expect(entries).toHaveLength(2);
    expect(new Set(entries).size).toBe(2);
  });
});
