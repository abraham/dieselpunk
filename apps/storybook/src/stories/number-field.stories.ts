import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkNumberField } from '@dieselpunk/core';
import '@dieselpunk/core/number-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkNumberField>('punk-number-field');

const meta: Meta<StoryArgs<PunkNumberField>> = {
  title: 'Components/Number field',
  component: 'punk-number-field',
  args: { ...args, label: 'Thrust', value: '3', min: 0, max: 10 },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A field for a number, with a native \`<input type="number">\` in its shadow tree, so validity, rounding to \`step\`, and the spinbutton role are the platform's. It takes part in a form: it submits \`value\` under \`name\`, and a form reset puts \`value\` back to the attribute the markup had. \`rangeUnderflow\`, \`rangeOverflow\`, \`stepMismatch\`, \`badInput\`, and \`valueMissing\` are native's.

**Value:** \`value\` is the text the user sees, and \`valueAsNumber\` the number, or \`NaN\` while the field is empty. The component does not format the number: parsing and display follow the engine and the user's locale, so a German user may type a comma. A \`min\` above \`max\`, or a \`step\` that is not above 0, is repaired with one warning.

**Keyboard:** Up and Down step, and typing works as in a native field.

**Pointer:** the two steppers step by \`step\`, and hold to repeat after 400ms, every 80ms. They are out of the tab order and the accessibility tree, since the keys already serve everyone else, and a press never takes focus from the input. \`input\` is sent on each step and \`change\` when the press ends. \`hide-steppers\` removes them. They do not step while the field is disabled or read-only.

**Name, hint, and message:** as the text field: \`label\`, then \`aria-label\`, then a \`<label for>\`; a message waits until the user has left the field.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkNumberField>>;

export const Playground: Story = {};

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Range, a step, and a unit',
      html`<div class="wb-stack">
        <punk-number-field label="Thrust" value="3" min="0" max="10"></punk-number-field>
        <punk-number-field label="Power" value="40" step="5">
          <span slot="suffix">kW</span>
          <span slot="hint">In steps of five.</span>
        </punk-number-field>
        <punk-number-field label="Ratio" value="0.3" min="0" max="1" step="0.1"></punk-number-field>
      </div>`,
    )}
    ${group(
      'Without steppers, read-only, and disabled',
      html`<div class="wb-stack">
        <punk-number-field label="Thrust" value="3" hide-steppers></punk-number-field>
        <punk-number-field label="Thrust" value="3" readonly></punk-number-field>
        <punk-number-field label="Thrust" value="3" disabled></punk-number-field>
      </div>`,
    )}
    ${group(
      'Out of range, after the user has left it (click in and out)',
      html`<div class="wb-stack">
        <punk-number-field label="Thrust" value="11" max="10"></punk-number-field>
        <punk-number-field label="Thrust" required></punk-number-field>
      </div>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${fields()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(fields),
};
