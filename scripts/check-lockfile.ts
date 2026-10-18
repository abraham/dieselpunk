import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkLockfile } from '@dieselpunk/testing/lockfile';
import type { Lockfile } from '@dieselpunk/testing/lockfile';

// What the lockfile installs, and the registry's signatures of what is installed
// (specs/security.md §5.2, §5.3). Run after `npm ci`.

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => JSON.parse(readFileSync(`${root}${file}`, 'utf8')) as unknown;

const problems = checkLockfile(
  read('package-lock.json') as Lockfile,
  read('.install-scripts.json') as Record<string, string>,
);

const signatures = spawnSync('npm', ['audit', 'signatures'], { cwd: root, encoding: 'utf8' });
if (signatures.status !== 0) {
  problems.push(`npm audit signatures failed:\n${signatures.stdout}${signatures.stderr}`.trim());
}

if (problems.length > 0) {
  console.error(
    `Lockfile check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
  );
  process.exit(1);
}
console.log(
  'Lockfile OK: every package from the registry with integrity, install scripts listed, signatures verified',
);
