import { describe, expect, it } from "vitest";
import { canonicalAllowedUrl, evaluateCrawlUrl } from "../../src/crawl/policy.js";
import { canonicalizeUrl } from "../../src/utils/url.js";

describe("crawl policy", () => {
  it("blocks /prg URLs", () => {
    expect(evaluateCrawlUrl("https://univis.uni-kiel.de/prg?foo=bar")).toEqual({
      allowed: false,
      reason: "blocked-path"
    });
  });

  it("allows public form URLs", () => {
    expect(canonicalAllowedUrl("https://univis.uni-kiel.de/form?dsc=anew/main&__e=519&sem=2025w")).toBe(
      "https://univis.uni-kiel.de/form?dsc=anew%2Fmain&sem=2025w"
    );
  });

  it("drops transient query parameters during canonicalization", () => {
    expect(canonicalizeUrl("https://univis.uni-kiel.de/form?sem=2025w&__s=2&dsc=anew/main&__e=519")).toBe(
      "https://univis.uni-kiel.de/form?dsc=anew%2Fmain&sem=2025w"
    );
  });
});
