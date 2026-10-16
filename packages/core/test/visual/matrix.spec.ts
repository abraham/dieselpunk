import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The matrix from SPEC-PHASE-1.md §10.3, run once for each gallery group (SPEC-PHASE-2.md §10.2).
// Chromium runs all of it. Firefox and WebKit run the default theme at compact density and
// `industrial-light` at low density, at 100% only. The forced-colors project ignores themes, so
// it runs one theme at 100% zoom. The baselines of a group are in a folder of that name.

const groups = ['foundation', 'inventory', 'shell'] as const;
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

for (const group of groups) {
  test.describe(`${group} group`, () => {
    for (const zoom of zooms) {
      test.describe(`${zoom.name}% zoom`, () => {
        // 200% zoom is half the layout width at double the pixel density.
        test.use({ deviceScaleFactor: zoom.scale });

        for (const theme of themes) {
          for (const density of densities) {
            for (const container of containers) {
              for (const content of contents) {
                const id = `${theme}-${density}-${container.name}-${zoom.name}-${content}`;
                test(id, async ({ page, browserName }, testInfo) => {
                  const forced = testInfo.project.name === 'chromium-forced';
                  const reduced =
                    crossEngineCombos.has(`${theme}/${density}`) &&
                    zoom.name === '100' &&
                    container.name === 'desktop' &&
                    content === 'short';
                  test.skip(
                    forced
                      ? theme !== 'industrial' || zoom.name !== '100'
                      : browserName !== 'chromium' && !reduced,
                    forced
                      ? 'Forced colors ignore the theme'
                      : 'Firefox and WebKit run the reduced matrix',
                  );
                  await page.setViewportSize({
                    width: Math.round(container.width / zoom.scale),
                    height: 900,
                  });
                  await open(page, { group, theme, density, content });
                  await expect(page).toHaveScreenshot([group, `${id}.png`], { fullPage: true });
                });
              }
            }
          }
        }
      });
    }
  });
}

// Interaction states are driven with real input, never with CSS class hooks.
test.describe('interaction states', () => {
  const gallery = (page: Page) => page.locator('.gallery');

  test.describe('button', () => {
    test.beforeEach(async ({ page }) => {
      await open(page, { theme: 'industrial', density: 'compact', component: 'button' });
    });

    const target = (page: Page) =>
      page.locator('punk-button[variant="primary"]:not([disabled]):not([loading])').first();

    test('button hover', async ({ page }) => {
      await target(page).hover();
      await expect(gallery(page)).toHaveScreenshot(['foundation', 'interaction-button-hover.png']);
    });

    test('button focus-visible', async ({ page }) => {
      // A keypress marks keyboard modality, so focusing the target afterwards matches
      // :focus-visible.
      await page.keyboard.press('Tab');
      await target(page).focus();
      // A baseline of an unfocused button would pass silently, so focus is asserted first.
      await expect(target(page)).toBeFocused();
      await expect(gallery(page)).toHaveScreenshot(['foundation', 'interaction-button-focus.png']);
    });

    test('button active', async ({ page }) => {
      await target(page).hover();
      await page.mouse.down();
      await expect(gallery(page)).toHaveScreenshot(['foundation', 'interaction-button-active.png']);
      await page.mouse.up();
    });
  });

  test.describe('slot', () => {
    test.beforeEach(async ({ page }) => {
      await open(page, { theme: 'industrial', density: 'compact', component: 'slot' });
    });

    // The second slot of the first row: empty-state variants do not hide the item art.
    const target = (page: Page) => page.locator('punk-slot').nth(1);

    test('slot hover', async ({ page }) => {
      await target(page).hover();
      await expect(gallery(page)).toHaveScreenshot(['inventory', 'interaction-slot-hover.png']);
    });

    test('slot focus-visible', async ({ page }) => {
      await page.keyboard.press('Tab');
      await target(page).focus();
      await expect(target(page)).toBeFocused();
      await expect(gallery(page)).toHaveScreenshot(['inventory', 'interaction-slot-focus.png']);
    });

    test('slot active', async ({ page }) => {
      await target(page).hover();
      await page.mouse.down();
      await expect(gallery(page)).toHaveScreenshot(['inventory', 'interaction-slot-active.png']);
      await page.mouse.up();
    });
  });

  test.describe('slot grid', () => {
    test('keyboard focus on an interior item', async ({ page }) => {
      await open(page, { theme: 'industrial', density: 'compact', component: 'slot-grid' });
      const grid = page.locator('punk-slot-grid').first();
      // Tab lands on the selected item, and the arrow moves past the disabled one to Slot 4.
      await page.keyboard.press('Tab');
      await page.keyboard.press('ArrowRight');
      await expect(grid.locator('punk-slot[value="s4"]')).toBeFocused();
      await expect(gallery(page)).toHaveScreenshot([
        'inventory',
        'interaction-slot-grid-focus.png',
      ]);
    });
  });
});
