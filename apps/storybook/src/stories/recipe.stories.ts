import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkRecipe } from '@dieselpunk/core';
import '@dieselpunk/core/recipe/register.js';
import { item, itemMarkup } from '../icons/items.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkRecipe>('punk-recipe');

const meta: Meta<StoryArgs<PunkRecipe>> = {
  title: 'Components/Recipe',
  component: 'punk-recipe',
  args: {
    ...args,
    name: 'Gearbox',
    value: 'gearbox',
    duration: 2,
    available: true,
    craftableCount: 3,
    'icon-slot': itemMarkup('gear', 'icon'),
    'ingredients-slot': '<span slot="ingredients">2 gears, 1 circuit</span>',
    'products-slot': '<span slot="products">Gearbox</span>',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A selectable recipe tile: a name, a craft time, whether it can be made, and what it uses and makes. It is a tile, not a square receptacle, and it grows with its content.

**Name:** use \`name\`, not \`aria-label\`. The accessible name is the tile's text in reading order (name, duration, availability, ingredients, products), and an \`aria-label\` would drop the ingredients.

**Availability** is a word, never dimming or color: "unavailable", or "can craft N" when it can be made and the count is above zero. The chip is solid when the recipe can be made and dashed when it cannot.

**Duration** is in seconds and formatted for the nearest \`lang\` ("0.5 sec", "12 Sek.").

**Selection:** like a slot, the application owns \`selected\`, announced as \`aria-pressed\`.

**Keyboard**

| Key | Action |
| --- | --- |
| Tab | Moves focus to the tile and shows the focus ring |
| Enter | Activates it (\`punk-activate\`) |
| Space | Activates it on release, without scrolling the page |
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkRecipe>>;

export const Playground: Story = {};

const needs = html`<span slot="ingredients">2 gears, 1 circuit</span>`;
const makes = html`<span slot="products">Gearbox</span>`;

const recipes = () => html`
  <div class="wb-stack">
    ${group(
      'Availability',
      html`<div class="wb-stack">
        <punk-recipe name="Gearbox" duration="0.5" available craftable-count="3">
          ${item('gear', 'icon')}${needs}${makes}
        </punk-recipe>
        <punk-recipe name="Gearbox" duration="12" available>
          ${item('gear', 'icon')}${needs}${makes}
        </punk-recipe>
        <punk-recipe name="Gearbox" duration="1.25"
          >${item('gear', 'icon')}${needs}${makes}</punk-recipe
        >
      </div>`,
    )}
    ${group(
      'Selected and disabled',
      html`<div class="wb-stack">
        <punk-recipe name="Gearbox" duration="12" available selected>
          ${item('gear', 'icon')}${needs}${makes}
        </punk-recipe>
        <punk-recipe name="Gearbox" duration="3" available disabled>
          ${item('gear', 'icon')}${needs}${makes}
        </punk-recipe>
      </div>`,
    )}
    ${group(
      'Missing parts',
      html`<div class="wb-stack">
        <punk-recipe name="Smelt plate" available>${needs}</punk-recipe>
        <punk-recipe name="Smelt plate" available>${makes}</punk-recipe>
        <punk-recipe name="Smelt plate" available craftable-count="1200">
          ${item('plate', 'icon')}
        </punk-recipe>
      </div>`,
    )}
    ${group(
      'A long name wraps',
      html`<punk-recipe
        name="Advanced electronic circuit with a very long descriptive name that must wrap"
        duration="6"
        available
      >
        ${item('circuit', 'icon')}${needs}${makes}
      </punk-recipe>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 520px">${recipes()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(recipes),
};
