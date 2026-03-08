import { describe, expect, it } from "vitest";
import { shouldFetchTerminalMembership } from "../../src/utils/tree-refresh.js";

describe("shouldFetchTerminalMembership", () => {
  it("fetches membership for leaf nodes", () => {
    expect(shouldFetchTerminalMembership(0, 3, Number.POSITIVE_INFINITY)).toBe(true);
  });

  it("does not fetch membership for non-leaf nodes before the depth cutoff", () => {
    expect(shouldFetchTerminalMembership(2, 2, Number.POSITIVE_INFINITY)).toBe(false);
    expect(shouldFetchTerminalMembership(2, 2, 4)).toBe(false);
  });

  it("fetches membership when the configured max depth is reached", () => {
    expect(shouldFetchTerminalMembership(3, 4, 4)).toBe(true);
  });
});
