/** Every size entry needs a stated reason for its limit, and a reason needs an entry (specs/performance.md §2). */
export function checkReasons(names: string[], reasons: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const name of names) {
    if (!reasons[name]?.trim()) problems.push(`"${name}" has no reason for its limit`);
  }
  for (const name of Object.keys(reasons)) {
    if (!names.includes(name)) problems.push(`"${name}" has a reason but no size entry`);
  }
  return problems;
}
