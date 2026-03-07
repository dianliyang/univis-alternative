import { describe, expect, it } from "vitest";
import config from "../../site/.vitepress/config.js";

describe("site config", () => {
  it("defines the main browse routes", () => {
    expect(config.title).toBe("UnivIS Kiel Catalog");
    expect(config.themeConfig?.nav?.some((item) => "link" in item && item.link === "/courses/")).toBe(true);
  });
});
