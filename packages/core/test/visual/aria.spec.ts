import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The accessibility tree of each inventory component, as Playwright serializes it, on every
// engine (specs/testing.md §2). The expected trees are written out so that a change to a role,
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

  test('toast stack with a polite and an assertive toast', async ({ page }) => {
    await render(
      page,
      `<punk-toast-stack>
         <punk-toast duration="0">Saved</punk-toast>
         <punk-toast variant="danger" heading="Offline" duration="0">Reactor lost power</punk-toast>
       </punk-toast-stack>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - region "Notifications":
        - status:
          - text: Saved
          - button "Dismiss"
        - alert:
          - text: Offline Reactor lost power
          - button "Dismiss"
    `);
  });

  test('checkbox, switch, and slider in each state', async ({ page }) => {
    await render(
      page,
      `<punk-checkbox>Fuel</punk-checkbox>
       <punk-checkbox checked required>Pump</punk-checkbox>
       <punk-checkbox indeterminate>Belt</punk-checkbox>
       <punk-checkbox disabled>Lamp</punk-checkbox>
       <punk-switch>Power</punk-switch>
       <punk-switch checked aria-label="Cooling"></punk-switch>
       <punk-slider label="Speed" value="40"></punk-slider>
       <punk-slider aria-label="Heat" min="10" max="20" value="15" aria-valuetext="Warm"></punk-slider>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - checkbox "Fuel"
      - checkbox "Pump" [checked]
      - checkbox "Belt" [checked=mixed]
      - checkbox "Lamp" [disabled]
      - switch "Power"
      - switch "Cooling" [checked]
      - slider "Speed"
      - slider "Heat"
    `);
  });

  test('text, number, and select fields', async ({ page }) => {
    await render(
      page,
      `<punk-text-field label="Callsign" value="Echo"><span slot="hint">Three letters</span></punk-text-field>
       <punk-text-field aria-label="Search" type="search"></punk-text-field>
       <punk-text-field label="Locked" value="Fixed" disabled></punk-text-field>
       <punk-text-field label="Required name" required></punk-text-field>
       <punk-number-field label="Thrust" value="3" min="0" max="10"></punk-number-field>
       <punk-select label="Squadron"><option value="a">Alpha</option><option value="b">Beta</option></punk-select>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Callsign
      - textbox "Callsign"
      - searchbox "Search"
      - text: Locked
      - textbox "Locked" [disabled]
      - text: Required name
      - textbox "Required name"
      - text: Thrust
      - spinbutton "Thrust"
      - text: Squadron
      - combobox "Squadron"
    `);
    await expect(page.getByRole('textbox', { name: 'Callsign' })).toHaveAccessibleDescription(
      'Three letters',
    );
    await expect(page.getByRole('textbox', { name: 'Callsign' })).toHaveValue('Echo');
  });

  test('a field names its message once the user has left it', async ({ page }) => {
    await render(page, '<punk-text-field label="Required name" required></punk-text-field>');
    const field = page.getByRole('textbox', { name: 'Required name' });
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
    await field.focus();
    await field.blur();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/invalid/i);
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

  const sparkline =
    '<svg slot="sparkline" viewBox="0 0 8 4" aria-hidden="true"><path d="M0 4 8 0"/></svg>';

  // The stat has no role, so its tree is the text it reads as, in order; `announce` is the only
  // thing that gives it one. The expected text is in each row.
  const stats: Array<[string, string, string]> = [
    [
      'every part',
      `<punk-production-stat label="Iron plates" value="1240" unit="/min" trend="up" delta="0.12" delta-percent>${art}${sparkline}</punk-production-stat>`,
      '- text: Iron plates 1,240 /min up +12%',
    ],
    [
      'compact, with the full number',
      '<punk-production-stat label="Iron plates" value="1234567.89" compact unit="/min"></punk-production-stat>',
      '- text: Iron plates 1,234,567.89 /min',
    ],
    [
      'no value',
      '<punk-production-stat label="Output" unit="/min"></punk-production-stat>',
      '- text: Output no value /min',
    ],
    [
      'falling, with a change',
      '<punk-production-stat label="Heat" value="87" unit="%" trend="down" delta="-3"></punk-production-stat>',
      '- text: Heat 87 % down -3',
    ],
    [
      'unchanged',
      '<punk-production-stat label="Fuel" value="0" trend="flat"></punk-production-stat>',
      '- text: Fuel 0 unchanged',
    ],
    [
      'announcing',
      '<punk-production-stat label="Power" value="12.5" unit="MW" announce></punk-production-stat>',
      '- status: Power 12.5 MW',
    ],
  ];
  for (const [name, markup, expected] of stats) {
    test(`production stat, ${name}`, async ({ page }) => {
      await render(page, markup);
      await expect(page.locator('#case')).toMatchAriaSnapshot(expected);
    });
  }

  // The row has no role either: the nodes, the direction as a word, the details, and the status
  // text read in that order, and the remove button is the only thing in the tree with a role.
  const nodes = '<span slot="source">Iron smelter</span><span slot="destination">Assembler</span>';
  const label = 'Remove connection: Iron smelter, Assembler';
  const rows: Array<[string, string, string]> = [
    [
      'forward',
      `<punk-connection-row direction="forward">${nodes}</punk-connection-row>`,
      '- text: Iron smelter to Assembler',
    ],
    [
      'backward',
      `<punk-connection-row direction="backward">${nodes}</punk-connection-row>`,
      '- text: Iron smelter from Assembler',
    ],
    [
      'both ways',
      `<punk-connection-row direction="both">${nodes}</punk-connection-row>`,
      '- text: Iron smelter to and from Assembler',
    ],
    [
      'info, with status text',
      `<punk-connection-row status="info">${nodes}<span slot="status">Waiting</span></punk-connection-row>`,
      '- text: Iron smelter to Assembler Waiting',
    ],
    [
      'success, with details and status text',
      `<punk-connection-row status="success">${nodes}<span>2 per second</span><span slot="status">Running</span></punk-connection-row>`,
      '- text: Iron smelter to Assembler 2 per second Running',
    ],
    [
      'warning',
      `<punk-connection-row status="warning">${nodes}<span slot="status">Low on fuel</span></punk-connection-row>`,
      '- text: Iron smelter to Assembler Low on fuel',
    ],
    [
      'danger',
      `<punk-connection-row status="danger">${nodes}<span slot="status">Offline</span></punk-connection-row>`,
      '- text: Iron smelter to Assembler Offline',
    ],
    [
      'neutral, with status text',
      `<punk-connection-row>${nodes}<span slot="status">Idle</span></punk-connection-row>`,
      '- text: Iron smelter to Assembler Idle',
    ],
    [
      'removable',
      `<punk-connection-row removable value="a">${nodes}</punk-connection-row>`,
      `- text: Iron smelter to Assembler\n- 'button "${label}"'`,
    ],
    [
      'removable, with a remove label',
      `<punk-connection-row removable remove-label="Remove the iron line">${nodes}</punk-connection-row>`,
      '- text: Iron smelter to Assembler\n- button "Remove the iron line"',
    ],
    [
      'removable and disabled',
      `<punk-connection-row removable disabled>${nodes}</punk-connection-row>`,
      `- text: Iron smelter to Assembler\n- 'button "${label}" [disabled]'`,
    ],
  ];
  for (const [name, markup, expected] of rows) {
    test(`connection row, ${name}`, async ({ page }) => {
      await render(page, markup);
      await expect(page.locator('#case')).toMatchAriaSnapshot(expected);
    });
  }
});
