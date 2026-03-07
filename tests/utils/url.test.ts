import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "../../src/utils/url.js";

describe("URL canonicalization", () => {
  it("drops contextual ref and tdir params for lecture_view pages", () => {
    expect(
      canonicalizeUrl(
        "https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture_view&lvs=x&anonymous=1&ref=tlecture&sem=2025w&tdir=medizi/medica&__e=519"
      )
    ).toBe("https://univis.uni-kiel.de/form?dsc=anew%2Flecture_view&lvs=x&sem=2025w");
  });
});
