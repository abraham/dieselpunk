import type { XliffUnit } from '@dieselpunk/testing/xliff';

/** A message id that `lit-localize` made from a hash, because `msg()` was given no `id`. */
const HASHED_ID = /^[sh][0-9a-f]{16}$/;

/** What is wrong with the messages themselves: an id left to the hash, or no description. */
export function messageProblems(units: XliffUnit[]): string[] {
  const problems: string[] = [];
  for (const unit of units) {
    if (HASHED_ID.test(unit.id)) {
      problems.push(`${unit.id}: has no explicit id (give msg() an \`id\`)`);
    }
    if (!unit.note) problems.push(`${unit.id}: has no description (give msg() a \`desc\`)`);
  }
  return problems;
}
