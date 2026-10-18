import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkProgressBar } from '@dieselpunk/core';
import '@dieselpunk/core/progress-bar/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkProgressBar>('punk-progress-bar');

const variants = ['default', 'success', 'warning', 'danger'] as const;

const meta = preview.type<{ args: StoryArgs<PunkProgressBar> }>().meta({
  title: 'Components/Progress Bar',
  component: 'punk-progress-bar',
  args: { ...args, value: 64, label: 'Crafting', showValue: true },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A progress bar for production, research, or transfer. It exposes \`role="progressbar"\` and, without a \`value\`, is indeterminate.

**Keyboard:** the bar is not focusable and has no keyboard interaction.

**Variants** differ by fill pattern, not only by color: \`default\` is solid, \`success\` is segmented, \`warning\` is a diagonal hatch, and \`danger\` is a dense cross-hatch.

**Name:** the \`label\` names the bar. With \`label-hidden\` it stays the accessible name but is not shown. Without a \`label\`, set \`aria-label\`.

**Locale:** the percentage text follows the nearest \`lang\` ancestor.

Values outside \`0\` to \`max\` are clamped, and a value that is not a number shows the indeterminate bar. Both warn in development builds.
`,
      },
    },
  },
});

export const Playground = meta.story();

export const Indeterminate = meta.story({
  args: { value: undefined, label: 'Searching', showValue: false },
});

const bars = () => html`
  <div class="wb-stack">
    ${[0, 25, 64, 100].map(
      (value) =>
        html`<punk-progress-bar
          label=${`${value}%`}
          .value=${value}
          show-value
        ></punk-progress-bar>`,
    )}
    <punk-progress-bar label="Indeterminate"></punk-progress-bar>
    ${variants.map(
      (variant) =>
        html`<punk-progress-bar
          label=${variant}
          variant=${variant}
          value="60"
          show-value
        ></punk-progress-bar>`,
    )}
    <punk-progress-bar label="Hidden label" label-hidden value="40"></punk-progress-bar>
  </div>
`;

export const States = meta.story({
  render: () => html`
    <div class="wb-stack" style="max-inline-size: 480px">
      ${group('Values, indeterminate, variants, and a hidden label', bars())}
      ${group(
        'Locale from a lang ancestor',
        html`<div lang="de">
          <punk-progress-bar label="de" value="50" show-value></punk-progress-bar>
        </div>`,
      )}
    </div>
  `,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(bars),
});
