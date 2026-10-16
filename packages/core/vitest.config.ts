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

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/browser/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: selectedEngines().map((browser) => ({ browser })),
      commands: { setColorScheme },
    },
  },
});
