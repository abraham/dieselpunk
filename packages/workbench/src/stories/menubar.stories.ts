import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import type { PunkMenubar } from '@dieselpunk/core';
import '@dieselpunk/core/menubar/register.js';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkMenubar>('punk-menubar');

const menus = `
  <punk-menu-item>File</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="new">New layout<span slot="shortcut">Ctrl+N</span></punk-menu-item>
    <punk-menu-item value="open">Open…</punk-menu-item>
    <hr />
    <punk-menu-item value="export">Export</punk-menu-item>
    <punk-menu>
      <punk-menu-item value="png">As image</punk-menu-item>
      <punk-menu-item value="json">As blueprint</punk-menu-item>
    </punk-menu>
  </punk-menu>
  <punk-menu-item>Edit</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="undo">Undo</punk-menu-item>
    <punk-menu-item value="redo" disabled>Redo</punk-menu-item>
  </punk-menu>
  <punk-menu-item>View</punk-menu-item>
  <punk-menu>
    <punk-menu-item type="checkbox" value="grid" checked>Show grid</punk-menu-item>
    <punk-menu-item type="checkbox" value="flow">Show flow</punk-menu-item>
  </punk-menu>
  <punk-menu-item disabled>Window</punk-menu-item>
  <punk-menu><punk-menu-item value="tile">Tile</punk-menu-item></punk-menu>
`;

const meta = preview.type<{ args: StoryArgs<PunkMenubar> }>().meta({
  title: 'Components/Menubar',
  tags: ['navigation'],
  component: 'punk-menubar',
  subcomponents: { 'punk-menu': 'punk-menu', 'punk-menu-item': 'punk-menu-item' },
  args: { ...args, 'aria-label': 'Workbench', 'default-slot': menus },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A persistent row of menus at the top of an application window: the APG menubar, built from
\`punk-menu\`. Each \`punk-menu-item\` child is a menubar item, and the \`punk-menu\` right after
it is its menu. Registering the menubar registers the menu family too. Name it with \`aria-label\`.

**Keys.** The row is one tab stop. Left and Right move among the items, Home and End go to the
ends, and Enter, Space, Down, or a click opens an item's menu (Up on its last item). While a menu is
open, Left and Right close it and open the next item's menu; a submenu's own Right and Left come
first. Escape returns to the item, and Tab leaves the row. Menus never open on hover.

Each menu item sends \`punk-activate\`, which bubbles to the menubar.
`,
      },
    },
  },
});

export const Playground = meta.story();
