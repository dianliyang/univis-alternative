import { describe, expect, it } from "vitest";
import { getRecentSemesterCodes, isRecentSemesterCode } from "../../src/utils/semester.js";

describe("recent semester scope", () => {
  it("defaults to a single semester from March 7, 2026", () => {
    expect(getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"))).toEqual(["2026s"]);
  });

  it("can build the last two academic years from March 7, 2026 if requested", () => {
    expect(getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"), 5)).toEqual([
      "2026s",
      "2025w",
      "2025s",
      "2024w",
      "2024s"
    ]);
  });

  it("filters out semester codes outside the window", () => {
    const recent = new Set(getRecentSemesterCodes(new Date("2026-03-07T00:00:00Z"), 2));
    expect(isRecentSemesterCode("2025w", recent)).toBe(true);
    expect(isRecentSemesterCode("2025s", recent)).toBe(false);
  });
});
