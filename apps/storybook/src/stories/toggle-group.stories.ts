import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkToggleGroup } from '@dieselpunk/core';
import '@dieselpunk/core/toggle-group/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkToggleGroup>('punk-toggle-group');

const meta: Meta<StoryArgs<PunkToggleGroup>> = {
  title: 'Components/Toggle Group',
  component: 'punk-toggle-group',
  args: {
    ...args,
    'aria-label': 'View',
    'default-slot':
      '<button value="grid" aria-checked="true">Grid</button><button value="list">List</button><button value="map">Map</button>',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A set of native \`<button>\` children that stay pressed: view modes, alignment, filters. Give it an \`aria-label\`; each button is identified by its \`value\` and named by its text or \`aria-label\`.

**Single** (the default) is a \`radiogroup\` of \`radio\` buttons: the arrow keys move and choose together, and one stays pressed once the user has chosen. **Multiple** is a \`group\` of toggle buttons with \`aria-pressed\`: the arrow keys only move focus, and a click, Enter, or Space presses or releases.

**Keyboard:** one tab stop. Left and Right (swapped in right-to-left languages), Up and Down, Home, and End move without wrapping and skip disabled buttons.

**Values:** \`values\` reads and assigns the pressed values; buttons the markup marks \`aria-pressed="true"\` or \`aria-checked="true"\` start pressed. \`punk-selection-change\` reports each change the user makes. The group owns each button's role, state, and \`tabindex\`, and gives back what the author had.

**Look:** a pressed button is set into the strip with an accent bar along its foot, so the state is a shape and not only a color.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkToggleGroup>>;

export const Playground: Story = {};

const groups = () => html`
  <div class="wb-stack">
    ${group(
      'Single',
      html`<punk-toggle-group aria-label="View">
        <button value="grid" aria-checked="true">Grid</button>
        <button value="list">List</button>
        <button value="map" disabled>Map</button>
      </punk-toggle-group>`,
    )}
    ${group(
      'Multiple',
      html`<punk-toggle-group aria-label="Show" selection="multiple">
        <button value="belts" aria-pressed="true">Belts</button>
        <button value="pipes">Pipes</button>
        <button value="power" aria-pressed="true">Power</button>
      </punk-toggle-group>`,
    )}
    ${group(
      'Disabled',
      html`<punk-toggle-group aria-label="Speed" disabled>
        <button value="1" aria-checked="true">1×</button>
        <button value="2">2×</button>
      </punk-toggle-group>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${groups()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(groups),
};
