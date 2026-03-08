import { describe, expect, it } from "vitest";
import { boundedSlug, canonicalizeUrl, slugify } from "../../src/utils/url.js";

describe("URL utilities", () => {
  describe("canonicalizeUrl", () => {
    it("drops contextual ref and tdir params for lecture_view pages", () => {
      expect(
        canonicalizeUrl(
          "https://univis.uni-kiel.de/form?__s=2&dsc=anew/lecture_view&lvs=x&anonymous=1&ref=tlecture&sem=2025w&tdir=medizi/medica&__e=519"
        )
      ).toBe("https://univis.uni-kiel.de/form?dsc=anew%2Flecture_view&lvs=x&sem=2025w");
    });
  });

  describe("slugify", () => {
    it("handles special characters and spaces", () => {
      expect(slugify("Hello World!")).toBe("hello-world");
      expect(slugify("Umlaut: äöüß")).toBe("umlaut-aou");
    });
  });

  describe("boundedSlug", () => {
    it("limits slug length and appends hash when truncated", () => {
      const longValue = "this is a very long string that will definitely exceed the maximum length of eighty-eight characters";
      const result = boundedSlug(longValue, 20);

      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toMatch(/^[\w-]+-[a-f0-9]{6}$/);
      expect(result).toBe("this-is-a-ver-d93b73");
    });

    it("does not truncate if within limit", () => {
      expect(boundedSlug("short", 20)).toBe("short");
    });

    it("returns 'id' for empty slug inputs", () => {
      expect(boundedSlug("", 20)).toBe("id");
    });
  });
});
