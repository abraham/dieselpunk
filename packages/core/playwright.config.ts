import { defineConfig, devices } from '@playwright/test';

// Visual baselines are only valid when rendered on the Linux CI image. `scripts/visual.ts` runs this
// config inside that image locally, and CI runs it directly on ubuntu. See SPEC-PHASE-1.md §10.3.

const port = Number(process.env['PUNK_VISUAL_PORT'] ?? 4173);

export default defineConfig({
  testDir: './test/visual',
  testMatch: '*.spec.ts',
  snapshotPathTemplate: `${process.env['PUNK_VISUAL_SNAPSHOTS'] ?? '{testDir}/__screenshots__'}/{projectName}/{arg}{ext}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/visual-report' }]],
  outputDir: 'test-results/visual',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL: `http://localhost:${port}`,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `node scripts/serve-visual.ts ${port}`,
    url: `http://localhost:${port}/matrix.html`,
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Chromium is the one engine that emulates forced colors. The theme has no effect in this mode.
    { name: 'chromium-forced', use: { ...devices['Desktop Chrome'], forcedColors: 'active' } },
  ],
});
