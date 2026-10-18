import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkMenu } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/menu/register.js';
import { group } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkMenu>('punk-menu');

const items = `
  <punk-menu-item value="new">New blueprint<span slot="shortcut">Ctrl+N</span></punk-menu-item>
  <punk-menu-item value="open">Open…</punk-menu-item>
  <punk-menu-item value="save" disabled>Save</punk-menu-item>
  <punk-menu-item value="export">Export</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="png">As image</punk-menu-item>
    <punk-menu-item value="json">As data</punk-menu-item>
  </punk-menu>
  <hr>
  <punk-menu-item type="checkbox" value="grid" checked>Show grid</punk-menu-item>
  <punk-menu-item type="radio" value="small" checked>Small icons</punk-menu-item>
  <punk-menu-item type="radio" value="large">Large icons</punk-menu-item>
`;

const meta = preview.type<{ args: StoryArgs<PunkMenu> }>().meta({
  title: 'Components/Menu',
  component: 'punk-menu',
  args: { ...args, 'default-slot': items },
  argTypes,
  render: (storyArgs) =>
    html`<div style="min-block-size: 360px">
      <punk-button>Blueprint</punk-button>${template(storyArgs)}
    </div>`,
  parameters: {
    docs: {
      description: {
        component: `
A menu of \`punk-menu-item\` commands in the top layer, anchored to its trigger: the element named by \`for\`, else the previous sibling, which gets \`aria-haspopup="menu"\` and \`aria-expanded\`. A click, Enter, or Space on the trigger toggles it, and Down or Up opens it on the first or last item. Opening always moves focus to the first enabled item.

**Keyboard:** Up and Down move without wrapping and skip disabled items, Home and End go to the ends, and a letter moves to the next item that starts with it. Enter, Space, and a click activate an item and send \`punk-activate\` from it. Escape closes the innermost menu, Tab closes them all, and so does a press outside.

**Items:** \`type="checkbox"\` toggles and shows a check; \`type="radio"\` is chosen among the radio items between the nearest separators and shows a dot. Both keep the menu open. A plain item closes every open menu and returns focus to the trigger. Separators are \`hr\`, \`punk-divider\`, or \`role="separator"\` children. The \`shortcut\` slot is hidden from assistive technology, so give the item \`aria-keyshortcuts\` too.

**Submenus:** a \`punk-menu\` right after an item is that item's submenu, so its text never joins the item's name. Right (Left in right-to-left languages), Enter, Space, or a click opens it on its first item; Left or Escape closes it and returns to the item.

**Context menus:** with \`context\`, the trigger is an area: a right click, or the context-menu key or Shift+F10 while focus is in it, opens the menu at the pointer.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const ContextMenu = meta.story({
  render: () => html`
    <div class="wb-stack" style="min-block-size: 360px">
      ${group(
        'Right-click the area, or press Shift+F10 while it has focus',
        html`<div
            id="context-area"
            tabindex="0"
            style="padding: 48px; border: 1px dashed currentColor; text-align: center"
          >
            Assembler 3
          </div>
          <punk-menu for="context-area" context>
            <punk-menu-item value="rotate">Rotate</punk-menu-item>
            <punk-menu-item value="copy">Copy settings</punk-menu-item>
            <punk-menu-item value="remove">Remove</punk-menu-item>
          </punk-menu>`,
      )}
    </div>
  `,
});

export const States = meta.story({
  render: () => html`
    <div style="min-block-size: 360px">
      <punk-button>Blueprint</punk-button>
      <punk-menu open>
        <punk-menu-item value="new"
          >New blueprint<span slot="shortcut">Ctrl+N</span></punk-menu-item
        >
        <punk-menu-item value="save" disabled>Save</punk-menu-item>
        <punk-menu-item value="export">Export</punk-menu-item>
        <punk-menu><punk-menu-item value="png">As image</punk-menu-item></punk-menu>
        <hr />
        <punk-menu-item type="checkbox" value="grid" checked>Show grid</punk-menu-item>
        <punk-menu-item type="radio" value="small" checked>Small icons</punk-menu-item>
        <punk-menu-item type="radio" value="large">Large icons</punk-menu-item>
      </punk-menu>
    </div>
  `,
});
