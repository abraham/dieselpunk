import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const configDir = fileURLToPath(new URL('.storybook', import.meta.url));
// A fresh object for each project, since Vitest names the instances in place.
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const }],
});

// Every story is rendered and checked by the accessibility addon (specs/accessibility.md §13), and
// the interaction stories run their flows (specs/workbench.md §5).
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [storybookTest({ configDir, tags: { include: ['test'], exclude: ['flow'] } })],
        test: { name: 'storybook', browser: browser() },
      },
      {
        plugins: [storybookTest({ configDir, tags: { include: ['flow'], exclude: [] } })],
        test: {
          name: 'flows',
          browser: browser(),
          // A flow moves focus and waits on timers, so none runs beside another or the other stories.
          fileParallelism: false,
          sequence: { groupOrder: 1 },
          testTimeout: 30000,
        },
      },
    ],
  },
});
