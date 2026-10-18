import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTooltip } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/tooltip/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTooltip>('punk-tooltip');

const meta = preview.type<{ args: StoryArgs<PunkTooltip> }>().meta({
  title: 'Components/Tooltip',
  tags: ['overlays'],
  component: 'punk-tooltip',
  args: { ...args, 'default-slot': 'Starts the assembler' },
  argTypes,
  // The tooltip attaches to its previous sibling, so every story renders an anchor first.
  render: (storyArgs) => html`
    <div class="wb-row" style="padding: 48px">
      <punk-button>Hover or focus me</punk-button>${template(storyArgs)}
    </div>
  `,
  parameters: {
    docs: {
      description: {
        component: `
A text hint for an anchor. Place it as a **sibling** of its anchor, directly after it, or point at the anchor with \`for\`. Never nest it inside the anchor, because nested content would join the anchor's accessible name.

**Keyboard and pointer**

| Input | Action |
| --- | --- |
| Pointer rests on the anchor | Opens after \`delay\` (400 ms by default) |
| Tab to the anchor | Opens at once |
| Escape | Closes it and leaves focus where it was |
| Pointer moves onto the tooltip | Keeps it open |

It never opens for touch. Only one tooltip is open at a time, and moving between anchors within 300 ms skips the delay.

The tooltip content must not contain interactive controls. Use \`show()\` and \`hide()\` to control it from code.

A themed matrix cannot hold open tooltips side by side, because only one can be open at a time. The matrix story therefore shows one hoverable anchor per theme and density.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const Open = meta.story({
  play: ({ canvasElement }) => {
    canvasElement.querySelector('punk-tooltip')?.show();
  },
});

export const States = meta.story({
  render: () => html`
    <div class="wb-stack">
      ${group(
        'Placement',
        html`<div class="wb-row" style="padding: 48px">
          ${(['top', 'bottom', 'start', 'end'] as const).map(
            (placement) => html`
              <punk-button>${placement}</punk-button>
              <punk-tooltip placement=${placement}>Placed ${placement}</punk-tooltip>
            `,
          )}
        </div>`,
      )}
      ${group(
        'Instant, and without describing the anchor',
        html`<div class="wb-row" style="padding: 16px">
          <punk-button>No delay</punk-button>
          <punk-tooltip delay="0">Opens immediately on hover</punk-tooltip>
          <punk-button>Not described</punk-button>
          <punk-tooltip describe="false">Hint only; screen readers skip it</punk-tooltip>
        </div>`,
      )}
      ${group(
        'Anchor by id',
        html`<div class="wb-row" style="padding: 16px">
          <punk-tooltip for="far-anchor">Linked by the for attribute</punk-tooltip>
          <span>Text between them</span>
          <punk-button id="far-anchor">Anchor</punk-button>
        </div>`,
      )}
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () =>
    themeDensityMatrix(
      () => html`
        <div class="wb-row" style="padding: 32px 0">
          <punk-button>Hover or focus me</punk-button>
          <punk-tooltip>Starts the assembler</punk-tooltip>
        </div>
      `,
    ),
});
