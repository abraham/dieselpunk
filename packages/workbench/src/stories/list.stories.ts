import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkList } from '@dieselpunk/core';
import '@dieselpunk/core/badge/register.js';
import '@dieselpunk/core/list/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkList>('punk-list');

const rows = `
  <punk-list-item value="smelter">Iron smelter<span slot="description">Running, 92%</span><span slot="end">12/min</span></punk-list-item>
  <punk-list-item value="press">Plate press<span slot="description">Waiting for ore</span><span slot="end">0/min</span></punk-list-item>
  <punk-list-item value="assembler" disabled>Gear assembler<span slot="description">Offline</span></punk-list-item>
  <punk-list-item value="lab">Research lab<span slot="description">Running</span><span slot="end">4/min</span></punk-list-item>
`;

const meta = preview.type<{ args: StoryArgs<PunkList> }>().meta({
  title: 'Components/List',
  component: 'punk-list',
  args: { ...args, 'aria-label': 'Machines', selection: 'single', 'default-slot': rows },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A one-column list of \`punk-list-item\` rows: files, queues, search results, settings. Give it an \`aria-label\`. Each row has a start slot, its text, a description, and an end slot; all of its text is its name.

**Without selection** (the default) it is a \`list\` of \`listitem\` rows that take no focus, so put buttons or links inside rows for actions.

**With \`single\` or \`multiple\`** it is a \`listbox\` of \`option\` rows with one tab stop. Up and Down move focus without wrapping, Home and End go to the ends, Space and a click select (or toggle in \`multiple\`), Shift with an arrow or a click extends the selection, and Ctrl+A selects everything. Moving focus never selects. Enter and a click activate a row with \`punk-activate\`.

**Values:** rows are identified by \`value\`. \`values\` reads and assigns the selection, rows marked \`selected\` start selected, and \`punk-selection-change\` reports each change the user makes. A selected row shows a check and an accent bar, so selection is a shape and not only a color.
`,
      },
    },
  },
});

export const Playground = meta.story();

const lists = () => html`
  <div class="wb-stack">
    ${group(
      'A plain list',
      html`<punk-list aria-label="Recent alerts">
        <punk-list-item
          >Belt 3 blocked<span slot="end"
            ><punk-badge variant="warning">2</punk-badge></span
          ></punk-list-item
        >
        <punk-list-item>Reactor at 92%<span slot="description">5 minutes ago</span></punk-list-item>
      </punk-list>`,
    )}
    ${group(
      'Multiple selection',
      html`<punk-list aria-label="Machines" selection="multiple">
        <punk-list-item value="a" selected
          >Iron smelter<span slot="description">Running</span></punk-list-item
        >
        <punk-list-item value="b"
          >Plate press<span slot="description">Waiting for ore</span></punk-list-item
        >
        <punk-list-item value="c" disabled
          >Gear assembler<span slot="description">Offline</span></punk-list-item
        >
      </punk-list>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 420px">${lists()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(lists),
});
