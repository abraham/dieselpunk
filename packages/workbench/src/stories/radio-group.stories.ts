import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkRadioGroup } from '@dieselpunk/core';
import '@dieselpunk/core/radio-group/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkRadioGroup>('punk-radio-group');

const radios =
  '<punk-radio value="coal">Coal</punk-radio><punk-radio value="solar" checked>Solar</punk-radio><punk-radio value="wind" disabled>Wind</punk-radio><punk-radio value="nuclear">Nuclear</punk-radio>';

const meta = preview.type<{ args: StoryArgs<PunkRadioGroup> }>().meta({
  title: 'Components/Radio Group',
  tags: ['forms'],
  component: 'punk-radio-group',
  subcomponents: { 'punk-radio': 'punk-radio' },
  args: { ...args, label: 'Power source', 'default-slot': radios },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
One choice from a small set of \`punk-radio\` children, every one of them visible: the standard alternative to a select when the user should see each option. It takes part in a form: it submits the chosen radio's \`value\` under \`name\`, a form reset goes back to the radios marked \`checked\`, and \`required\` with nothing chosen is \`valueMissing\`, with the browser's message once the user has left the group.

**Name:** \`label\` is the name of the \`radiogroup\` and the text above it; without it, use \`aria-label\`. Each radio is named by its text.

**Keyboard:** one tab stop, on the chosen radio or else the first enabled one. The arrow keys move to the next or previous enabled radio and choose it, without wrapping; Left and Right swap in right-to-left languages. Space and a click choose. \`input\` and \`change\` are sent once for each choice the user makes.

**Look:** a ring with the \`control-edge\` boundary, and a dot while checked, so the choice is a shape and not only a color. \`orientation="horizontal"\` lays the radios out in a row.
`,
      },
    },
  },
});

export const Playground = meta.story();

const groups = () => html`
  <div class="wb-stack">
    ${group(
      'Vertical, with a hint',
      html`<punk-radio-group label="Power source" name="power">
        <punk-radio value="coal">Coal</punk-radio>
        <punk-radio value="solar" checked>Solar</punk-radio>
        <punk-radio value="wind" disabled>Wind</punk-radio>
        <span slot="hint">Wind turbines are offline for maintenance.</span>
      </punk-radio-group>`,
    )}
    ${group(
      'Horizontal',
      html`<punk-radio-group label="Belt speed" orientation="horizontal">
        <punk-radio value="1" checked>Slow</punk-radio>
        <punk-radio value="2">Fast</punk-radio>
        <punk-radio value="3">Express</punk-radio>
      </punk-radio-group>`,
    )}
    ${group(
      'Disabled',
      html`<punk-radio-group label="Shift" disabled>
        <punk-radio value="day" checked>Day</punk-radio>
        <punk-radio value="night">Night</punk-radio>
      </punk-radio-group>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${groups()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(groups),
});
