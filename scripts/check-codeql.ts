import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { severeResults } from '@dieselpunk/testing/sarif';
import type { Sarif } from '@dieselpunk/testing/sarif';

// Fails on a high or critical result in the SARIF files CodeQL wrote to <dir>
// (specs/security.md §6.1). CI runs it after the analysis of a pull request.
//   node scripts/check-codeql.ts <dir>

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/check-codeql.ts <dir>');
  process.exit(2);
}

const files = readdirSync(dir).filter((file) => file.endsWith('.sarif'));
if (files.length === 0) {
  console.error(`No SARIF files in ${dir}, so CodeQL wrote no analysis to check.`);
  process.exit(1);
}

const found = files.flatMap((file) =>
  severeResults(JSON.parse(readFileSync(join(dir, file), 'utf8')) as Sarif).map(
    (result) => `${file}: ${result}`,
  ),
);
if (found.length > 0) {
  console.error(
    `CodeQL found high or critical results:\n${found.map((result) => `  - ${result}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(`CodeQL OK: no high or critical results in ${files.join(', ')}`);
