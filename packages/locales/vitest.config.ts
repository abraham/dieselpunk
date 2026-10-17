import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { browserRun, preBundled, selectedEngines } from '@dieselpunk/testing/vitest';

// The locales test renders core's gallery, so a CI part runs it for the part's groups.
const run = browserRun(
  fileURLToPath(new URL('.', import.meta.url)),
  ['test/browser/**/*.test.ts'],
  ['test/browser/apply.test.ts'],
);

export default defineConfig({
  // The tests use core's sources and its gallery, which resolve `#dev` through core's own package.
  resolve: {
    alias: [
      {
        find: /^#dev$/,
        replacement: fileURLToPath(new URL('../core/src/utilities/dev.dev.ts', import.meta.url)),
      },
    ],
  },
  optimizeDeps: { include: preBundled },
  test: {
    include: run.include,
    provide: run.provide,
    passWithNoTests: run.passWithNoTests,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedEngines().map((browser) => ({ browser })),
    },
  },
});
