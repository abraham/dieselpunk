import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkButton } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import { icon, iconSvg } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkButton>('punk-button');

const variants = ['default', 'primary', 'danger', 'confirm'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

const meta = preview.type<{ args: StoryArgs<PunkButton> }>().meta({
  title: 'Components/Button',
  tags: ['actions'],
  component: 'punk-button',
  args: { ...args, 'default-slot': 'Start production' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A raised push button. Clicks surface as the native \`click\` event. \`type\` defaults to \`button\`, so it never submits a form by accident.

**Keyboard**

| Key | Action |
| --- | --- |
| Tab | Moves focus to the button and shows the focus ring |
| Enter, Space | Activates it |

A \`disabled\` button cannot be focused. A \`loading\` button stays focusable and announces the loading state, but ignores activation.

Hover and pressed states are interactive, so try them in the stories. Hover lights a \`default\` button with the accent and shifts a filled one toward the text color; pressing shifts it further. \`arrow\` (\`end\` or \`start\`) points a button for an action that moves on or back; the tip mirrors in right-to-left text. The loading and disabled states are shown in the matrix.
`,
      },
    },
  },
});

export const Playground = meta.story();

const row = (label: string, button: (variant: (typeof variants)[number]) => unknown) => html`
  <div class="wb-row">
    <span class="wb-caption" style="min-inline-size: 6em">${label}</span>
    ${variants.map((variant) => button(variant))}
  </div>
`;

const arrows = html`<div class="wb-stack">
  <div class="wb-row">
    <punk-button arrow="start">Back</punk-button>
    <punk-button variant="confirm" arrow="end">Next</punk-button>
    <punk-button variant="confirm" arrow="end" disabled>Next</punk-button>
  </div>
  <div class="wb-row">
    ${sizes.map(
      (size) => html`<punk-button variant="confirm" arrow="end" size=${size}>${size}</punk-button>`,
    )}
  </div>
  <div class="wb-row" dir="rtl">
    <punk-button arrow="start">Back (rtl)</punk-button>
    <punk-button variant="confirm" arrow="end">Next (rtl)</punk-button>
  </div>
</div>`;

export const States = meta.story({
  render: () => html`
    <div class="wb-stack">
      ${group(
        'Variants and states',
        html`<div class="wb-stack">
          ${row('idle', (v) => html`<punk-button variant=${v}>${v}</punk-button>`)}
          ${row('disabled', (v) => html`<punk-button variant=${v} disabled>${v}</punk-button>`)}
          ${row('loading', (v) => html`<punk-button variant=${v} loading>${v}</punk-button>`)}
        </div>`,
      )}
      ${group(
        'Sizes',
        html`<div class="wb-row">
          ${sizes.map((size) => html`<punk-button size=${size}>${size}</punk-button>`)}
        </div>`,
      )}
      ${group('Arrow', arrows)}
      ${group(
        'With icons',
        html`<div class="wb-row">
          <punk-button variant="primary">
            <span slot="icon-start">${icon('plus')}</span>Add recipe
          </punk-button>
          <punk-button> Settings<span slot="icon-end">${icon('gear')}</span> </punk-button>
        </div>`,
      )}
      ${group(
        'Long label in a narrow container',
        html`<div style="max-inline-size: 180px">
          <punk-button>Assemble the heavy industrial gearbox</punk-button>
        </div>`,
      )}
    </div>
  `,
});

export const WithIcons = meta.story({
  args: {
    'default-slot': 'Add recipe',
    'icon-start-slot': iconSvg.plus,
    variant: 'primary',
  },
});

export const Arrow = meta.story({
  args: { 'default-slot': 'Next', variant: 'confirm', arrow: 'end' },
});

export const ThemeAndDensityMatrix = meta.story({
  render: () =>
    themeDensityMatrix(
      () => html`
        <div class="wb-stack">
          ${row('idle', (v) => html`<punk-button variant=${v}>${v}</punk-button>`)}
          ${row('disabled', (v) => html`<punk-button variant=${v} disabled>${v}</punk-button>`)}
          ${row('loading', (v) => html`<punk-button variant=${v} loading>${v}</punk-button>`)}
          ${arrows}
        </div>
      `,
    ),
});
