import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkDivider } from '@dieselpunk/core';
import '@dieselpunk/core/divider/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkDivider>('punk-divider');

const meta = preview.type<{ args: StoryArgs<PunkDivider> }>().meta({
  title: 'Components/Divider',
  tags: ['layout'],
  component: 'punk-divider',
  args: { ...args, 'default-slot': 'Inputs' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
An etched separator, optionally labeled. It exposes \`role="separator"\` with \`aria-orientation\`, or \`role="none"\` when \`decorative\`.

**Keyboard:** the divider is not focusable and has no keyboard interaction.

A label is only drawn on horizontal dividers. A vertical divider ignores it and warns in development builds.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const States = meta.story({
  render: () => html`
    <div class="wb-stack">
      ${group('Horizontal', html`<punk-divider></punk-divider>`)}
      ${group('Horizontal with a label', html`<punk-divider>Inputs</punk-divider>`)}
      ${group(
        'Vertical, stretching to the container',
        html`<div class="wb-row" style="block-size: 48px; align-items: stretch">
          <span>Left</span><punk-divider orientation="vertical"></punk-divider><span>Right</span>
        </div>`,
      )}
      ${group(
        'Decorative (role="none")',
        html`<punk-divider decorative>Not announced</punk-divider>`,
      )}
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () =>
    themeDensityMatrix(
      () => html`
        <div class="wb-stack">
          <punk-divider></punk-divider>
          <punk-divider>Inputs</punk-divider>
          <div class="wb-row" style="block-size: 32px; align-items: stretch">
            <span>Left</span><punk-divider orientation="vertical"></punk-divider><span>Right</span>
          </div>
        </div>
      `,
    ),
});
