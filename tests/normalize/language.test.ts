import { describe, expect, it } from "vitest";
import { detectCourseLanguage } from "../../src/normalize/language.js";

describe("language detection", () => {
  it("classifies explicit english courses", () => {
    expect(detectCourseLanguage({ languageText: "English" }).language).toBe("english");
  });

  it("classifies german-only courses", () => {
    expect(detectCourseLanguage({ description: "Die Veranstaltung findet auf Deutsch statt." }).language).toBe("german");
  });

  it("classifies bilingual courses", () => {
    expect(detectCourseLanguage({ languageText: "Deutsch / English" }).language).toBe("bilingual");
  });

  it("does not classify generic english-looking titles without explicit evidence", () => {
    const result = detectCourseLanguage({ title: "Cancer Modeling and Evolution" });
    expect(result.language).toBe("unknown");
  });
});
