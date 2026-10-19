import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkIconButton } from '@dieselpunk/core';
import '@dieselpunk/core/icon-button/register.js';
import { icon, iconSvg } from '../icons/icons.ts';
import type { IconName } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkIconButton>('punk-icon-button');

const variants = ['default', 'primary', 'danger', 'confirm'] as const;
const sizes = ['sm', 'md', 'lg'] as const;

const meta = preview.type<{ args: StoryArgs<PunkIconButton> }>().meta({
  title: 'Components/Icon Button',
  tags: ['actions'],
  component: 'punk-icon-button',
  args: { ...args, label: 'Settings', 'default-slot': iconSvg.gear },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A square, icon-only button. Its \`label\` is both the accessible name and the text of a tooltip that opens on hover and on keyboard focus. Importing \`icon-button/register.js\` also registers \`punk-tooltip\`.

**Keyboard**

| Key | Action |
| --- | --- |
| Tab | Moves focus to the button, shows the focus ring, and opens the tooltip |
| Enter, Space | Activates it |
| Escape | Closes the tooltip without moving focus |

A missing \`label\` is an accessibility problem and warns in development builds.

**Disclosure:** for a button that shows and hides a panel, set \`aria-expanded\` and \`aria-controls\` on the host. Both reach the inner button: the state is copied, and the IDs are looked up in the host's tree when it renders. Keep the \`label\` the same in both states.
`,
      },
    },
  },
});

export const Playground = meta.story();

const iconNames: IconName[] = ['gear', 'plus', 'close', 'check', 'info', 'warning', 'more', 'fit'];

const cluster = (props: { variant?: string; disabled?: boolean; loading?: boolean }) =>
  html`${sizes.map(
    (size) => html`
      <punk-icon-button
        label=${`${size} ${props.variant ?? 'default'}`}
        size=${size}
        variant=${props.variant ?? 'default'}
        ?disabled=${props.disabled}
        ?loading=${props.loading}
      >
        ${icon('gear')}
      </punk-icon-button>
    `,
  )}`;

export const States = meta.story({
  render: () => html`
    <div class="wb-stack">
      ${group(
        'Variants by size',
        html`<div class="wb-stack">
          ${variants.map((variant) => html`<div class="wb-row">${cluster({ variant })}</div>`)}
        </div>`,
      )}
      ${group(
        'Disabled and loading',
        html`<div class="wb-row">
          ${cluster({ disabled: true })} ${cluster({ loading: true })}
        </div>`,
      )}
      ${group(
        'Demo icons',
        html`<div class="wb-row">
          ${iconNames.map(
            (name) => html`<punk-icon-button label=${name}>${icon(name)}</punk-icon-button>`,
          )}
        </div>`,
      )}
      ${group(
        'Tooltip placement',
        html`<div class="wb-row" style="padding: 32px">
          ${(['top', 'bottom', 'start', 'end'] as const).map(
            (placement) => html`
              <punk-icon-button label=${placement} tooltip-placement=${placement}>
                ${icon('info')}
              </punk-icon-button>
            `,
          )}
        </div>`,
      )}
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () =>
    themeDensityMatrix(
      () => html`
        <div class="wb-stack">
          ${variants.map((variant) => html`<div class="wb-row">${cluster({ variant })}</div>`)}
          <div class="wb-row">${cluster({ disabled: true })} ${cluster({ loading: true })}</div>
        </div>
      `,
    ),
});
