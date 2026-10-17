import { fileURLToPath } from 'node:url';
import { bundlePage } from '@dieselpunk/testing/visual';

// Bundles the visual matrix page into test-results/visual-site/, on the host or CI runner.

const packageDir = fileURLToPath(new URL('..', import.meta.url));

export const buildMatrix = () =>
  bundlePage({
    entry: `${packageDir}test/visual/matrix.ts`,
    html: `${packageDir}test/visual/matrix.html`,
    outDir: `${packageDir}test-results/visual-site`,
    // Tests run without a built dist/, so `#dev` resolves to the source flag, as in vitest.config.ts.
    alias: { '#dev': `${packageDir}src/utilities/dev.ts` },
  });

if (import.meta.main) {
  await buildMatrix();
  console.log(`Visual matrix built to ${packageDir}test-results/visual-site`);
}
