import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { PunkSelectionChangeDetail, PunkSlotGrid } from '@dieselpunk/core';
import '@dieselpunk/core/slot-grid/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/item-stack/register.js';
import { item, itemLabels, itemMarkup, itemNames } from '../icons/items.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes } = getStorybookHelpers<PunkSlotGrid>('punk-slot-grid');

const stackMarkup = (index: number): string => {
  const name = itemNames[index % itemNames.length] ?? 'gear';
  return `<punk-item-stack name="${itemLabels[name]}" value="i${index + 1}" count="${
    ((index * 37) % 99) + 1
  }">${itemMarkup(name, 'icon')}</punk-item-stack>`;
};

const stacks = (count: number): string =>
  Array.from({ length: count }, (_, index) => stackMarkup(index)).join('');

const meta: Meta<StoryArgs<PunkSlotGrid>> = {
  title: 'Components/Slot Grid',
  component: 'punk-slot-grid',
  args: {
    ...args,
    columns: 4,
    selection: 'multiple',
  },
  argTypes,
  // The grid needs a name from the application, which the generated template cannot add.
  render: (storyArgs) => html`
    <punk-slot-grid
      aria-label="Cargo"
      columns=${ifDefined(storyArgs.columns)}
      selection=${storyArgs.selection ?? 'none'}
      ?disabled=${storyArgs.disabled}
    >
      ${unsafeHTML(stacks(8))}
    </punk-slot-grid>
  `,
  parameters: {
    docs: {
      description: {
        component: `
A responsive, keyboard-navigable grid of \`punk-slot\` or \`punk-item-stack\` children. It owns each item's role, tab stop, and selected state, and listens once on itself rather than on every item.

**Name:** the application gives the grid an \`aria-label\` (for example "Module slots"). A missing one warns in development builds.

**Roles:** with \`selection="none"\` the grid is a \`group\` of buttons. With \`single\` or \`multiple\` it is a \`listbox\` of \`option\` items (and \`aria-multiselectable\` for multiple). It is not \`role="grid"\`, since a wrapping CSS grid has no rows and cells. Not yet checked by hand with a screen reader; automated checks cover the tree.

**Focus and selection are separate.** Exactly one item is a tab stop, and moving focus never changes the selection. Tab enters at the item that last had focus, else the first selected, else the first enabled one.

**Events:** \`punk-selection-change\` (\`{ values, items }\`) for changes the user makes, and the bubbling \`punk-activate\` from its items. Assigning \`values\` does not fire it.

**Layout:** \`columns\` is the most columns wanted. In a narrower container the column count falls before the slots shrink, down to one.

**Keyboard** (the horizontal arrows swap in right-to-left)

| Key | Action |
| --- | --- |
| Left, Right | Move to the neighbor in reading order, continuing onto the next or previous row; nothing wraps from the last item to the first |
| Up, Down | Move to the item in the adjacent row nearest the same column |
| Home, End | First and last item of the row |
| Ctrl+Home, Ctrl+End | First and last item of the grid |
| Space | Selects the focused item (single) or toggles it (multiple); activates it when selection is none |
| Enter | Activates the focused item; never changes the selection |
| Shift+Arrow (multiple) | Moves focus and extends the selection from the anchor |
| Ctrl+A (multiple) | Selects every enabled item |

**Pointer:** a click selects (single), toggles (multiple), or only activates (none). Shift+click extends the selection in multiple. A click always activates.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkSlotGrid>>;

export const Playground: Story = {};

const report = (event: CustomEvent<PunkSelectionChangeDetail>) => {
  const output = (event.currentTarget as HTMLElement).parentElement?.querySelector('output');
  if (output) output.textContent = event.detail.values.join(', ') || 'nothing';
};

const slotItems = (disabled: readonly string[] = []) =>
  ['s1', 's2', 's3', 's4', 's5', 's6'].map(
    (value, index) => html`
      <punk-slot label=${`Slot ${index + 1}`} value=${value} ?disabled=${disabled.includes(value)}>
        ${index === 4 ? '' : item(index % 2 ? 'gear' : 'coil')}
      </punk-slot>
    `,
  );

const modes = () => html`
  <div class="wb-stack">
    ${group(
      'None: a group of buttons',
      html`<div class="wb-stack">
        <punk-slot-grid
          aria-label="Tools"
          columns="3"
          @punk-activate=${(event: CustomEvent<{ value: string }>) => {
            const output = (event.currentTarget as HTMLElement).parentElement?.querySelector(
              'output',
            );
            if (output) output.textContent = `activated ${event.detail.value}`;
          }}
        >
          ${slotItems(['s3'])}
        </punk-slot-grid>
        <output class="wb-caption">Nothing activated</output>
      </div>`,
    )}
    ${group(
      'Single: a listbox',
      html`<div class="wb-stack">
        <punk-slot-grid
          aria-label="Equipment"
          selection="single"
          columns="3"
          .values=${['s2']}
          @punk-selection-change=${report}
        >
          ${slotItems(['s3'])}
        </punk-slot-grid>
        <output class="wb-caption">s2</output>
      </div>`,
    )}
    ${group(
      'Multiple: a multiselectable listbox',
      html`<div class="wb-stack">
        <punk-slot-grid
          aria-label="Modules"
          selection="multiple"
          columns="3"
          .values=${['s1', 's4']}
          @punk-selection-change=${report}
        >
          ${slotItems()}
        </punk-slot-grid>
        <output class="wb-caption">s1, s4</output>
      </div>`,
    )}
    ${group(
      'Disabled grid',
      html`<punk-slot-grid
        aria-label="Locked slots"
        selection="single"
        columns="3"
        disabled
        .values=${['s1']}
      >
        ${slotItems()}
      </punk-slot-grid>`,
    )}
  </div>
`;

export const SelectionModes: Story = {
  name: 'Selection modes',
  render: () => html`<div style="max-inline-size: 480px">${modes()}</div>`,
};

export const GridOfStacks: Story = {
  name: 'Grid of item stacks',
  render: () => html`
    <div class="wb-stack">
      <punk-slot-grid
        aria-label="Cargo"
        selection="multiple"
        columns="6"
        .values=${['i2', 'i3']}
        @punk-selection-change=${report}
      >
        ${[...Array(12).keys()].map(
          (index) => html`
            <punk-item-stack
              name=${itemLabels[itemNames[index % itemNames.length] ?? 'gear']}
              value=${`i${index + 1}`}
              .count=${((index * 37) % 99) + 1}
              ?disabled=${index === 7}
            >
              ${item(itemNames[index % itemNames.length] ?? 'gear', 'icon')}
            </punk-item-stack>
          `,
        )}
      </punk-slot-grid>
      <output class="wb-caption">i2, i3</output>
    </div>
  `,
};

export const NarrowContainer: Story = {
  name: 'Narrow container',
  render: () => html`
    <div class="wb-stack">
      <p>
        The column count falls before the slots shrink, so a grid wanting ten columns reflows to fit
        a narrow container. Resize the box by its corner.
      </p>
      <div style="resize: horizontal; overflow: auto; inline-size: 260px; max-inline-size: 100%">
        <punk-slot-grid aria-label="Storage" selection="single" columns="10">
          ${[...Array(20).keys()].map(
            (index) => html`
              <punk-slot label=${`Slot ${index + 1}`} value=${`s${index + 1}`}>
                ${index % 3 ? item('plate') : ''}
              </punk-slot>
            `,
          )}
        </punk-slot-grid>
      </div>
    </div>
  `,
};

export const HundredSlots: Story = {
  name: '100 slots',
  render: () => html`
    <div class="wb-stack">
      <p>
        A warehouse of 100 item stacks. Tab into the grid, move with the arrow keys, Home, End, and
        Ctrl+Home or Ctrl+End; Space toggles an item, Shift+Arrow extends the selection, and Ctrl+A
        selects all. Focus is one tab stop, so a second Tab leaves the grid.
      </p>
      <punk-slot-grid
        aria-label="Warehouse, 100 slots"
        selection="multiple"
        columns="10"
        .values=${['i1']}
        @punk-selection-change=${report}
      >
        ${[...Array(100).keys()].map(
          (index) => html`
            <punk-item-stack
              name=${itemLabels[itemNames[index % itemNames.length] ?? 'gear']}
              value=${`i${index + 1}`}
              .count=${((index * 37) % 99) + 1}
            >
              ${item(itemNames[index % itemNames.length] ?? 'gear', 'icon')}
            </punk-item-stack>
          `,
        )}
      </punk-slot-grid>
      <output class="wb-caption">i1</output>
    </div>
  `,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(modes),
};
