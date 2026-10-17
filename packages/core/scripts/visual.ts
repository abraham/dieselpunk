import { fileURLToPath } from 'node:url';
import { runVisual } from '@dieselpunk/testing/visual';
import { buildMatrix } from './build-visual.ts';

// Runs the visual tests on the Linux image that baselines come from (specs/testing.md §6).
//   node scripts/visual.ts check      compare against the committed baselines
//   node scripts/visual.ts update     rewrite the baselines (CI only)
//   node scripts/visual.ts selftest   render twice into a scratch folder and require identical output

const mode = process.argv[2];
if (mode !== 'check' && mode !== 'update' && mode !== 'selftest') {
  console.error('Usage: node scripts/visual.ts <check|update|selftest> [playwright arguments]');
  process.exit(2);
}

const packageDir = fileURLToPath(new URL('..', import.meta.url));
process.exit(
  await runVisual(mode, {
    packageDir,
    repoDir: fileURLToPath(new URL('../../..', import.meta.url)),
    baselinesDir: `${packageDir}test/visual/__screenshots__`,
    buildPage: buildMatrix,
    extra: process.argv.slice(3),
  }),
);
