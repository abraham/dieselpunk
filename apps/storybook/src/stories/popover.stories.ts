import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkPopover } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/popover/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkPopover>('punk-popover');

const item = (text: string, disabled = false) =>
  html`<button
    role="menuitem"
    ?disabled=${disabled}
    style="display: block; inline-size: 100%; padding: 8px 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer"
  >
    ${text}
  </button>`;

const meta: Meta<StoryArgs<PunkPopover>> = {
  title: 'Components/Popover',
  component: 'punk-popover',
  args: {
    ...args,
    'default-slot': '<p style="margin: 0">Crafting speed 0.75, with two speed modules.</p>',
  },
  argTypes,
  render: (storyArgs) =>
    html`<div style="min-block-size: 200px">
      <punk-button>Details</punk-button>${template(storyArgs)}
    </div>`,
  parameters: {
    docs: {
      description: {
        component: `
An interactive surface anchored to a trigger, for content or a menu. The trigger is the element named by \`for\`, else the previous sibling. It gets \`aria-expanded\` (and \`aria-haspopup="menu"\` in menu mode), including a \`punk-button\` or \`punk-icon-button\`, where the inner button gets them. A click, Enter, or Space on the trigger toggles the popover.

**Closing:** Escape closes the topmost overlay, and a press outside closes the popover; a press on the trigger is left to the trigger, which toggles. \`punk-close\` reports the reason (\`escape\`, \`outside\`, \`tab\`, \`action\`, or \`method\`). Focus that was inside goes back to the trigger.

**Content mode:** a pointer open leaves focus where it is. A keyboard open (Enter or Space on the trigger) moves focus to an \`autofocus\` element, else the first tabbable one, else the surface. Tab past the last tabbable element, or Shift+Tab before the first, closes it and carries on from the trigger.

**Menu mode:** the host is \`role="menu"\` while it is showing, and the application supplies the \`menuitem\`, \`menuitemcheckbox\`, or \`menuitemradio\` elements, which must be focusable. Opening always moves focus to the first enabled item, and ArrowDown on the trigger opens it. Up, Down, Home, and End move among the items without wrapping and skip disabled ones. Tab closes it. Activating an item does not close the menu: call \`hide()\`, or set \`data-punk-close-on-activate\` on the popover.

**Placement:** \`bottom\` (the default), \`top\`, \`start\`, and \`end\`, flipped when there is no room and kept inside the viewport. \`start\` and \`end\` follow the writing direction. It sits in the top layer, so inside a modal window or dialog its trigger must be in the same one.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkPopover>>;

export const Playground: Story = {};

export const Menu: Story = {
  render: () => html`
    <div style="min-block-size: 220px">
      <punk-button>Actions</punk-button>
      <punk-popover mode="menu" data-punk-close-on-activate>
        ${item('Rename')}${item('Duplicate')}${item('Delete', true)}${item('Export')}
      </punk-popover>
    </div>
  `,
};

const popovers = () => html`
  <div class="wb-stack">
    ${group(
      'Content and menu, open',
      html`<div
        style="display: flex; gap: 24px; flex-wrap: wrap; min-block-size: 140px; align-items: flex-start"
      >
        <div>
          <punk-button>Details</punk-button>
          <punk-popover open><p style="margin: 0">Crafting speed 0.75</p></punk-popover>
        </div>
        <div>
          <punk-button>Actions</punk-button>
          <punk-popover mode="menu" open>${item('Rename')}${item('Delete', true)}</punk-popover>
        </div>
      </div>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 640px">${popovers()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(popovers),
};
