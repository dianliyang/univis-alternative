export function getRecentSemesterCodes(referenceDate = new Date()): string[] {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + 1;
  const current = month >= 4 && month <= 9 ? `${year}s` : month >= 10 ? `${year}w` : `${year}s`;
  const semesters = [current];

  while (semesters.length < 5) {
    const previous = previousSemesterCode(semesters[semesters.length - 1]!);
    semesters.push(previous);
  }

  return semesters;
}

export function previousSemesterCode(code: string): string {
  const year = Number(code.slice(0, 4));
  const term = code.slice(4);
  return term === "s" ? `${year - 1}w` : `${year}s`;
}

export function isRecentSemesterCode(code: string, recent: Set<string>): boolean {
  return !code || recent.has(code);
}

export function compareSemesterCodes(left: string, right: string): number {
  const leftYear = Number(left.slice(0, 4));
  const rightYear = Number(right.slice(0, 4));
  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  const leftTerm = left.slice(4);
  const rightTerm = right.slice(4);
  const rank = (term: string): number => (term === "s" ? 1 : term === "w" ? 0 : -1);
  return rank(leftTerm) - rank(rightTerm);
}
