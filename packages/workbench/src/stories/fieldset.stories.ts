import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkFieldset } from '@dieselpunk/core';
import '@dieselpunk/core/checkbox/register.js';
import '@dieselpunk/core/fieldset/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/text-field/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkFieldset>('punk-fieldset');

const meta: Meta<StoryArgs<PunkFieldset>> = {
  title: 'Components/Fieldset',
  component: 'punk-fieldset',
  args: {
    ...args,
    label: 'Cooling',
    'default-slot':
      '<punk-switch name="pumps" checked>Pumps</punk-switch><punk-checkbox name="vent">Vent excess heat</punk-checkbox>',
    'hint-slot': '<span slot="hint">Applies to every reactor.</span>',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A titled group of controls: a native \`<fieldset>\` and \`<legend>\` in its shadow tree around the slotted controls, so it is a \`group\` named by \`label\` (or the \`legend\` slot). The hint and the error summary in the \`error\` slot describe the group; the error shows with the warning triangle.

**Disabled:** \`disabled\` disables every native control and form-associated element inside it, as a native fieldset does, by setting their \`disabled\`. It remembers which ones it changed and enables exactly those again, so a control that was already disabled stays so. Controls in the \`legend\` slot stay enabled. Controls added deeper inside while it is disabled are found when its own children change.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkFieldset>>;

export const Playground: Story = {};

const fieldsets = () => html`
  <div class="wb-stack">
    ${group(
      'With a hint',
      html`<punk-fieldset label="Cooling">
        <punk-switch checked>Pumps</punk-switch>
        <punk-checkbox>Vent excess heat</punk-checkbox>
        <span slot="hint">Applies to every reactor.</span>
      </punk-fieldset>`,
    )}
    ${group(
      'Disabled',
      html`<punk-fieldset label="Remote control" disabled>
        <punk-text-field label="Station" value="North works"></punk-text-field>
        <punk-checkbox checked>Allow shutdown</punk-checkbox>
      </punk-fieldset>`,
    )}
    ${group(
      'With an error summary',
      html`<punk-fieldset label="Delivery">
        <punk-text-field label="Destination" value="South yard"></punk-text-field>
        <span slot="error">Choose a destination that has a free dock.</span>
      </punk-fieldset>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${fieldsets()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(fieldsets),
};
