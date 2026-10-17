import { defineConfig, devices } from '@playwright/test';

// Visual baselines are only valid when rendered on the Linux CI image. `scripts/visual.ts` runs this
// config inside that image locally, and CI runs it directly on ubuntu. See specs/testing.md §6.

const port = Number(process.env['PUNK_VISUAL_PORT'] ?? 4173);

export default defineConfig({
  testDir: './test/visual',
  testMatch: '*.spec.ts',
  snapshotPathTemplate: `${process.env['PUNK_VISUAL_SNAPSHOTS'] ?? '{testDir}/__screenshots__'}/{projectName}/{arg}{ext}`,
  fullyParallel: true,
  // Playwright's default of half the reported cores gave one worker on GitHub's 4-vCPU runners.
  workers: 4,
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
    // Firefox, WebKit, and forced colors run tagged subsets, chosen before any page opens.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@cross-engine/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@cross-engine/ },
    // Chromium is the one engine that emulates forced colors. The theme has no effect in this mode.
    {
      name: 'chromium-forced',
      use: { ...devices['Desktop Chrome'], forcedColors: 'active' },
      grep: /@forced/,
    },
  ],
});
