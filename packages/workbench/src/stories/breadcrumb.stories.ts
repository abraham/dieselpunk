import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkBreadcrumb } from '@dieselpunk/core';
import '@dieselpunk/core/breadcrumb/register.js';
import { axeConfig, repeatedLandmarks } from '../lib/a11y.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkBreadcrumb>('punk-breadcrumb');

const trail = `
  <punk-breadcrumb-item href="#base">Base</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#north">North works</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#line">Line 2</punk-breadcrumb-item>
  <punk-breadcrumb-item href="#assembler">Assembler 3</punk-breadcrumb-item>
  <punk-breadcrumb-item current>Settings</punk-breadcrumb-item>
`;

const meta = preview.type<{ args: StoryArgs<PunkBreadcrumb> }>().meta({
  title: 'Components/Breadcrumb',
  tags: ['navigation'],
  component: 'punk-breadcrumb',
  subcomponents: { 'punk-breadcrumb-item': 'punk-breadcrumb-item' },
  args: { ...args, 'default-slot': trail },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
The path to the current page or folder: a \`nav\` landmark named "Breadcrumb" (or \`label\`) around a list of \`punk-breadcrumb-item\` links. The last item is usually \`current\`, with \`aria-current="page"\`, and without an \`href\` it is text. The separators are shapes hidden from assistive technology, mirrored in right-to-left languages. The items wrap onto more lines rather than scroll.

**Collapsing:** with \`max-items\`, a longer path shows its first item and its last \`max-items - 1\`, and a button named "Show full path" stands for the ones between. Activating it shows them all and moves focus to the first one it revealed.
`,
      },
    },
  },
});

export const Playground = meta.story();

const trails = () => html`
  <div class="wb-stack">
    ${group(
      'Full',
      html`<punk-breadcrumb label="Path to settings">
        <punk-breadcrumb-item href="#base">Base</punk-breadcrumb-item>
        <punk-breadcrumb-item href="#north">North works</punk-breadcrumb-item>
        <punk-breadcrumb-item current>Settings</punk-breadcrumb-item>
      </punk-breadcrumb>`,
    )}
    ${group(
      'Collapsed to three',
      html`<punk-breadcrumb label="Path to assembler settings" max-items="3">
        <punk-breadcrumb-item href="#base">Base</punk-breadcrumb-item>
        <punk-breadcrumb-item href="#north">North works</punk-breadcrumb-item>
        <punk-breadcrumb-item href="#line">Line 2</punk-breadcrumb-item>
        <punk-breadcrumb-item href="#assembler">Assembler 3</punk-breadcrumb-item>
        <punk-breadcrumb-item current>Settings</punk-breadcrumb-item>
      </punk-breadcrumb>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${trails()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(trails),
  parameters: { a11y: { config: axeConfig(repeatedLandmarks) } },
});
