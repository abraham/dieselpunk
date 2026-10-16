import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The accessibility tree of each inventory component, as Playwright serializes it, on every
// engine (SPEC-PHASE-2.md §10.3). The expected trees are written out so that a change to a role,
// a name, or a state shows in review. The page is the visual matrix with its content replaced,
// which registers every component.

const art =
  '<svg slot="icon" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3"/></svg>';

// Runs in the page. It is a string because this file is type-checked without DOM types.
const replaceContent = `async ({ html, selection }) => {
  document.body.innerHTML = '<div id="case">' + html + '</div>';
  const grid = document.querySelector('punk-slot-grid');
  if (grid && selection) grid.values = selection;
  const elements = [...document.querySelectorAll('#case *')].filter((element) =>
    element.localName.startsWith('punk-'),
  );
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all(elements.map((element) => element.updateComplete));
  }
}`;

async function render(page: Page, markup: string, values?: string[]): Promise<void> {
  await page.goto(`/matrix.html?${new URLSearchParams({ component: 'button' })}`);
  await page.waitForSelector('html[data-ready]');
  await page.evaluate(
    `(${replaceContent})(${JSON.stringify({ html: markup, selection: values })})`,
  );
}

test.describe('ARIA snapshots', () => {
  // Playwright reads the fixtures from the first parameter, so it has to be a pattern.
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-forced', 'Forced colors do not change the tree');
  });

  test('slot alone', async ({ page }) => {
    await render(
      page,
      `<punk-slot label="Engine slot" value="e1">${art}</punk-slot>
       <punk-slot label="Empty slot" value="e2"></punk-slot>
       <punk-slot label="Locked slot" value="e3" disabled></punk-slot>
       <punk-slot label="Bad slot" value="e4" invalid></punk-slot>
       <punk-slot label="Chosen slot" value="e5" selected>${art}</punk-slot>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - button "Engine slot"
      - button "Empty slot"
      - button "Locked slot" [disabled]
      - button "Bad slot, invalid"
      - button "Chosen slot" [pressed]
    `);
  });

  const grid = (selection: string) =>
    `<punk-slot-grid aria-label="Cargo" selection="${selection}" columns="2">
       <punk-slot label="One" value="a">${art}</punk-slot>
       <punk-slot label="Two" value="b"></punk-slot>
       <punk-slot label="Three" value="c" disabled></punk-slot>
     </punk-slot-grid>`;

  test('slot grid, selection none', async ({ page }) => {
    await render(page, grid('none'));
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - group "Cargo":
        - button "One"
        - button "Two"
        - button "Three" [disabled]
    `);
  });

  test('slot grid, selection single', async ({ page }) => {
    await render(page, grid('single'), ['a']);
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - listbox "Cargo":
        - option "One" [selected]
        - option "Two"
        - option "Three" [disabled]
    `);
  });

  test('slot grid, selection multiple', async ({ page }) => {
    await render(page, grid('multiple'), ['a', 'b']);
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - listbox "Cargo":
        - option "One" [selected]
        - option "Two" [selected]
        - option "Three" [disabled]
    `);
  });

  test('item stack in each state', async ({ page }) => {
    await render(
      page,
      `<punk-item-stack name="Iron plate" count="1">${art}</punk-item-stack>
       <punk-item-stack name="Iron plate" count="1234">${art}</punk-item-stack>
       <punk-item-stack name="Iron plate" count="1234567" compact-count>${art}</punk-item-stack>
       <punk-item-stack name="Iron plate" count="75" capacity="100">${art}</punk-item-stack>
       <punk-item-stack name="Iron plate" count="5" disabled>${art}</punk-item-stack>
       <punk-item-stack name="Iron plate" count="2" selected>${art}</punk-item-stack>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - button "Iron plate, 1"
      - button "Iron plate, 1,234"
      - button "Iron plate, 1,234,567"
      - button "Iron plate, 75 of 100"
      - button "Iron plate, 5" [disabled]
      - button "Iron plate, 2" [pressed]
    `);
  });

  test('recipe', async ({ page }) => {
    const parts = `${art}<span slot="ingredients">2 plates</span><span slot="products">Gear</span>`;
    await render(
      page,
      `<punk-recipe name="Gear" duration="2" available craftable-count="3">${parts}</punk-recipe>
       <punk-recipe name="Gear" duration="2">${parts}</punk-recipe>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - button "Gear 2 sec can craft 3 2 plates Gear"
      - button "Gear 2 sec unavailable 2 plates Gear"
    `);
  });

  test('meter and status light', async ({ page }) => {
    await render(
      page,
      `<punk-meter label="Heat" value="64" show-value></punk-meter>
       <punk-meter label="Heat" label-hidden value="40"></punk-meter>
       <punk-status-light variant="success">Running</punk-status-light>
       <punk-status-light variant="danger" announce>Offline</punk-status-light>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Heat 64%
      - meter "Heat"
      - text: Heat
      - meter "Heat"
      - text: Running
      - status: Offline
    `);
  });

  test('tabs, with panels inside and beside', async ({ page }) => {
    await render(
      page,
      `<punk-tabs aria-label="Machine">
         <punk-tab slot="tab" panel="inside-a">Inputs</punk-tab>
         <punk-tab slot="tab" panel="inside-b">Outputs</punk-tab>
         <punk-tab slot="tab" panel="beside-c" disabled>Locked</punk-tab>
         <div id="inside-a"><p>Iron plates</p></div>
         <div id="inside-b"><p>Gears</p></div>
       </punk-tabs>
       <div id="beside-c"><p>Hidden</p></div>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - tablist "Machine":
        - tab "Inputs" [selected]
        - tab "Outputs"
        - tab "Locked" [disabled]
      - tabpanel "Inputs":
        - paragraph: Iron plates
    `);
  });

  test('toolbar', async ({ page }) => {
    await render(
      page,
      `<punk-toolbar aria-label="Tools">
         <punk-button>Start</punk-button>
         <punk-icon-button label="Settings">${art}</punk-icon-button>
         <button type="button" disabled>Stop</button>
       </punk-toolbar>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - toolbar "Tools":
        - button "Start"
        - button "Settings"
        - button "Stop" [disabled]
    `);
  });

  test('window and dialog, open', async ({ page }) => {
    await render(
      page,
      `<punk-window heading="Assembler" open dismissible movable>
         <p>Crafting speed 0.75</p>
         <punk-button slot="footer">Start</punk-button>
       </punk-window>
       <punk-dialog heading="Discard the run?" alert open>
         <p>This cannot be undone.</p>
         <punk-button slot="footer">Discard</punk-button>
       </punk-dialog>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - dialog "Assembler":
        - button "Move window" [pressed=false]
        - button "Close"
        - paragraph: Crafting speed 0.75
        - button "Start"
      - alertdialog "Discard the run?":
        - paragraph: This cannot be undone.
        - button "Discard"
    `);
  });

  test('popover in each mode', async ({ page }) => {
    await render(
      page,
      `<punk-button>Details</punk-button>
       <punk-popover open><p>Iron plates</p></punk-popover>
       <punk-button>Actions</punk-button>
       <punk-popover mode="menu" open>
         <button role="menuitem">Rename</button>
         <button role="menuitem" disabled>Delete</button>
       </punk-popover>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - button "Details" [expanded]
      - paragraph: Iron plates
      - button "Actions" [expanded]
      - menu:
        - menuitem "Rename"
        - menuitem "Delete" [disabled]
    `);
  });

  test('accordion', async ({ page }) => {
    await render(
      page,
      `<punk-accordion>
         <punk-accordion-item heading="Inputs" expanded><p>Iron plates</p></punk-accordion-item>
         <punk-accordion-item heading="Outputs" level="2"><p>Gears</p></punk-accordion-item>
         <punk-accordion-item heading="Locked" disabled><p>Hidden</p></punk-accordion-item>
       </punk-accordion>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - heading "Inputs" [level=3]:
        - button "Inputs" [expanded]
      - region "Inputs":
        - paragraph: Iron plates
      - heading "Outputs" [level=2]:
        - button "Outputs"
      - heading "Locked" [level=3]:
        - button "Locked" [disabled]
    `);
  });
});
