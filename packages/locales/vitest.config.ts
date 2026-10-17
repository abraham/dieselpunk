import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const engines = ['chromium', 'firefox', 'webkit'] as const;
type Engine = (typeof engines)[number];

// Local runs use Chromium only. CI runs one job per engine, each setting PUNK_BROWSERS.
function selectedEngines(): Engine[] {
  const requested = process.env['PUNK_BROWSERS'];
  if (!requested) return ['chromium'];
  const names = requested.split(',').map((name) => name.trim());
  const unknown = names.filter((name) => !engines.includes(name as Engine));
  if (unknown.length > 0) {
    throw new Error(`PUNK_BROWSERS has unknown engines: ${unknown.join(', ')}`);
  }
  return names as Engine[];
}

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
  // Pre-bundling these up front avoids a mid-run reload that loads Lit twice on a cold cache.
  optimizeDeps: {
    include: [
      'axe-core',
      'lit',
      'lit/decorators.js',
      'lit/directives/class-map.js',
      'lit/directives/if-defined.js',
    ],
  },
  test: {
    include: ['test/browser/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedEngines().map((browser) => ({ browser })),
    },
  },
});
