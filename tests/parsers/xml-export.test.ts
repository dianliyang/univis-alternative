import { describe, expect, it } from "vitest";
import { extractNodeXmlExportUrl, parseXmlExportPage } from "../../src/parsers/xml-export.js";

describe("xml export parser", () => {
  it("extracts the tlecture XML export link from a lecture tree page", () => {
    const html = `
      <html>
        <body>
          <a href="form?__s=2&amp;dsc=anew/xml&amp;db=Lecture&amp;keys=techn/infor/inform/softwa/infess,/infess_3&amp;anonymous=1&amp;lang=en&amp;ref=tlecture&amp;sem=2025w&amp;tdir=techn/infora/master/theore&amp;__e=519">
            export to XML
          </a>
        </body>
      </html>
    `;

    const exportUrl = extractNodeXmlExportUrl(
      "https://univis.uni-kiel.de/form?__s=2&dsc=anew/tlecture&tdir=techn/infora/master/theore&anonymous=1&lang=en&ref=tlecture&sem=2025w&__e=519",
      html
    );

    expect(exportUrl).toBeTruthy();
    const parsed = new URL(exportUrl!);
    expect(parsed.searchParams.get("dsc")).toBe("anew/xml");
    expect(parsed.searchParams.get("db")).toBe("Lecture");
    expect(parsed.searchParams.get("keys")).toBe("techn/infor/inform/softwa/infess,/infess_3");
    expect(parsed.searchParams.get("tdir")).toBe("techn/infora/master/theore");
    expect(parsed.searchParams.get("ref")).toBe("tlecture");
  });

  it("extracts the lecture XML export form payload from the export page", () => {
    const html = `
      <html>
        <body>
          <form action="/form" method="post">
            <input type="hidden" name="__s" value="1">
            <input type="hidden" name="dsc" value="anew/unihd">
            <input type="hidden" name="donedef" value="1">
            <input type="hidden" name="submitimg-Search" value="noise">
            <input type="hidden" name="dir" value="techn/infor/inform/zuverl">
            <input type="hidden" name="lang" value="en">
            <input type="hidden" name="sem" value="2025w">
            <input type="hidden" name="anonymous" value="1">
            <input type="hidden" name="db" value="Lecture">
            <input type="hidden" name="keys" value="techn/infor/inform/zuverl/infcom,/bungin">
            <input type="hidden" name="ref" value="lecture">
            <input type="hidden" name="__e" value="519">
            <input type="submit" name="done-anew/xml:doit" value="to XML">
          </form>
        </body>
      </html>
    `;

    expect(parseXmlExportPage("https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture:xml", html)).toEqual({
      actionUrl: "https://univis.uni-kiel.de/form",
      formData: {
        __s: "1",
        dsc: "anew/unihd",
        donedef: "1",
        dir: "techn/infor/inform/zuverl",
        lang: "en",
        sem: "2025w",
        anonymous: "1",
        db: "Lecture",
        keys: "techn/infor/inform/zuverl/infcom,/bungin",
        ref: "lecture",
        __e: "519",
        level: "1",
        option: "orgname",
        "done-anew/xml:doit": "to XML"
      }
    });
  });
});
