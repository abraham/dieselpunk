import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkKbd } from '@dieselpunk/core';
import '@dieselpunk/core/kbd/register.js';
import '@dieselpunk/core/button/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkKbd>('punk-kbd');

const meta: Meta<StoryArgs<PunkKbd>> = {
  title: 'Components/Kbd',
  component: 'punk-kbd',
  args: { ...args, 'default-slot': 'Ctrl' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
One keyboard key, drawn as a keycap around a native \`<kbd>\`. A shortcut is several keys with
the application's own text between them, so "Ctrl + S" reads in order and is translated with the
page. The key names are the application's text: write words a screen reader can say, such as
"Up arrow", where a symbol alone would be read as punctuation or not at all.

It has no role, and its text joins the name of the element that holds it: a button "Save Ctrl + S".
A key with no text warns in development.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkKbd>>;

export const Playground: Story = {};

const keys = () => html`
  <div class="wb-stack">
    ${group(
      'Keys and a shortcut',
      html`<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px">
        <punk-kbd>Esc</punk-kbd>
        <punk-kbd>Enter</punk-kbd>
        <span><punk-kbd>Ctrl</punk-kbd> + <punk-kbd>Shift</punk-kbd> + <punk-kbd>P</punk-kbd></span>
      </div>`,
    )}
    ${group(
      'In text and in a button',
      html`<div class="wb-stack">
        <p style="margin: 0">Press <punk-kbd>Esc</punk-kbd> to close the window.</p>
        <punk-button>Save <punk-kbd>Ctrl</punk-kbd> + <punk-kbd>S</punk-kbd></punk-button>
      </div>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${keys()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(keys),
};
