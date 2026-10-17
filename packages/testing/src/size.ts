import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

/**
 * Reads a package's .size-limit.json and .size-limit.reasons.json, and exits on a difference. The
 * reasons are in a file of their own because size-limit rejects a key it does not know.
 */
export function checkSizeReasons(packageDir: string): void {
  const read = (file: string) =>
    JSON.parse(readFileSync(join(packageDir, file), 'utf8')) as unknown;
  const entries = read('.size-limit.json') as { name: string }[];
  const reasons = read('.size-limit.reasons.json') as Record<string, string>;
  const problems = checkReasons(
    entries.map((entry) => entry.name),
    reasons,
  );
  if (problems.length > 0) {
    console.error(
      `The size limits and their reasons differ:\n${problems.map((p) => `  ${p}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`Size reasons OK: ${entries.length} entries`);
}
