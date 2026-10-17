import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// The matrix from specs/testing.md §6, run once for each gallery group (specs/testing.md §3).
// Chromium runs all of it. Firefox and WebKit run the default theme at compact density and
// `industrial-light` at low density, at 100% only. The forced-colors project ignores themes, so
// it runs one theme at 100% zoom. The baselines of a group are in a folder of that name.
// Projects select their tests by tag (playwright.config.ts), so a test never skips itself after
// its page is open (specs/ci.md §5.2).

const everyProject = ['@cross-engine', '@forced'];

const groups = ['foundation', 'inventory', 'production', 'shell', 'forms', 'overlays'] as const;
// An overlay is open on a page of its own, so each is a page, and only two contents are captured.
const overlayPages = ['dialog', 'window', 'popover', 'toast-stack'] as const;
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
const overlayContents = ['short', 'rtl'] as const; // The stat and the row take their words from the content, but a missing label is replaced by the
// same fallback the short content has, so `unlabeled` would only repeat `short`: it is left out of
// `production` to keep the group under 20 MB (specs/testing.md §6).
const productionContents = ['short', 'long', 'rtl'] as const;

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
              for (const content of group === 'overlays'
                ? overlayContents
                : group === 'production'
                  ? productionContents
                  : contents) {
                for (const component of group === 'overlays' ? overlayPages : [null]) {
                  const id = `${component ? `${component}-` : ''}${theme}-${density}-${container.name}-${zoom.name}-${content}`;
                  const crossEngine =
                    crossEngineCombos.has(`${theme}/${density}`) &&
                    zoom.name === '100' &&
                    container.name === 'desktop' &&
                    content === 'short';
                  // Forced colors ignore the theme.
                  const forced = theme === 'industrial' && zoom.name === '100';
                  const tag = [
                    ...(crossEngine ? ['@cross-engine'] : []),
                    ...(forced ? ['@forced'] : []),
                  ];
                  test(id, { tag }, async ({ page }) => {
                    await page.setViewportSize({
                      width: Math.round(container.width / zoom.scale),
                      height: 900,
                    });
                    await open(page, {
                      group,
                      theme,
                      density,
                      content,
                      ...(component ? { component } : {}),
                    });
                    await expect(page).toHaveScreenshot([group, `${id}.png`], { fullPage: true });
                  });
                }
              }
            }
          }
        }
      });
    }
  });
}

// Interaction states are driven with real input, never with CSS class hooks.
test.describe('interaction states', { tag: everyProject }, () => {
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

  test.describe('connection row', () => {
    test.beforeEach(async ({ page }) => {
      await open(page, { theme: 'industrial', density: 'compact', component: 'connection-row' });
    });

    // The first row that can be removed and is not disabled.
    const target = (page: Page) =>
      page
        .locator('punk-connection-row[removable]:not([disabled])')
        .first()
        .locator('[part="remove-button"]');

    test('connection row hover', async ({ page }) => {
      await target(page).hover();
      await expect(gallery(page)).toHaveScreenshot([
        'production',
        'interaction-connection-row-hover.png',
      ]);
    });

    test('connection row focus-visible', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(target(page)).toBeFocused();
      await expect(gallery(page)).toHaveScreenshot([
        'production',
        'interaction-connection-row-focus.png',
      ]);
    });

    test('connection row active', async ({ page }) => {
      await target(page).hover();
      await page.mouse.down();
      await expect(gallery(page)).toHaveScreenshot([
        'production',
        'interaction-connection-row-active.png',
      ]);
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

  test.describe('form controls', () => {
    const first = (page: Page, tag: string) => page.locator(`${tag}:not([disabled])`).first();

    test('checkbox hover', async ({ page }) => {
      await open(page, { theme: 'industrial', density: 'compact', component: 'checkbox' });
      await first(page, 'punk-checkbox').hover();
      await expect(gallery(page)).toHaveScreenshot(['forms', 'interaction-checkbox-hover.png']);
    });

    // The checkbox's hover is above; the rest of the controls are hovered in the same way.
    for (const tag of ['switch', 'slider', 'text-field', 'number-field', 'select']) {
      test(`${tag} hover`, async ({ page }) => {
        await open(page, { theme: 'industrial', density: 'compact', component: tag });
        await first(page, `punk-${tag}`).hover();
        await expect(gallery(page)).toHaveScreenshot(['forms', `interaction-${tag}-hover.png`]);
      });
    }

    // Pressed, with the pointer still down; a field has no pressed look of its own.
    for (const tag of ['checkbox', 'switch', 'slider']) {
      test(`${tag} active`, async ({ page }) => {
        await open(page, { theme: 'industrial', density: 'compact', component: tag });
        await first(page, `punk-${tag}`).hover();
        await page.mouse.down();
        await expect(gallery(page)).toHaveScreenshot(['forms', `interaction-${tag}-active.png`]);
        await page.mouse.up();
      });
    }

    for (const tag of ['checkbox', 'switch', 'slider', 'text-field', 'number-field', 'select']) {
      test(`${tag} focus-visible`, async ({ page }) => {
        await open(page, { theme: 'industrial', density: 'compact', component: tag });
        await page.keyboard.press('Tab');
        await expect(first(page, `punk-${tag}`)).toBeFocused();
        await expect(gallery(page)).toHaveScreenshot(['forms', `interaction-${tag}-focus.png`]);
      });
    }
  });
});

// The other interactive components, each hovered, focused with the keyboard, and pressed, with real
// input. `from` is the folder of the group the component belongs to; an overlay is captured as the
// page, since it is in the top layer and not in the gallery.
interface Capture {
  name: string;
  from: 'foundation' | 'inventory' | 'shell' | 'overlays';
  query?: Record<string, string>;
  /** The element that is hovered, focused, and pressed. */
  target: (page: Page) => Locator;
  states?: readonly ('hover' | 'focus' | 'active')[];
}

const first = (selector: string) => (page: Page) => page.locator(selector).first();
const captures: Capture[] = [
  {
    name: 'icon-button',
    from: 'foundation',
    target: first('punk-icon-button:not([disabled]):not([loading])'),
  },
  { name: 'item-stack', from: 'inventory', target: first('punk-item-stack:not([disabled])') },
  { name: 'recipe', from: 'inventory', target: first('punk-recipe[available]:not([disabled])') },
  {
    name: 'tab',
    from: 'shell',
    query: { component: 'tabs' },
    // A selected tab is already inset, so hover and pressed would not show on it.
    target: first('punk-tab:not([selected]):not([disabled])'),
  },
  {
    name: 'accordion-item',
    from: 'shell',
    // The first item is collapsed, so the centre of the host is the header and not the panel.
    target: (page) => page.locator('punk-accordion-item').first().locator('[part="trigger"]'),
  },
  {
    name: 'window-close',
    from: 'overlays',
    query: { group: 'overlays', content: 'short', component: 'window' },
    target: (page) => page.locator('punk-window [part="close-button"]'),
  },
  {
    name: 'toast-dismiss',
    from: 'overlays',
    query: { group: 'overlays', content: 'short', component: 'toast-stack' },
    target: (page) => page.locator('punk-toast').first().locator('[part="dismiss-button"]'),
  },
];

/** A picture of the target and a margin, so that a change of a pixel or two is a visible part of it. */
async function shotAround(
  page: Page,
  file: string[],
  target: Locator,
  margin: { top?: number; right?: number; bottom?: number; left?: number } = {},
): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error(`${file.join('/')}: the target has no box`);
  const { top = 12, right = 12, bottom = 12, left = 12 } = margin;
  const x = Math.max(0, box.x - left);
  const y = Math.max(0, box.y - top);
  // A hover or a pressed look moves an edge colour by a few steps, so the default tolerance of the
  // matrix (a fifth of a colour step, 0.2% of the picture) would let it go.
  await expect(page).toHaveScreenshot(file, {
    threshold: 0.02,
    maxDiffPixelRatio: 0.0005,
    clip: { x, y, width: box.x + box.width + right - x, height: box.y + box.height + bottom - y },
  });
}

test.describe('interaction states of the remaining components', { tag: everyProject }, () => {
  for (const capture of captures) {
    const component = capture.query?.['component'] ?? capture.name;
    const query = { theme: 'industrial', density: 'compact', component, ...capture.query };

    for (const state of capture.states ?? (['hover', 'focus', 'active'] as const)) {
      test(`${capture.name} ${state}`, async ({ page }) => {
        await open(page, query);
        const target = capture.target(page);
        const file = [capture.from, `interaction-${capture.name}-${state}.png`];
        if (state === 'focus') {
          // A keypress marks keyboard modality, so the focus that follows matches :focus-visible.
          await page.keyboard.press('Tab');
          await target.focus();
          await expect(target).toBeFocused();
          await shotAround(page, file, target);
          return;
        }
        await target.hover();
        if (state === 'active') await page.mouse.down();
        await shotAround(page, file, target);
        if (state === 'active') await page.mouse.up();
      });
    }
  }

  // A tooltip opens at once for keyboard focus on its anchor.
  test('tooltip opens for keyboard focus', async ({ page }) => {
    await open(page, { theme: 'industrial', density: 'compact', component: 'tooltip' });
    const anchor = page.locator('#gallery-anchor');
    await page.keyboard.press('Tab');
    await anchor.focus();
    await expect(anchor).toBeFocused();
    await expect(page.locator('punk-tooltip[for="gallery-anchor"]')).toHaveAttribute('open', '');
    await shotAround(page, ['foundation', 'interaction-tooltip-focus.png'], anchor, {
      bottom: 80,
      left: 60,
      right: 60,
    });
  });

  // Hovering an item of a grid, and moving along a toolbar with the arrow keys.
  test('slot grid hover', async ({ page }) => {
    await open(page, { theme: 'industrial', density: 'compact', component: 'slot-grid' });
    const grid = page.locator('punk-slot-grid').first();
    await grid.locator('punk-slot[value="s2"]').hover();
    await shotAround(page, ['inventory', 'interaction-slot-grid-hover.png'], grid);
  });

  test('toolbar roving focus on the second item', async ({ page }) => {
    await open(page, { theme: 'industrial', density: 'compact', component: 'toolbar' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    const toolbar = page.locator('punk-toolbar').first();
    await expect(toolbar.locator('punk-button').nth(1)).toBeFocused();
    await shotAround(page, ['shell', 'interaction-toolbar-focus.png'], toolbar);
  });
});

// A window in move mode, with the keyboard: the pressed move button and the offset window.
test.describe('window mid-move', { tag: everyProject }, () => {
  test('after the move button and four arrow keys', async ({ page }) => {
    await open(page, {
      group: 'overlays',
      theme: 'industrial',
      density: 'compact',
      content: 'short',
      component: 'window',
    });
    const move = page.locator('punk-window [part="move-button"]');
    await move.click();
    await expect(move).toHaveAttribute('aria-pressed', 'true');
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) {
      await page.keyboard.press(key);
    }
    await expect(page).toHaveScreenshot(['overlays', 'interaction-window-moving.png']);
  });
});
