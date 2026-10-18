import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSlider } from '@dieselpunk/core';
import '@dieselpunk/core/slider/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkSlider>('punk-slider');

const meta = preview.type<{ args: StoryArgs<PunkSlider> }>().meta({
  title: 'Components/Slider',
  component: 'punk-slider',
  args: { ...args, label: 'Crafting speed', value: 40, 'show-value': true },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 420px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A slider for a number in a range, in steps. It is \`role="slider"\` on the host, with \`aria-valuemin\`, \`aria-valuemax\`, \`aria-valuenow\`, and \`aria-valuetext\` written there. It takes part in a form: it submits \`value\` under \`name\`, and a form reset puts \`value\` back to what the markup said.

**Name:** \`label\` is the name and the text above the slider; it is copied to \`aria-label\` on the host unless you set your own. With no label, use \`aria-label\`. A slider with no name warns in development.

**Value:** it is always inside the range and a whole number of steps from \`min\`, without floating-point drift (\`0.1\` steps over \`0\` to \`1\`). Without a \`value\` it is \`min\`. A \`max\` that is not a whole number of steps from \`min\` is never reached. An inverted or non-finite range is repaired to 0 to 100, and a step that is not above 0 to 1, with one warning. \`aria-valuetext\` is the number in the language of the page, unless the host sets its own. \`show-value\` shows it beside the label, and \`ticks\` draws a mark at every step, or at every few steps when there are more than 20.

**Keyboard:** the arrow keys, Home, and End give what a native range gives, in either writing direction, and the Page keys move by a tenth of the range. In right-to-left text the end of the range is on the left, so Left and Right swap. A key press sends \`input\` and \`change\`.

**Pointer:** a press on the track sets the value, and a drag follows the pointer, which may leave the track. A drag reads the track once, when the press begins, and the page still scrolls up and down on touch. \`input\` is sent while the value changes and \`change\` when a drag or key press ends with a different value. Neither is sent when \`value\` is set from code. A click on the track and the keyboard are enough to use it, with no drag needed.

**Look:** the track is an inset trough with a \`control-edge\` boundary, the fill is the accent, and the thumb is a raised block with its own boundary, so the position is read from the thumb and not from color. Under forced colors the fill is \`Highlight\` and the thumb a bordered system-color block.
`,
      },
    },
  },
});

export const Playground = meta.story();

const sliders = () => html`
  <div class="wb-stack" style="max-inline-size: 420px">
    ${group(
      'Value shown, and without a header',
      html`<div class="wb-stack">
        <punk-slider label="Crafting speed" value="40" show-value></punk-slider>
        <punk-slider aria-label="Heat" value="60"></punk-slider>
      </div>`,
    )}
    ${group(
      'Ticks, and a decimal step',
      html`<div class="wb-stack">
        <punk-slider label="Modules" min="0" max="10" value="4" show-value ticks></punk-slider>
        <punk-slider
          label="Ratio"
          min="0"
          max="1"
          step="0.1"
          value="0.3"
          show-value
          ticks
        ></punk-slider>
        <punk-slider label="Percent" value="100" show-value ticks></punk-slider>
      </div>`,
    )}
    ${group(
      'Disabled, and a long label',
      html`<div class="wb-stack" style="max-inline-size: 240px">
        <punk-slider label="Crafting speed" value="30" show-value disabled></punk-slider>
        <punk-slider label="Fertigungsgeschwindigkeitsüberschreitung" show-value></punk-slider>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${sliders()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(sliders),
});
