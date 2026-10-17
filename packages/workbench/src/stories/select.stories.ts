import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSelect } from '@dieselpunk/core';
import '@dieselpunk/core/select/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkSelect>('punk-select');

const meta: Meta<StoryArgs<PunkSelect>> = {
  title: 'Components/Select',
  component: 'punk-select',
  args: { ...args, label: 'Squadron' },
  argTypes,
  render: (storyArgs) =>
    html`<div style="max-inline-size: 420px">
      ${template(
        storyArgs,
        html`<option value="a">Alpha</option>
          <option value="b">Beta</option>
          <option value="c">Gamma</option>`,
      )}
    </div>`,
  parameters: {
    docs: {
      description: {
        component: `
A single choice from a list, with a native \`<select>\` in its shadow tree. Write \`<option>\` and \`<optgroup>\` elements inside it: they are copied into the native select, and kept current by one observer on the host, which goes with the element. The open list is the platform's and cannot be themed; the closed control is, and the options get the panel colors only so a dark theme does not meet a white list.

**Options:** the options you wrote stay the source of truth. The user's choice is written to the \`selected\` property of the option, \`value\` and \`selectedIndex\` read it, and a form reset puts back each option's \`selected\` attribute. Without a selected option it is the first enabled one. Setting \`value\` to one no option has chooses nothing until an option with it arrives. A select with no options warns once.

**Form:** it submits the chosen option's value under \`name\`. A \`required\` select whose first option has an empty value and is the chosen one is missing a value, which is how a placeholder option works.

**Name, hint, and message:** as the text field: \`label\`, then \`aria-label\`, then a \`<label for>\`; a message waits until the user has left the field.

**Keyboard:** the platform's: Space or Alt+Down opens the list, the arrows and typing choose.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkSelect>>;

export const Playground: Story = {};

const fields = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Choice, and groups',
      html`<div class="wb-stack">
        <punk-select label="Squadron" value="b">
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
          <option value="c" disabled>Gamma</option>
        </punk-select>
        <punk-select label="Craft">
          <optgroup label="Light">
            <option value="s">Scout</option>
            <option value="f">Fighter</option>
          </optgroup>
          <optgroup label="Heavy">
            <option value="b">Bomber</option>
          </optgroup>
          <span slot="hint">Heavy craft need a longer runway.</span>
        </punk-select>
      </div>`,
    )}
    ${group(
      'Disabled',
      html`<punk-select label="Squadron" disabled>
        <option value="a">Alpha</option>
      </punk-select>`,
    )}
    ${group(
      'A placeholder, required, after the user has left it (click in and out)',
      html`<punk-select label="Squadron" required>
        <option value="">Choose a squadron</option>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
      </punk-select>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${fields()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(fields),
};
