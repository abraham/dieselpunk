import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The matrix from SPEC-PHASE-1.md §10.3. Chromium runs all of it. Firefox and WebKit run the
// default theme at compact density and `industrial-light` at low density, at 100% only.

const themes = ['industrial', 'industrial-light', 'high-contrast', 'reduced-texture'] as const;
const densities = ['compact', 'low'] as const;
const containers = [
  { name: 'desktop', width: 1024 },
  { name: 'narrow', width: 375 },
] as const;
const zooms = [
  { name: '100', scale: 1 },
  { name: '200', scale: 2 },
] as const;
const contents = ['short', 'long', 'unlabeled', 'rtl'] as const;

const crossEngineCombos = new Set(['industrial/compact', 'industrial-light/low']);

async function open(page: Page, query: Record<string, string>): Promise<void> {
  await page.goto(`/matrix.html?${new URLSearchParams(query)}`);
  await page.waitForSelector('html[data-ready]');
}

for (const zoom of zooms) {
  test.describe(`${zoom.name}% zoom`, () => {
    // 200% zoom is half the layout width at double the pixel density.
    test.use({ deviceScaleFactor: zoom.scale });

    for (const theme of themes) {
      for (const density of densities) {
        for (const container of containers) {
          for (const content of contents) {
            const id = `${theme}-${density}-${container.name}-${zoom.name}-${content}`;
            test(id, async ({ page, browserName }) => {
              const reduced =
                crossEngineCombos.has(`${theme}/${density}`) &&
                zoom.name === '100' &&
                container.name === 'desktop' &&
                content === 'short';
              test.skip(
                browserName !== 'chromium' && !reduced,
                'Firefox and WebKit run the reduced matrix',
              );
              await page.setViewportSize({
                width: Math.round(container.width / zoom.scale),
                height: 900,
              });
              await open(page, { theme, density, content });
              await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true });
            });
          }
        }
      }
    }
  });
}

// Interaction states are driven with real input, never with CSS class hooks.
test.describe('interaction states', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, { theme: 'industrial', density: 'compact', component: 'button' });
  });

  const target = (page: Page) =>
    page.locator('punk-button[variant="primary"]:not([disabled]):not([loading])').first();

  test('button hover', async ({ page }) => {
    await target(page).hover();
    await expect(page.locator('.gallery')).toHaveScreenshot('interaction-button-hover.png');
  });

  test('button focus-visible', async ({ page }) => {
    // A keypress marks keyboard modality, so focusing the target afterwards matches :focus-visible.
    await page.keyboard.press('Tab');
    await target(page).focus();
    // A baseline of an unfocused button would pass silently, so focus is asserted first.
    await expect(target(page)).toBeFocused();
    await expect(page.locator('.gallery')).toHaveScreenshot('interaction-button-focus.png');
  });

  test('button active', async ({ page }) => {
    await target(page).hover();
    await page.mouse.down();
    await expect(page.locator('.gallery')).toHaveScreenshot('interaction-button-active.png');
    await page.mouse.up();
  });
});
