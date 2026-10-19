import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkPanel } from '@dieselpunk/core';
import '@dieselpunk/core/panel/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkPanel>('punk-panel');

const meta = preview.type<{ args: StoryArgs<PunkPanel> }>().meta({
  title: 'Components/Panel',
  tags: ['layout'],
  component: 'punk-panel',
  args: {
    ...args,
    'default-slot': 'Crafting speed 0.75',
    'header-slot': 'Assembler',
    'footer-slot': 'Idle',
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A structural metal surface in three variants: \`raised\`, \`inset\`, and \`flat\`. It has no ARIA role. Add \`role="region"\` and a label when it is a landmark.

**Keyboard:** the panel is not interactive and takes no focus. Controls inside it keep their own behavior.

**Density:** \`density="low"\` on a panel changes spacing for its descendants only.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const States = meta.story({
  render: () => html`
    <div class="wb-stack">
      ${group(
        'Variants',
        html`<div class="wb-row">
          ${(['raised', 'inset', 'flat'] as const).map(
            (variant) => html`
              <punk-panel variant=${variant}>
                <span slot="header">${variant}</span>
                Body content
                <span slot="footer">Footer</span>
              </punk-panel>
            `,
          )}
        </div>`,
      )}
      ${group('Empty header and footer render no strip', html`<punk-panel>Body only</punk-panel>`)}
      ${group(
        'Density on the panel',
        html`<div class="wb-row">
          <punk-panel density="compact"><span slot="header">compact</span>Body</punk-panel>
          <punk-panel density="low"><span slot="header">low</span>Body</punk-panel>
        </div>`,
      )}
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () =>
    themeDensityMatrix(
      () => html`
        <punk-panel>
          <span slot="header">Assembler</span>
          Crafting speed 0.75
          <span slot="footer">Idle</span>
        </punk-panel>
      `,
    ),
});
