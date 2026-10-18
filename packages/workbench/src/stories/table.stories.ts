import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTable } from '@dieselpunk/core';
import '@dieselpunk/core/table/register.js';
import { group } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTable>('punk-table');

const stock = [
  ['fe', 'Iron plate', 1204, 'Smelted on site'],
  ['cu', 'Copper plate', 806, 'Imported from the south yard'],
  ['gear', 'Iron gear', 120, 'Assembled'],
  ['circuit', 'Electronic circuit', 64, 'Assembled'],
] as const;

const tableHtml = `
  <table>
    <caption>Stock</caption>
    <thead><tr>
      <th><input type="checkbox" data-punk-select-all aria-label="Select all items"></th>
      <th data-sort="name"><button type="button">Item</button></th>
      <th data-sort="count"><button type="button">Count</button></th>
      <th>Note</th>
    </tr></thead>
    <tbody>
      ${stock
        .map(
          ([value, name, count, note]) =>
            `<tr data-value="${value}"><td><input type="checkbox" data-punk-select aria-label="Select ${name}"></td><th scope="row">${name}</th><td>${count}</td><td>${note}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
`;

/** Reorders the rows when the user sorts, as an application does. */
const sort = (event: CustomEvent<{ key: string; direction: string }>) => {
  const table = (event.currentTarget as HTMLElement).querySelector('tbody');
  if (!table) return;
  const column = event.detail.key === 'name' ? 1 : 2;
  const rows = [...table.rows].sort((a, b) => {
    const [x, y] = [a.cells[column]?.textContent ?? '', b.cells[column]?.textContent ?? ''];
    const order = column === 2 ? Number(x) - Number(y) : x.localeCompare(y);
    return event.detail.direction === 'ascending' ? order : -order;
  });
  table.append(...rows);
};

const meta = preview.type<{ args: StoryArgs<PunkTable> }>().meta({
  title: 'Components/Table',
  component: 'punk-table',
  args: { ...args, 'default-slot': tableHtml },
  argTypes,
  render: (storyArgs) => html`<div @punk-sort-change=${sort}>${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
Tabular data in a native \`<table>\` you write inside it, which keeps its own semantics; give it a \`<caption>\` or an \`aria-label\`. The table scrolls sideways inside the element, and while it overflows the scroll area is a focusable \`region\` named like the table. \`--punk-table-max-height\` keeps the header row in view while the body scrolls.

**Look:** the element adds one stylesheet to the table's document or shadow root, scoped to \`punk-table > table\` and inside \`:where()\`, so any rule of yours wins.

**Sorting** is yours: a header cell with \`data-sort="key"\` and a \`<button>\` inside is sortable. A click sets \`aria-sort\`, cycling ascending and descending, and sends \`punk-sort-change\` with \`{ key, direction }\`; you reorder the rows. The arrow on the button is a shape for each direction.

**Selection** is by checkboxes you place: \`data-punk-select\` in a row (\`<tr data-value>\`) and \`data-punk-select-all\` in the header, which shows whether all or some rows are selected. Selected rows get \`data-selected\` and an accent bar, and \`punk-selection-change\` reports each change.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const States = meta.story({
  render: () => html`
    <div class="wb-stack" @punk-sort-change=${sort}>
      ${group(
        'Sorted by count, with a row selected',
        html`<punk-table sort-key="count" sort-direction="descending">
          <table>
            <caption>
              Stock
            </caption>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" data-punk-select-all aria-label="Select all items" />
                </th>
                <th data-sort="name"><button type="button">Item</button></th>
                <th data-sort="count"><button type="button">Count</button></th>
              </tr>
            </thead>
            <tbody>
              <tr data-value="fe">
                <td>
                  <input type="checkbox" data-punk-select aria-label="Select Iron plate" checked />
                </td>
                <th scope="row">Iron plate</th>
                <td>1204</td>
              </tr>
              <tr data-value="cu">
                <td><input type="checkbox" data-punk-select aria-label="Select Copper plate" /></td>
                <th scope="row">Copper plate</th>
                <td>806</td>
              </tr>
            </tbody>
          </table>
        </punk-table>`,
      )}
      ${group(
        'In a narrow container, scrolling inside itself',
        html`<div style="max-inline-size: 280px">
          <punk-table>
            <table>
              <caption>
                Shipments
              </caption>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Iron plate</td>
                  <td>North works</td>
                  <td>South yard</td>
                  <td>400</td>
                </tr>
                <tr>
                  <td>Copper cable</td>
                  <td>South yard</td>
                  <td>Research lab</td>
                  <td>1200</td>
                </tr>
              </tbody>
            </table>
          </punk-table>
        </div>`,
      )}
    </div>
  `,
});
