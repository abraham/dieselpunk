import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkDrawer } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/checkbox/register.js';
import '@dieselpunk/core/drawer/register.js';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkDrawer>('punk-drawer');

const open = (event: Event) =>
  ((event.currentTarget as HTMLElement).nextElementSibling as PunkDrawer | null)?.show();

const meta = preview.type<{ args: StoryArgs<PunkDrawer> }>().meta({
  title: 'Components/Drawer',
  tags: ['overlays'],
  component: 'punk-drawer',
  args: {
    ...args,
    heading: 'Filters',
    modal: true,
    'default-slot':
      '<punk-checkbox checked>Show belts</punk-checkbox><br><punk-checkbox>Show pipes</punk-checkbox>',
    'footer-slot': '<punk-button slot="footer" variant="primary">Apply</punk-button>',
  },
  argTypes,
  render: (storyArgs) =>
    html`<punk-button @click=${open}>Open the drawer</punk-button
      >${template({ ...storyArgs, open: false })}`,
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A panel that slides in from an edge of the viewport: navigation, filters, or details. Give it a \`heading\`, or an \`aria-label\`. It is a \`<dialog>\` in the top layer, modal with \`modal\` (the rest of the page is inert, focus is trapped, the page does not scroll) and beside the page without it. Focus starts on its content and goes back to what opened it.

**Closing:** it always has a close button, and Escape always closes it. A click on the backdrop closes nothing. \`punk-close\` reports \`escape\`, \`close-button\`, or \`method\`.

**Edges:** \`start\` (the default) and \`end\` follow the writing direction; \`top\` and \`bottom\` span the width. \`--punk-drawer-size\` is its width at the sides and its height at the top or bottom. The slide is removed under reduced motion.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const End = meta.story({
  args: { placement: 'end', heading: 'Machine details' },
});

export const Bottom = meta.story({
  args: { placement: 'bottom', heading: 'Production log', modal: false },
});
