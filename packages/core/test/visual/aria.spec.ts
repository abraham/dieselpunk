import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { at } from './tags.ts';

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

// Forced colors do not change the tree, so the forced-colors project does not run these.
test.describe('ARIA snapshots', { tag: '@cross-engine' }, () => {
  test('slot alone', { tag: at('inventory') }, async ({ page }) => {
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

  test('slot grid, selection none', { tag: at('inventory') }, async ({ page }) => {
    await render(page, grid('none'));
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - group "Cargo":
        - button "One"
        - button "Two"
        - button "Three" [disabled]
    `);
  });

  test('slot grid, selection single', { tag: at('inventory') }, async ({ page }) => {
    await render(page, grid('single'), ['a']);
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - listbox "Cargo":
        - option "One" [selected]
        - option "Two"
        - option "Three" [disabled]
    `);
  });

  test('slot grid, selection multiple', { tag: at('inventory') }, async ({ page }) => {
    await render(page, grid('multiple'), ['a', 'b']);
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - listbox "Cargo":
        - option "One" [selected]
        - option "Two" [selected]
        - option "Three" [disabled]
    `);
  });

  test('item stack in each state', { tag: at('inventory') }, async ({ page }) => {
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

  test('recipe', { tag: at('inventory') }, async ({ page }) => {
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

  test('meter and status light', { tag: at('inventory') }, async ({ page }) => {
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

  test('tabs, with panels inside and beside', { tag: at('shell') }, async ({ page }) => {
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

  test('toolbar', { tag: at('shell') }, async ({ page }) => {
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

  test('window and dialog, open', { tag: at('overlays') }, async ({ page }) => {
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

  test('popover in each mode', { tag: at('overlays') }, async ({ page }) => {
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

  test(
    'toast stack with a polite and an assertive toast',
    { tag: at('overlays') },
    async ({ page }) => {
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
    },
  );

  test('checkbox, switch, and slider in each state', { tag: at('forms') }, async ({ page }) => {
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

  test('text, number, and select fields', { tag: at('forms') }, async ({ page }) => {
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

  // The engines expose a date or time input differently, so the names and values are asked of
  // the inputs found by label rather than written out as one tree.
  test('date and time fields', { tag: at('forms') }, async ({ page }) => {
    await render(
      page,
      `<punk-date-field label="Delivery" value="2025-03-14"><span slot="hint">Weekdays only</span></punk-date-field>
       <punk-time-field label="Shift start" value="06:30" disabled></punk-time-field>`,
    );
    const date = page.getByLabel('Delivery', { exact: true });
    await expect(date).toHaveAttribute('type', 'date');
    await expect(date).toHaveValue('2025-03-14');
    await expect(date).toHaveAccessibleDescription('Weekdays only');
    const time = page.getByLabel('Shift start', { exact: true });
    await expect(time).toHaveAttribute('type', 'time');
    await expect(time).toHaveValue('06:30');
    await expect(time).toBeDisabled();
  });

  test('file field', { tag: at('inputs') }, async ({ page }) => {
    await render(
      page,
      `<punk-file-field label="Plans" drop-zone multiple><span slot="hint">PDF only</span></punk-file-field>`,
    );
    const input = page.getByLabel('Plans', { exact: true });
    await expect(input).toHaveAttribute('type', 'file');
    await expect(input).toHaveAccessibleDescription('PDF only');
    await expect(page.getByText('or drop files here')).toBeVisible();
    await input.setInputFiles([
      { name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x'.repeat(1540)) },
    ]);
    await expect(page.getByRole('listitem')).toHaveText(/plan\.pdf\s+1\.5 kB/);
  });

  test(
    'a field names its message once the user has left it',
    { tag: at('forms') },
    async ({ page }) => {
      await render(page, '<punk-text-field label="Required name" required></punk-text-field>');
      const field = page.getByRole('textbox', { name: 'Required name' });
      await expect(field).not.toHaveAttribute('aria-invalid', 'true');
      await field.focus();
      await field.blur();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toHaveAccessibleDescription(/invalid/i);
    },
  );

  test('accordion', { tag: at('shell') }, async ({ page }) => {
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

  test('radio group', { tag: at('inputs') }, async ({ page }) => {
    await render(
      page,
      `<punk-radio-group label="Power source" required>
         <punk-radio value="coal">Coal</punk-radio>
         <punk-radio value="solar" checked>Solar</punk-radio>
         <punk-radio value="wind" disabled>Wind</punk-radio>
       </punk-radio-group>
       <punk-radio-group aria-label="Belt speed" disabled>
         <punk-radio value="slow" checked>Slow</punk-radio>
       </punk-radio-group>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Power source
      - radiogroup "Power source":
        - radio "Coal"
        - radio "Solar" [checked]
        - radio "Wind" [disabled]
      - radiogroup "Belt speed" [disabled]:
        - radio "Slow" [checked] [disabled]
    `);
  });

  test('textarea and combobox', { tag: at('inputs') }, async ({ page }) => {
    await render(
      page,
      `<punk-textarea label="Notes" value="Belt 3" show-count maxlength="40"></punk-textarea>
       <punk-combobox label="Item" value="cu">
         <option value="fe">Iron plate</option>
         <option value="cu">Copper plate</option>
         <option value="st" disabled>Steel plate</option>
       </punk-combobox>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Notes
      - textbox "Notes": Belt 3
      - text: 6/40 Item
      - combobox "Item"
    `);
    await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveAccessibleDescription('6/40');
    await page.getByRole('combobox', { name: 'Item' }).press('ArrowDown');
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - combobox "Item" [expanded]
      - listbox "Item":
        - option "Iron plate"
        - option "Copper plate" [selected]
        - option "Steel plate" [disabled]
    `);
  });

  test('splitter', { tag: at('shell') }, async ({ page }) => {
    await render(
      page,
      `<punk-splitter value="30" label="Map width" style="block-size: 120px">
         <div slot="start">Map</div>
         <div slot="end">Details</div>
       </punk-splitter>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Map
      - separator "Map width"
      - text: Details
    `);
    const bar = page.getByRole('separator', { name: 'Map width' });
    await expect(bar).toHaveAttribute('aria-valuenow', '30');
    await bar.focus();
    await page.keyboard.press('ArrowRight');
    await expect(bar).toHaveAttribute('aria-valuenow', '35');
  });

  test('fieldset', { tag: at('inputs') }, async ({ page }) => {
    await render(
      page,
      `<punk-fieldset label="Cooling">
         <punk-switch checked>Pumps</punk-switch>
         <span slot="hint">Every reactor</span>
         <span slot="error">Turn on a pump</span>
       </punk-fieldset>
       <punk-fieldset label="Remote" disabled>
         <punk-checkbox>Shutdown</punk-checkbox>
       </punk-fieldset>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - group "Cooling":
        - text: Cooling Every reactor
        - switch "Pumps" [checked]
        - text: Turn on a pump
      - group "Remote":
        - text: Remote
        - checkbox "Shutdown" [disabled]
    `);
    await expect(page.getByRole('group', { name: 'Cooling' })).toHaveAccessibleDescription(
      'Every reactor Turn on a pump',
    );
  });

  test('toggle group in each mode', { tag: at('navigation') }, async ({ page }) => {
    await render(
      page,
      `<punk-toggle-group aria-label="View">
         <button value="grid" aria-checked="true">Grid</button>
         <button value="list">List</button>
         <button value="map" disabled>Map</button>
       </punk-toggle-group>
       <punk-toggle-group aria-label="Show" selection="multiple">
         <button value="belts" aria-pressed="true">Belts</button>
         <button value="pipes">Pipes</button>
       </punk-toggle-group>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - radiogroup "View":
        - radio "Grid" [checked]
        - radio "List"
        - radio "Map" [disabled]
      - group "Show":
        - button "Belts" [pressed]
        - button "Pipes"
    `);
  });

  const listItems = `
    <punk-list-item value="fe">Iron plate<span slot="end">12</span></punk-list-item>
    <punk-list-item value="cu" selected>Copper plate</punk-list-item>
    <punk-list-item value="st" disabled>Steel plate</punk-list-item>`;

  test('list without selection', { tag: at('navigation') }, async ({ page }) => {
    await render(page, `<punk-list aria-label="Stock">${listItems}</punk-list>`);
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - list "Stock":
        - listitem: Iron plate 12
        - listitem: Copper plate
        - listitem: Steel plate
    `);
  });

  test('list with multiple selection', { tag: at('navigation') }, async ({ page }) => {
    await render(
      page,
      `<punk-list aria-label="Stock" selection="multiple">${listItems}</punk-list>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - listbox "Stock":
        - option "Iron plate 12"
        - option "Copper plate" [selected]
        - option "Steel plate" [disabled]
    `);
  });

  test('breadcrumb and pagination', { tag: at('navigation') }, async ({ page }) => {
    await render(
      page,
      `<punk-breadcrumb max-items="3">
         <punk-breadcrumb-item href="#base">Base</punk-breadcrumb-item>
         <punk-breadcrumb-item href="#north">North works</punk-breadcrumb-item>
         <punk-breadcrumb-item href="#line">Line 2</punk-breadcrumb-item>
         <punk-breadcrumb-item current>Settings</punk-breadcrumb-item>
       </punk-breadcrumb>
       <punk-pagination page="5" pages="12"></punk-pagination>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - navigation "Breadcrumb":
        - list:
          - listitem:
            - link "Base":
              - /url: "#base"
          - listitem:
            - button "Show full path"
          - listitem:
            - link "Line 2":
              - /url: "#line"
          - listitem: Settings
      - navigation "Pagination":
        - list:
          - listitem:
            - button "Previous page"
          - listitem:
            - button "Page 1": "1"
          - listitem:
            - button "Page 4": "4"
          - listitem:
            - button "Page 5": "5"
          - listitem:
            - button "Page 6": "6"
          - listitem:
            - button "Page 12": "12"
          - listitem:
            - button "Next page"
    `);
  });

  test('steps', { tag: at('navigation') }, async ({ page }) => {
    await render(
      page,
      `<punk-steps current="2" label="Setup">
         <punk-step>Drivers</punk-step>
         <punk-step>Network</punk-step>
         <punk-step>Account</punk-step>
       </punk-steps>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - list "Setup":
        - listitem: Drivers completed
        - listitem: Network
        - listitem: Account not started
    `);
    await expect(page.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step');
  });

  test(
    'menu, open, with checkable items and a submenu',
    { tag: at('overlays') },
    async ({ page }) => {
      await render(
        page,
        `<punk-button>File</punk-button>
       <punk-menu open>
         <punk-menu-item value="new">New<span slot="shortcut">Ctrl+N</span></punk-menu-item>
         <punk-menu-item value="save" disabled>Save</punk-menu-item>
         <punk-menu-item value="export">Export</punk-menu-item>
         <punk-menu><punk-menu-item value="png">As image</punk-menu-item></punk-menu>
         <hr>
         <punk-menu-item type="checkbox" value="grid" checked>Show grid</punk-menu-item>
         <punk-menu-item type="radio" value="small" checked>Small</punk-menu-item>
         <punk-menu-item type="radio" value="large">Large</punk-menu-item>
       </punk-menu>`,
      );
      await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - button "File" [expanded]
      - menu:
        - menuitem "New"
        - menuitem "Save" [disabled]
        - menuitem "Export"
        - separator
        - menuitemcheckbox "Show grid" [checked]
        - menuitemradio "Small" [checked]
        - menuitemradio "Large"
    `);
    },
  );

  test('drawer, open', { tag: at('overlays') }, async ({ page }) => {
    await render(
      page,
      `<punk-drawer heading="Filters" modal open>
         <p>Show belts</p>
         <punk-button slot="footer">Apply</punk-button>
       </punk-drawer>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - dialog "Filters":
        - text: Filters
        - button "Close"
        - paragraph: Show belts
        - button "Apply"
    `);
  });

  test('table, sorted, with a row selected', { tag: at('data') }, async ({ page }) => {
    await render(
      page,
      `<punk-table sort-key="name">
         <table>
           <caption>Stock</caption>
           <thead><tr>
             <th><input type="checkbox" data-punk-select-all aria-label="Select all"></th>
             <th data-sort="name"><button type="button">Item</button></th>
             <th data-sort="count"><button type="button">Count</button></th>
           </tr></thead>
           <tbody>
             <tr data-value="fe"><td><input type="checkbox" data-punk-select aria-label="Select Iron" checked></td><th scope="row">Iron</th><td>120</td></tr>
             <tr data-value="cu"><td><input type="checkbox" data-punk-select aria-label="Select Copper"></td><th scope="row">Copper</th><td>80</td></tr>
           </tbody>
         </table>
       </punk-table>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - table "Stock":
        - caption: Stock
        - rowgroup:
          - row "Select all Item Count":
            - columnheader "Select all":
              - checkbox "Select all" [checked=mixed]
            - columnheader "Item":
              - button "Item"
            - columnheader "Count":
              - button "Count"
        - rowgroup:
          - row "Select Iron Iron 120":
            - cell "Select Iron":
              - checkbox "Select Iron" [checked]
            - rowheader "Iron"
            - cell "120"
          - row "Select Copper Copper 80":
            - cell "Select Copper":
              - checkbox "Select Copper"
            - rowheader "Copper"
            - cell "80"
    `);
    await expect(page.getByRole('columnheader', { name: 'Item' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  test('alert, badge, spinner, and kbd', { tag: at('data') }, async ({ page }) => {
    await render(
      page,
      `<punk-alert variant="warning" heading="Belt blocked" dismissible>Clear it.</punk-alert>
       <punk-alert variant="danger" announce>Reactor offline</punk-alert>
       <punk-button>Alerts <punk-badge variant="warning">3</punk-badge></punk-button>
       <punk-spinner></punk-spinner>
       <punk-spinner>Loading recipes</punk-spinner>
       <punk-button>Save <punk-kbd>Ctrl</punk-kbd> + <punk-kbd>S</punk-kbd></punk-button>
       <p>Press <punk-kbd>Esc</punk-kbd> to close.</p>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Belt blocked Clear it.
      - button "Dismiss"
      - alert: Reactor offline
      - button "Alerts 3"
      - status: Loading
      - status: Loading recipes
      - button "Save Ctrl + S"
      - paragraph: Press Esc to close.
    `);
  });

  test('description list', { tag: at('data') }, async ({ page }) => {
    await render(
      page,
      `<punk-description-list>
         <dt>Speed</dt><dd>0.75</dd>
         <dt>Output</dt><dd>1,240 /min</dd><dd>80 MW</dd>
       </punk-description-list>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - term: Speed
      - definition: "0.75"
      - term: Output
      - definition: 1,240 /min
      - definition: 80 MW
    `);
  });

  test('tag', { tag: at('data') }, async ({ page }) => {
    await render(
      page,
      `<punk-tag>Idle</punk-tag>
       <punk-tag removable value="cu">Copper</punk-tag>
       <punk-tag removable disabled>Tin</punk-tag>`,
    );
    await expect(page.locator('#case')).toMatchAriaSnapshot(`
      - text: Idle Copper
      - button "Remove Copper"
      - text: Tin
      - button "Remove Tin" [disabled]
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
    test(`production stat, ${name}`, { tag: at('production') }, async ({ page }) => {
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
    test(`connection row, ${name}`, { tag: at('production') }, async ({ page }) => {
      await render(page, markup);
      await expect(page.locator('#case')).toMatchAriaSnapshot(expected);
    });
  }
});
