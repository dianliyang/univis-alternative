import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDirectoryPage } from "../../src/parsers/directory.js";

describe("directory parser", () => {
  it("extracts direct child nodes from a faculty tlecture page", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "classification", "faculty-directory.html"), "utf8");
    const directory = parseDirectoryPage(
      "https://univis.uni-kiel.de/form?__s=2&dsc=anew/tlecture&tdir=mathe&anonymous=1&lang=en&ref=tlecture&sem=2025w&__e=519",
      html
    );

    expect(directory?.label).toBe("Faculty of Mathematics and Natural Sciences");
    expect(directory?.path).toBe("mathe");
    expect(directory?.depth).toBe(1);
    expect(directory?.semester).toBe("2025w");
    expect(directory?.children).toHaveLength(2);
    expect(directory?.children[0]?.label).toBe("Mathematics");
    expect(directory?.children[0]?.path).toBe("mathe/mathem");
  });

  it("extracts direct program links from a department tlecture page", () => {
    const html = `
      <html>
        <body>
          <h2>Mathematics</h2>
          <ul>
            <li><a href="form?dsc=anew/tlecture&amp;tdir=mathe/mathem/1fachb&amp;sem=2025w&amp;lang=en">One-subject Bachelor's Programme</a></li>
            <li><a href="form?dsc=anew/tlecture&amp;tdir=mathe/mathem/lehramt&amp;sem=2025w&amp;lang=en">Teacher Training</a></li>
            <li><a href="form?dsc=anew/tlecture&amp;tdir=mathe/physik&amp;sem=2025w&amp;lang=en">Physics</a></li>
            <li><a href="form?dsc=anew/lecture_view&amp;lvs=1&amp;sem=2025w">Analysis I</a></li>
          </ul>
        </body>
      </html>
    `;

    const directory = parseDirectoryPage("https://univis.uni-kiel.de/form?dsc=anew/tlecture&tdir=mathe/mathem&sem=2025w&lang=en", html);

    expect(directory?.label).toBe("Mathematics");
    expect(directory?.path).toBe("mathe/mathem");
    expect(directory?.children).toHaveLength(2);
    expect(directory?.children.map((child) => child.path)).toEqual(["mathe/mathem/1fachb", "mathe/mathem/lehramt"]);
  });

  it("falls back from raw path codes when a tlecture label is just the internal key", () => {
    const html = `
      <html>
        <body>
          <h2>Vorlesungsverzeichnis</h2>
          <ul>
            <li><a href="form?dsc=anew/tlecture&amp;tdir=medizi&amp;sem=2025w">medizi</a></li>
            <li><a href="form?dsc=anew/tlecture&amp;tdir=_frhre&amp;sem=2025w">Lehrangebot f�r H�rer/-innen aller Fakult�ten</a></li>
          </ul>
        </body>
      </html>
    `;

    const directory = parseDirectoryPage("https://univis.uni-kiel.de/form?dsc=anew/tlecture&sem=2025w", html);

    expect(directory?.label).toBe("Vorlesungsverzeichnis");
    expect(directory?.children[0]?.label).toBe("Faculty of Medicine");
    expect(directory?.children[1]?.label).toBe("Lehrangebot f�r H�rer/-innen aller Fakult�ten");
  });
});
