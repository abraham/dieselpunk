import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTimeField } from '@dieselpunk/core';
import '@dieselpunk/core/time-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTimeField>('punk-time-field');

const meta: Meta<StoryArgs<PunkTimeField>> = {
  title: 'Components/Time field',
  component: 'punk-time-field',
  args: { ...args, label: 'Shift start' },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A field for a time of day, with a native \`<input type="time">\` in its shadow tree that takes
the focus. It is the text field's frame, label, hint, affixes, and message around the platform's
own time input.

**The platform's picker.** Whether the time shows on a 12- or 24-hour clock, and the picker, are
the browser's, in the browser's language. \`value\`, \`min\`, and \`max\` are always \`HH:MM\`, or
\`HH:MM:SS\` with seconds; a value that is not one is cleared and warns in development. \`step\` is
in seconds, and one below 60 lets the user set seconds.

**Form:** as the date field, with \`required\`, \`min\`, \`max\`, \`step\`, and an incomplete time as
its validity.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkTimeField>>;

export const Playground: Story = {};

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Value, range, and a suffix',
      html`<div class="wb-stack">
        <punk-time-field label="Shift start" value="06:30"></punk-time-field>
        <punk-time-field label="Inspection" min="08:00" max="17:00">
          <span slot="suffix">UTC</span>
        </punk-time-field>
      </div>`,
    )}
    ${group(
      'States',
      html`<div class="wb-stack">
        <punk-time-field label="Logged at" value="06:30:15" step="1" readonly></punk-time-field>
        <punk-time-field label="Shift end" disabled></punk-time-field>
      </div>`,
    )}
  </div>
`;

export const States: Story = { render: fields };

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(fields),
};
