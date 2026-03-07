import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLectureDetailPage } from "../../src/parsers/lecture-detail.js";

describe("lecture detail parser", () => {
  it("extracts lecturers, sections, assigned lectures, and department link", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "html", "lecture-detail.html"), "utf8");
    const detail = parseLectureDetailPage(
      "https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture_view&lvs=techn/infor/inform/theore/_infin_8&anonymous=1&lang=en&sem=2025w&tdir=techn/infora/master&__e=519",
      html
    );

    expect(detail.title).toContain("Introduction to Cryptography");
    expect(detail.lecturers).toEqual(["Prof. Dr. Thomas Wilke"]);
    expect(detail.sections.find((section) => section.heading === "Prerequisites / Organisational information")?.content).toContain(
      "Please find all the necessary information at Moodle."
    );
    expect(detail.assignedLectures[0]).toMatchObject({
      label: "UE",
      title: "Exercise: Introduction to Cryptography",
      number: "080043",
      detailUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=techn/infor/inform/theore/_exerc_8"
    });
    expect(detail.department).toMatchObject({
      label: "Theoretical Computer Science",
      sourceUrl: "https://univis.uni-kiel.de/form?dsc=anew/lecture&dir=techn/infor/inform/theore"
    });
  });
});
