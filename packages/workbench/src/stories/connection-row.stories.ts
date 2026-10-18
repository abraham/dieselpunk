import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { PunkConnectionRow } from '@dieselpunk/core';
import '@dieselpunk/core/connection-row/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes } = getStorybookHelpers<PunkConnectionRow>('punk-connection-row');

const node = (slot: 'source' | 'destination', text: string) =>
  html`<span slot=${slot}><span aria-hidden="true">${icon('gear')}</span> ${text}</span>`;

const meta = preview.type<{ args: StoryArgs<PunkConnectionRow> }>().meta({
  title: 'Components/Connection Row',
  tags: ['readouts'],
  component: 'punk-connection-row',
  args: {
    ...args,
    removable: true,
    value: 'belt-1',
    'source-slot': 'Iron smelter',
    'destination-slot': 'Assembler 03',
    'default-slot': '2 per second',
    'status-slot': 'Running',
    status: 'success',
  },
  argTypes,
  render: () => html`
    <punk-connection-row removable status="success" value="belt-1">
      ${node('source', 'Iron smelter')}${node('destination', 'Assembler 03')}
      <span>2 per second</span>
      <span slot="status">Running</span>
    </punk-connection-row>
  `,
  parameters: {
    docs: {
      description: {
        component: `
A logistics or circuit connection on an inset plate: a source, an arrow, a destination, details, a status, and a button that asks for its removal. The application supplies the nodes (an icon and a label each) in the \`source\` and \`destination\` slots, the details in the default slot, and the status text in the \`status\` slot.

**Reading order:** source, the direction as a word ("to", "from", "to and from", in the page's language), destination, the details, the status text, then the button. The host has no role. The arrow is drawn with CSS, follows \`direction\`, and flips in right-to-left; below 360px of row width the nodes stack and it points down or up.

**Status** is a shape in an inset lens as well as its text: a ring for \`neutral\`, a diamond for \`info\`, a circle for \`success\`, a triangle for \`warning\`, a square for \`danger\`. A status other than \`neutral\` with no text warns in development builds.

**Removal:** with \`removable\` the row has a native remove button, its only tab stop, named "Remove connection: *source*, *destination*" from the text of the two slots, or by \`remove-label\`. It sends \`punk-remove\` with \`{ value, item }\` (bubbling, composed, not cancelable) and **does nothing else**: the application removes the row. Since the focused button goes with the row, the application also moves focus, to the next row's button or to the list's heading after the last row. The **removal pattern** story shows it. \`disabled\` disables the button and keeps every word readable.

**Keyboard:**

| Key | Action |
| --- | ------ |
| Tab | Reaches the remove button, the row's only tab stop |
| Enter, Space | Press the remove button |

A name that changes without a slot change (an edit inside a slotted node) does not update the button's name. Set \`remove-label\` for that.
`,
      },
    },
  },
});

export const Playground = meta.story();

const statuses = [
  ['neutral', 'Idle'],
  ['info', 'Waiting'],
  ['success', 'Running'],
  ['warning', 'Low on fuel'],
  ['danger', 'Offline'],
] as const;

const rows = () => html`
  <div class="wb-stack" style="max-inline-size: 640px">
    ${group(
      'Directions',
      html`<div class="wb-stack">
        ${(['forward', 'backward', 'both'] as const).map(
          (direction) => html`
            <punk-connection-row direction=${direction}>
              ${node('source', 'Iron smelter')}${node('destination', 'Assembler 03')}
            </punk-connection-row>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Each status, removable',
      html`<div class="wb-stack">
        ${statuses.map(
          ([status, text]) => html`
            <punk-connection-row status=${status} removable value=${status}>
              ${node('source', 'Iron smelter')}${node('destination', 'Assembler 03')}
              <span>2 per second</span>
              <span slot="status">${text}</span>
            </punk-connection-row>
          `,
        )}
      </div>`,
    )}
    ${group(
      'Disabled, with a remove label',
      html`<div class="wb-stack">
        <punk-connection-row removable disabled status="warning">
          ${node('source', 'Boiler')}${node('destination', 'Turbine')}
          <span slot="status">Locked for maintenance</span>
        </punk-connection-row>
        <punk-connection-row removable remove-label="Remove the coolant pipe" direction="both">
          ${node('source', 'Pump')}${node('destination', 'Heat exchanger')}
        </punk-connection-row>
      </div>`,
    )}
    ${group(
      'Narrow: the nodes stack',
      html`<div class="wb-stack" style="max-inline-size: 300px">
        <punk-connection-row removable status="success" direction="backward">
          ${node('source', 'A source with a long name')}${node('destination', 'A destination with a long name')}
          <span>2 per second</span>
          <span slot="status">Running</span>
        </punk-connection-row>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => rows(),
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(rows),
});

interface Belt {
  id: string;
  from: string;
  to: string;
}

const belts: Belt[] = [
  { id: 'b1', from: 'Iron smelter', to: 'Assembler 01' },
  { id: 'b2', from: 'Copper smelter', to: 'Assembler 01' },
  { id: 'b3', from: 'Assembler 01', to: 'Chest' },
];

/**
 * The application owns the list: `punk-remove` only says that the button was used. This removes
 * the row, and moves focus to the next row's button, or to the heading after the last one.
 */
export const RemovalPattern = meta.story({
  render: () => {
    const host = document.createElement('div');
    host.className = 'wb-stack';
    host.style.maxInlineSize = '640px';
    let items = [...belts];
    const draw = () =>
      render(
        html`
          <h3 id="belts-heading" tabindex="-1">Belts (${items.length})</h3>
          <div class="wb-stack" role="list" aria-labelledby="belts-heading">
            ${repeat(
              items,
              (belt) => belt.id,
              (belt) => html`
                <div role="listitem">
                  <punk-connection-row removable value=${belt.id} @punk-remove=${remove}>
                    ${node('source', belt.from)}${node('destination', belt.to)}
                  </punk-connection-row>
                </div>
              `,
            )}
          </div>
          <punk-button @click=${reset} ?hidden=${items.length === belts.length}
            >Put the belts back</punk-button
          >
        `,
        host,
      );
    const focusAfter = async (index: number) => {
      draw();
      // The removed row's button had focus, so it is gone; wait for the list to draw first.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const next = host.querySelectorAll('punk-connection-row')[index];
      const button = next?.shadowRoot?.querySelector<HTMLElement>('[part="remove-button"]');
      (button ?? host.querySelector<HTMLElement>('#belts-heading'))?.focus();
    };
    function remove(event: CustomEvent<{ value: string }>) {
      const index = items.findIndex((belt) => belt.id === event.detail.value);
      items = items.filter((belt) => belt.id !== event.detail.value);
      void focusAfter(index);
    }
    const reset = () => {
      items = [...belts];
      draw();
    };
    draw();
    return host;
  },
});
