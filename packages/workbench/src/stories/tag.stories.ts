import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTag } from '@dieselpunk/core';
import '@dieselpunk/core/tag/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTag>('punk-tag');

const meta = preview.type<{ args: StoryArgs<PunkTag> }>().meta({
  title: 'Components/Tag',
  tags: ['data'],
  component: 'punk-tag',
  args: { ...args, 'default-slot': 'Copper', removable: true },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A chip for a filter, a chosen value, or a label. With \`removable\` it has a native button named
"Remove" and its text ("Remove Copper"), or \`remove-label\` instead.

**The application removes it.** The button sends \`punk-remove\` with \`{ value, item }\`; remove
the tag in the listener and move focus to the next tag, or to the field the tags belong to, since
the focused button goes with it. A tag with no text warns in development.
`,
      },
    },
  },
});

export const Playground = meta.story();

const tags = () => html`
  <div class="wb-stack">
    ${group(
      'Labels and filters',
      html`<div style="display: flex; flex-wrap: wrap; gap: 8px">
        <punk-tag>Smelting</punk-tag>
        <punk-tag removable value="copper">Copper</punk-tag>
        <punk-tag removable value="iron">Iron ore</punk-tag>
        <punk-tag removable disabled value="coal">Coal</punk-tag>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${tags()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(tags),
});

/** Removing a tag moves focus to the next one, or to the previous one after the last. */
export const RemovableFilters = meta.story({
  render: () => {
    const onRemove = (event: CustomEvent<{ item: HTMLElement }>) => {
      const tag = event.detail.item;
      const next = (tag.nextElementSibling ?? tag.previousElementSibling) as PunkTag | null;
      tag.remove();
      next?.shadowRoot?.querySelector<HTMLElement>('[part="remove-button"]')?.focus();
    };
    return html`<div
      role="group"
      aria-label="Filters"
      style="display: flex; flex-wrap: wrap; gap: 8px"
      @punk-remove=${onRemove}
    >
      <punk-tag removable value="copper">Copper</punk-tag>
      <punk-tag removable value="iron">Iron ore</punk-tag>
      <punk-tag removable value="stone">Stone</punk-tag>
    </div>`;
  },
});
