import { fileURLToPath } from 'node:url';
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const engines = ['chromium', 'firefox', 'webkit'] as const;
type Engine = (typeof engines)[number];

// Local runs use Chromium only. CI sets PUNK_BROWSERS to all three engines explicitly.
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

// Tests run in an iframe, and Playwright's page-level emulation applies to it.
const setColorScheme = defineBrowserCommand<[scheme: 'light' | 'dark' | null]>(
  async (context, scheme) => {
    await context.page.emulateMedia({ colorScheme: scheme });
  },
);

const setForcedColors = defineBrowserCommand<[mode: 'active' | null]>(async (context, mode) => {
  await context.page.emulateMedia({ forcedColors: mode });
});

export default defineConfig({
  // Tests always run with development warnings, and need no built dist/ to resolve #dev.
  resolve: {
    alias: [
      {
        find: /^#dev$/,
        replacement: fileURLToPath(new URL('./src/utilities/dev.dev.ts', import.meta.url)),
      },
    ],
  },
  // Pre-bundling Lit entry points up front avoids a mid-run reload that loads Lit twice on a cold cache.
  optimizeDeps: {
    include: ['lit', 'lit/decorators.js', 'lit/directives/class-map.js'],
  },
  test: {
    include: ['src/**/*.test.ts', 'test/browser/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedEngines().map((browser) => ({ browser })),
      commands: { setColorScheme, setForcedColors },
    },
  },
});
