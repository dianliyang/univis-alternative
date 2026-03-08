export function shouldFetchTerminalMembership(childCount: number, depth: number, maxDepth: number): boolean {
  if (Number.isFinite(maxDepth) && depth >= maxDepth) {
    return true;
  }

  return childCount === 0;
}
