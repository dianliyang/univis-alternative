import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLecturerPage } from "../../src/parsers/lecturer.js";

describe("lecturer parser", () => {
  it("extracts stable lecturer fields", async () => {
    const html = await readFile(join(process.cwd(), "tests", "fixtures", "lecturers", "lecturer.html"), "utf8");
    const lecturer = parseLecturerPage("https://univis.uni-kiel.de/form?dsc=person&id=1", html);

    expect(lecturer.name).toBe("Dr. Jane Doe");
    expect(lecturer.email).toBe("jane.doe@uni-kiel.de");
    expect(lecturer.phone).toContain("+49");
  });
});
