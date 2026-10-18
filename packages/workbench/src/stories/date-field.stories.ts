import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkDateField } from '@dieselpunk/core';
import '@dieselpunk/core/date-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkDateField>('punk-date-field');

const meta = preview.type<{ args: StoryArgs<PunkDateField> }>().meta({
  title: 'Components/Date field',
  component: 'punk-date-field',
  args: { ...args, label: 'Delivery' },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A field for a date, with a native \`<input type="date">\` in its shadow tree that takes the focus.
It is the text field's frame, label, hint, affixes, and message around the platform's own date
input.

**The platform's picker.** How the date is shown and typed, and the calendar that opens, are the
browser's, in the browser's language rather than the page's. They are accessible in every engine,
which a calendar grid of the library's own would have to earn. \`value\`, \`min\`, and \`max\` are
always \`YYYY-MM-DD\`, whatever the display; a value that is not one is cleared and warns in
development.

**Form:** it submits \`value\` under \`name\`, a form reset puts back the \`value\` attribute, and
\`required\`, \`min\`, \`max\`, \`step\` (in days), and a date the user left incomplete are its
validity, with the browser's messages.
`,
      },
    },
  },
});

export const Playground = meta.story();

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Value, range, and a hint',
      html`<div class="wb-stack">
        <punk-date-field label="Delivery" value="2025-03-14"></punk-date-field>
        <punk-date-field label="Inspection" min="2025-01-01" max="2025-12-31">
          <span slot="hint">Any day this year.</span>
        </punk-date-field>
      </div>`,
    )}
    ${group(
      'States',
      html`<div class="wb-stack">
        <punk-date-field label="Commissioned" value="2024-11-02" readonly></punk-date-field>
        <punk-date-field label="Decommissioned" disabled></punk-date-field>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({ render: fields });

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(fields),
});
