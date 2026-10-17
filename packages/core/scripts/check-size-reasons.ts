import { readFileSync } from 'node:fs';
import { checkReasons } from './size-reasons.ts';

// Run from a package folder: reads its .size-limit.json and .size-limit.reasons.json. The reasons are
// in a file of their own because size-limit rejects a key it does not know.
const entries = JSON.parse(readFileSync('.size-limit.json', 'utf8')) as { name: string }[];
const reasons = JSON.parse(readFileSync('.size-limit.reasons.json', 'utf8')) as Record<
  string,
  string
>;
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
