import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkRangeSlider } from '@dieselpunk/core';
import '@dieselpunk/core/range-slider/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkRangeSlider>('punk-range-slider');

const meta = preview.type<{ args: StoryArgs<PunkRangeSlider> }>().meta({
  title: 'Components/Range slider',
  tags: ['forms'],
  component: 'punk-range-slider',
  args: { ...args, label: 'Output', low: 20, high: 70, 'show-value': true },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A low and a high value chosen on one track, each with its own thumb. The thumbs are two sliders in
a group named by \`label\`, named "Minimum" and "Maximum" in the page's language, and a thumb cannot
pass the other.

**Keys and pointer** are the slider's, for the focused thumb. A press on the track moves the nearer
thumb there, and a drag follows the pointer.

**Form:** it submits \`low\` and then \`high\` under \`name\`, and a form reset puts both back to the
\`low\` and \`high\` attributes.
`,
      },
    },
  },
});

export const Playground = meta.story();

const sliders = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Values',
      html`<div class="wb-stack">
        <punk-range-slider label="Output" low="20" high="70" show-value></punk-range-slider>
        <punk-range-slider
          label="Price"
          low="1500"
          high="4500"
          max="5000"
          step="100"
          show-value
        ></punk-range-slider>
      </div>`,
    )}
    ${group(
      'Disabled',
      html`<punk-range-slider label="Output" low="20" high="70" disabled></punk-range-slider>`,
    )}
  </div>
`;

export const States = meta.story({ render: sliders });

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(sliders),
});
