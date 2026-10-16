import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkItemStack } from '@dieselpunk/core';
import '@dieselpunk/core/item-stack/register.js';
import { item, itemLabels, itemMarkup } from '../icons/items.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkItemStack>('punk-item-stack');

const meta: Meta<StoryArgs<PunkItemStack>> = {
  title: 'Components/Item Stack',
  component: 'punk-item-stack',
  args: {
    ...args,
    name: itemLabels.module,
    value: 'module',
    count: 1234,
    'icon-slot': itemMarkup('module', 'icon'),
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
An item with its count, durability, and quality, in the same receptacle as a \`punk-slot\`. It is a separate component, not a slot with a child, so a grid never has an option inside an option.

**Name:** use \`name\`, not \`aria-label\`. The accessible name is built from the name, the full quantity ("Speed module, 1,234" or "Speed module, 75 of 100"), the durability, and the quality; an \`aria-label\` would replace all of that.

**Count:** hidden when it is 1, and shown as \`count/capacity\` when there is a capacity. \`compact-count\` abbreviates only the visible number ("1.2K"); the accessible text always has the full one.

**Durability** is a fraction from 0 to 1 drawn as a bar. Its fill is solid, diagonally hatched, or cross-hatched as it falls, so it reads without color. **Quality** is 0 to 5 diamonds.

Values out of range are clamped and warn in development builds.

**Keyboard:** the same as \`punk-slot\`: Tab to focus, Enter and Space to activate.

Importing \`item-stack/register.js\` does not register \`punk-slot\`.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkItemStack>>;

export const Playground: Story = {};

const stacks = () => html`
  <div class="wb-stack">
    ${group(
      'Counts',
      html`<div class="wb-row">
        ${[1, 99, 1234, 1234567].map(
          (count) => html`
            <punk-item-stack name=${itemLabels.plate} .count=${count}>
              ${item('plate', 'icon')}
            </punk-item-stack>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Compact counts',
      html`<div class="wb-row">
        ${[1234, 1234567].map(
          (count) => html`
            <punk-item-stack name=${itemLabels.plate} .count=${count} compact-count>
              ${item('plate', 'icon')}
            </punk-item-stack>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Capacity, and an empty count',
      html`<div class="wb-row">
        <punk-item-stack name=${itemLabels.coil} count="75" capacity="100">
          ${item('coil', 'icon')}
        </punk-item-stack>
        <punk-item-stack name=${itemLabels.coil} count="0">${item('coil', 'icon')}</punk-item-stack>
      </div>`,
    )}
    ${group(
      'Durability',
      html`<div class="wb-row">
        ${[1, 0.4, 0.1].map(
          (durability) => html`
            <punk-item-stack name=${itemLabels.circuit} .durability=${durability}>
              ${item('circuit', 'icon')}
            </punk-item-stack>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Quality',
      html`<div class="wb-row">
        ${[1, 3, 5].map(
          (quality) => html`
            <punk-item-stack name=${itemLabels.module} .quality=${quality} count="4">
              ${item('module', 'icon')}
            </punk-item-stack>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Selected, highlighted, invalid, and disabled',
      html`<div class="wb-row">
        <punk-item-stack name=${itemLabels.gear} count="12" selected>
          ${item('gear', 'icon')}
        </punk-item-stack>
        <punk-item-stack name=${itemLabels.gear} count="12" highlighted>
          ${item('gear', 'icon')}
        </punk-item-stack>
        <punk-item-stack name=${itemLabels.gear} count="12" invalid>
          ${item('gear', 'icon')}
        </punk-item-stack>
        <punk-item-stack name=${itemLabels.gear} count="12" disabled>
          ${item('gear', 'icon')}
        </punk-item-stack>
      </div>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 560px">${stacks()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(stacks),
};
