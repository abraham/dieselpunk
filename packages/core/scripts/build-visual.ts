import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Bundles the visual matrix page into static files. This runs on the host or CI runner, never in the
// Playwright container, because esbuild's binary is platform-specific.

const packageDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${packageDir}test-results/visual-site`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [`${packageDir}test/visual/matrix.ts`],
  bundle: true,
  format: 'esm',
  outdir: outDir,
  logLevel: 'warning',
  // Tests run without a built dist/, so `#dev` resolves to the source flag, as in vitest.config.ts.
  alias: { '#dev': `${packageDir}src/utilities/dev.ts` },
  // The package's `sideEffects` describes dist/, so bundling src/ must not drop the register imports.
  ignoreAnnotations: true,
  loader: { '.woff': 'file', '.woff2': 'file' },
  assetNames: 'assets/[name]-[hash]',
});
cpSync(`${packageDir}test/visual/matrix.html`, `${outDir}/matrix.html`);
console.log(`Visual matrix built to ${outDir}`);
