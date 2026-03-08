import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLectureExportXml } from "../../src/parsers/lecture-xml.js";

describe("lecture XML parser", () => {
  it("extracts lecture records and ignores non-lecture entries", async () => {
    const xml = await readFile(join(process.cwd(), "tests", "fixtures", "xml", "lecture-export.xml"), "utf8");
    const lectures = parseLectureExportXml(xml);

    expect(lectures).toHaveLength(2);
    expect(lectures[0]).toMatchObject({
      key: "Lecture.techn.infor.inform.softwa.infess",
      id: "41780504",
      title: "infESSS-02a: Engineering Secure Software Systems",
      language: "english_taught",
      classificationKey: "Title.techn.infora.master.theore",
      classificationPath: "techn/infora/master/theore",
      orgName: "Software Engineering",
      orgUnits: ["Technische Fakultät", "Institut für Informatik", "Arbeitsgruppen", "Software Engineering"],
      lecturerKeys: ["Person.techn.infor.inform.softwa.schnoo_5"]
    });
    expect(lectures[0]?.terms[0]).toMatchObject({
      starttime: "14:15",
      endtime: "15:45",
      repeat: "w1 1",
      roomKey: "Room.zentra_1.servic.ressou.gebude.dezern_1.refera.ame"
    });
    expect(lectures[0]?.extraFields.ects_cred).toEqual(["6"]);
    expect(lectures[1]?.language).toBe("non_english_taught");
  });

  it("builds lecture detail URLs in the language of the fetched XML export", async () => {
    const xml = await readFile(join(process.cwd(), "tests", "fixtures", "xml", "lecture-export.xml"), "utf8");
    const lectures = parseLectureExportXml(xml, { detailLang: "de" });

    expect(lectures[0]?.sourceUrl).toContain("lang=de");
    expect(lectures[0]?.sourceUrl).toContain("dsc=anew%2Flecture_view");
  });
});
