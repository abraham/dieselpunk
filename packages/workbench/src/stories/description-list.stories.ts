import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkDescriptionList } from '@dieselpunk/core';
import '@dieselpunk/core/description-list/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { argTypes } = getStorybookHelpers<PunkDescriptionList>('punk-description-list');

const meta = preview.type<{ args: StoryArgs<PunkDescriptionList> }>().meta({
  title: 'Components/Description list',
  component: 'punk-description-list',
  argTypes,
  render: () => html`
    <punk-description-list style="max-inline-size: 480px">
      <dt>Recipe</dt>
      <dd>Precision gear</dd>
      <dt>Crafting speed</dt>
      <dd>0.75</dd>
      <dt>Output</dt>
      <dd>1,240 /min</dd>
      <dd>80 MW</dd>
    </punk-description-list>
  `,
  parameters: {
    docs: {
      description: {
        component: `
Label and value pairs, for details and specification sheets. Write native \`<dt>\` and \`<dd>\`
elements as its children; the element puts them in a \`<dl>\` in its shadow tree, so a screen
reader hears terms and definitions.

Each term sits beside its values, which use tabular figures so numbers line up, and above them
when the element is narrower than 320px. A term may have several values, and several terms may
share one. A child that is not a \`<dt>\` or a \`<dd>\`, or a list that starts with a \`<dd>\`,
warns in development.
`,
      },
    },
  },
});

export const Playground = meta.story();

const sheet = () => html`
  <punk-description-list>
    <dt>Machine</dt>
    <dd>Assembler 03</dd>
    <dt>Crafting speed</dt>
    <dd>0.75</dd>
    <dt>Power</dt>
    <dd>150 kW idle</dd>
    <dd>375 kW working</dd>
  </punk-description-list>
`;

const lists = () => html`
  <div class="wb-stack">
    ${group('Wide', html`<div style="max-inline-size: 480px">${sheet()}</div>`)}
    ${group('Narrow', html`<div style="max-inline-size: 240px">${sheet()}</div>`)}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${lists()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(lists),
});
