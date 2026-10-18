import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkCombobox } from '@dieselpunk/core';
import '@dieselpunk/core/combobox/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkCombobox>('punk-combobox');

const options = [
  ['iron-plate', 'Iron plate'],
  ['copper-plate', 'Copper plate'],
  ['steel-plate', 'Steel plate'],
  ['iron-gear', 'Iron gear'],
  ['copper-cable', 'Copper cable'],
  ['circuit', 'Electronic circuit'],
  ['engine', 'Engine unit'],
];

const meta = preview.type<{ args: StoryArgs<PunkCombobox> }>().meta({
  title: 'Components/Combobox',
  tags: ['forms'],
  component: 'punk-combobox',
  args: { ...args, label: 'Item' },
  argTypes,
  render: (storyArgs) =>
    html`<div style="min-block-size: 300px">
      ${template(
        storyArgs,
        html`${options.map(([value, label]) => html`<option value=${value}>${label}</option>`)}`,
      )}
    </div>`,
  parameters: {
    docs: {
      description: {
        component: `
A text field with a list of suggestions: the APG combobox, with a native \`<input role="combobox">\` and a \`listbox\` in the top layer below it. Write \`<option>\` elements inside it, as in a select.

**Filtering:** typing shows the options whose label contains the text. With \`filter="none"\` every option shows, and the application filters by replacing the options on \`input\`; the list watches its options only while it is open.

**Keyboard:** Down and Up open the list and move through it without wrapping, Alt+Down opens it without moving, Enter or a click chooses the active option, and Escape closes the list and keeps the text. The active option is \`aria-activedescendant\`, so focus stays in the field.

**Value:** leaving the field keeps a choice: the text becomes the chosen option's label, or, with \`allow-custom\`, the text is the value. It submits \`value\` under \`name\`, and \`change\` is sent once for each value the user commits.
`,
      },
    },
  },
});

export const Playground = meta.story();

const fields = () => html`
  <div class="wb-stack">
    ${group(
      'Chosen, with a hint',
      html`<punk-combobox label="Item" value="iron-gear"
        >${options.map(([value, label]) => html`<option value=${value}>${label}</option>`)}<span
          slot="hint"
          >Type to filter.</span
        ></punk-combobox
      >`,
    )}
    ${group(
      'Free text',
      html`<punk-combobox label="Station name" allow-custom value="North works"
        ><option value="North works">North works</option>
        <option value="South yard">South yard</option></punk-combobox
      >`,
    )}
    ${group(
      'Disabled',
      html`<punk-combobox label="Item" value="engine" disabled
        >${options.map(([value, label]) => html`<option value=${value}>${label}</option>`)}</punk-combobox
      >`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${fields()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(fields),
});
