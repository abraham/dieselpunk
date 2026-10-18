import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSlot } from '@dieselpunk/core';
import '@dieselpunk/core/slot/register.js';
import { item, itemMarkup } from '../icons/items.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkSlot>('punk-slot');

const sizes = ['sm', 'md', 'lg'] as const;

const meta = preview.type<{ args: StoryArgs<PunkSlot> }>().meta({
  title: 'Components/Slot',
  tags: ['inventory'],
  component: 'punk-slot',
  args: { ...args, label: 'Engine slot', value: 'engine', 'default-slot': itemMarkup('gear') },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
The square receptacle for an item, a tool, or equipment. The host is the control: it has \`role="button"\` and is one tab stop. Inside a \`punk-slot-grid\` the grid takes over the role, the tab stop, and the selected state.

**Name:** the \`label\` is visually hidden text that names the slot. Put an image with \`alt\` or text in the slot instead if you prefer. A slot with neither warns in development builds.

**Selection:** the application owns \`selected\`. It is announced as a toggle (\`aria-pressed\`) only once it has been set, so a slot that was never meant to be selectable is not.

**Empty slot:** with nothing in it, the boundary is drawn in \`--punk-color-control-edge\`, which meets 3:1 in every theme.

**Keyboard**

| Key | Action |
| --- | --- |
| Tab | Moves focus to the slot and shows the focus ring |
| Enter | Activates it (\`punk-activate\`) |
| Space | Activates it on release, without scrolling the page |

**States** never depend on color alone: selected is a heavier ring, highlighted a dotted outline, invalid a frame and a hatched corner plus the word "invalid" in the accessible name, and disabled is flat and not focusable.

**Touch:** under a coarse pointer a slot renders at 40px or more.
`,
      },
    },
  },
});

export const Playground = meta.story();

const slots = () => html`
  <div class="wb-stack">
    ${group(
      'States',
      html`<div class="wb-row">
        <punk-slot label="Empty"></punk-slot>
        <punk-slot label="Gear">${item('gear')}</punk-slot>
        <punk-slot label="Selected gear" selected>${item('gear')}</punk-slot>
        <punk-slot label="Highlighted gear" highlighted>${item('gear')}</punk-slot>
        <punk-slot label="Invalid gear" invalid>${item('gear')}</punk-slot>
        <punk-slot label="Disabled gear" disabled>${item('gear')}</punk-slot>
      </div>`,
    )}
    ${group(
      'Empty and combined states',
      html`<div class="wb-row">
        <punk-slot label="Selected empty" selected></punk-slot>
        <punk-slot label="Invalid empty" invalid></punk-slot>
        <punk-slot label="Disabled empty" disabled></punk-slot>
        <punk-slot label="Selected, highlighted, and invalid" selected highlighted invalid>
          ${item('gear')}
        </punk-slot>
      </div>`,
    )}
    ${group(
      'Sizes',
      html`<div class="wb-row">
        ${sizes.map(
          (size) => html`<punk-slot label=${size} size=${size}>${item('module')}</punk-slot>`,
        )}
      </div>`,
    )}
    ${group(
      'Badge and overlay',
      html`<div class="wb-row">
        <punk-slot label="With a badge">
          ${item('circuit')}<span slot="badge" aria-hidden="true">+</span>
        </punk-slot>
        <punk-slot label="With an overlay">
          ${item('circuit')}<span slot="overlay" aria-hidden="true">×</span>
        </punk-slot>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 560px">${slots()}</div>`,
});

export const StandaloneSelection = meta.story({
  name: 'Standalone selection',
  render: () => html`
    <div class="wb-stack">
      <p>
        Outside a grid the application owns <code>selected</code>. Click or press Enter or Space to
        toggle it.
      </p>
      <div class="wb-row">
        ${['plate', 'circuit', 'coil'].map(
          (name) => html`
            <punk-slot
              label=${name}
              value=${name}
              @punk-activate=${(event: CustomEvent) => {
                const slot = event.currentTarget as PunkSlot;
                slot.selected = !slot.selected;
              }}
            >
              ${item(name as 'plate' | 'circuit' | 'coil')}
            </punk-slot>
          `,
        )}
      </div>
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(slots),
});
