import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkMeter } from '@dieselpunk/core';
import '@dieselpunk/core/meter/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkMeter>('punk-meter');

const meta = preview.type<{ args: StoryArgs<PunkMeter> }>().meta({
  title: 'Components/Meter',
  tags: ['readouts'],
  component: 'punk-meter',
  args: {
    ...args,
    label: 'Boiler heat',
    value: 64,
    low: 30,
    high: 70,
    optimum: 50,
    showValue: true,
  },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A segmented gauge for power, fluid, heat, durability, or capacity. The track has \`role="meter"\` with \`aria-valuemin\`, \`aria-valuemax\`, \`aria-valuenow\`, and \`aria-valuetext\`.

**Name:** the \`label\` names the meter. With \`label-hidden\` it stays the accessible name but is not shown. Without a \`label\`, set \`aria-label\`; a meter with neither warns in development builds.

**State** follows the HTML \`<meter>\` algorithm over \`low\`, \`high\`, and \`optimum\`. With none of them set there is no state and the fill is solid. Otherwise the best region is a solid fill, a worse one is diagonally hatched, and the worst is cross-hatched, so state never depends on color. It is also in \`aria-valuetext\` in words ("15%, warning", "90%, critical").

**Segments** are a CSS pattern, not elements, so a meter costs the same number of nodes at 2 or 100 segments. The lit length snaps to whole segments: at least one above the minimum, full only at the maximum.

**Locale:** the percentage and the state words follow the nearest \`lang\`.

**Keyboard:** the meter is not focusable and has no keyboard interaction.

Out-of-range values are clamped and warn in development builds. A range where \`max\` is not above \`min\` becomes 0 to 100.
`,
      },
    },
  },
});

export const Playground = meta.story();

const meters = () => html`
  <div class="wb-stack">
    ${group(
      'No thresholds: solid fill',
      html`<div class="wb-stack">
        ${[0, 64, 100].map(
          (value) =>
            html`<punk-meter label=${`Power ${value}`} .value=${value} show-value></punk-meter>`,
        )}
      </div>`,
    )}
    ${group(
      'Optimal, suboptimal, and worst regions',
      html`<div class="wb-stack">
        <punk-meter label="Heat, optimal" low="30" high="70" optimum="50" value="50" show-value>
        </punk-meter>
        <punk-meter label="Heat, low" low="30" high="70" optimum="50" value="15" show-value>
        </punk-meter>
        <punk-meter label="Heat, over" low="30" high="70" optimum="10" value="90" show-value>
        </punk-meter>
        <punk-meter
          label="Coolant"
          low="30"
          high="70"
          optimum="50"
          value="85"
          segments="5"
          show-value
        ></punk-meter>
      </div>`,
    )}
    ${group(
      'Hidden label',
      html`<punk-meter label="Pressure" label-hidden value="40"></punk-meter>`,
    )}
    ${group(
      'Vertical',
      html`<div class="wb-row">
        <punk-meter label="Fuel" orientation="vertical" value="75" show-value></punk-meter>
        <punk-meter
          label="Heat"
          orientation="vertical"
          low="30"
          high="70"
          optimum="50"
          value="15"
          show-value
        ></punk-meter>
      </div>`,
    )}
    ${group(
      'Locale from a lang ancestor',
      html`<div lang="de">
        <punk-meter
          label="Hitze"
          low="30"
          high="70"
          optimum="50"
          value="15"
          show-value
        ></punk-meter>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${meters()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(meters),
});
