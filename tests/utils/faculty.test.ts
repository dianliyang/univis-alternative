import { describe, expect, it } from "vitest";
import { deriveFacultyFromSourceUrl } from "../../src/utils/faculty.js";

describe("faculty derivation", () => {
  it("maps known tdir faculty codes to readable labels", () => {
    expect(
      deriveFacultyFromSourceUrl(
        "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=x&sem=2026s&tdir=medizi&ref=tlecture"
      )
    ).toEqual({
      code: "medizi",
      label: "Medicine"
    });
  });

  it("falls back to lvs top-level code when tdir is absent", () => {
    expect(
      deriveFacultyFromSourceUrl(
        "https://univis.uni-kiel.de/form?dsc=anew/lecture_view&lvs=philos/german/deutsc_5/landes&sem=2026s"
      )
    ).toEqual({
      code: "philos",
      label: "Humanities"
    });
  });
});
