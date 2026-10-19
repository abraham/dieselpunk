import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkProductionStat } from '@dieselpunk/core';
import '@dieselpunk/core/production-stat/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import { sparkline } from '../lib/sparkline.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } =
  getStorybookHelpers<PunkProductionStat>('punk-production-stat');

const meta = preview.type<{ args: StoryArgs<PunkProductionStat> }>().meta({
  title: 'Components/Production Stat',
  tags: ['readouts'],
  component: 'punk-production-stat',
  args: { ...args, label: 'Iron plates', value: 1240, unit: '/min' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A compact metric on an inset plate: a \`label\`, a \`value\` with its \`unit\`, an optional trend and change, and an optional sparkline.

**Reading order:** the label, the value, the unit, the trend word, and the change are text in the shadow tree, in that order, and the host has no role. With \`announce\` the host becomes a polite \`role="status"\` live region, for one stat that changes while the user is elsewhere. It is off by default: a dashboard of updating stats must not announce them all.

**The value** is formatted for the nearest \`lang\` with \`Intl.NumberFormat\`, set in a monospaced face with tabular figures, aligned to the inline end, and it reserves \`--punk-stat-value-min\` (4ch), so a column of stats keeps the ends of its values aligned. \`decimals\` fixes the fraction digits (0 to 6). \`compact\` shows \`1.2K\` and keeps the whole number in the accessible text. With no \`value\` it shows a dash and the hidden words "no value".

**Trend and change:** \`trend\` is \`up\`, \`down\`, or \`flat\`, drawn as a shape and said as a word, never as a color: rising consumption is bad and rising output is good, and the component cannot know which. Put a status light beside it for a verdict. \`delta\` is the change, signed; with \`delta-percent\` it is a ratio shown as a percentage (\`0.12\` is \`+12%\`). With no \`trend\`, the sign of \`delta\` decides, and a change that rounds to zero is \`flat\`.

**Layout:** \`stacked\` puts the label above the value, and \`inline\` puts them on one row where there is room, and wraps where there is not. The \`sparkline\` slot reserves \`--punk-stat-sparkline-size\`; give a graphic in it \`aria-hidden="true"\` or a text alternative, or the stat warns.

**Keyboard:** the stat is not focusable and has no keyboard interaction.

| Key | Action |
| --- | ------ |
| (none) | A stat is text, so it takes no key. Its container is the place for focus. |

**Updating many stats:** set the \`value\` property. A stat that is set to the value it has renders nothing, and one set to a new value renders once. See the Performance guide.
`,
      },
    },
  },
});

export const Playground = meta.story();

const stats = () => html`
  <div class="wb-stack" style="max-inline-size: 480px">
    ${group(
      'Value and unit',
      html`<div class="wb-stack">
        <punk-production-stat
          label="Iron plates"
          value="1234567.89"
          unit="/min"
        ></punk-production-stat>
        <punk-production-stat
          label="Iron plates, compact"
          value="1234567.89"
          compact
          unit="/min"
        ></punk-production-stat>
        <punk-production-stat
          label="Power"
          value="12.5"
          decimals="2"
          unit="MW"
        ></punk-production-stat>
        <punk-production-stat label="Not measured yet" unit="/min"></punk-production-stat>
      </div>`,
    )}
    ${group(
      'Trend, with and without a change',
      html`<div class="wb-stack">
        <punk-production-stat label="Output" value="87" unit="%" trend="up"></punk-production-stat>
        <punk-production-stat
          label="Output"
          value="87"
          unit="%"
          delta="0.035"
          delta-percent
        ></punk-production-stat>
        <punk-production-stat label="Heat" value="87" unit="%" delta="-3"></punk-production-stat>
        <punk-production-stat label="Fuel" value="0" trend="flat"></punk-production-stat>
        <punk-production-stat
          label="Fuel"
          value="40"
          delta="0.001"
          delta-percent
        ></punk-production-stat>
      </div>`,
    )}
    ${group(
      'Inline, with an icon and a sparkline',
      html`<div class="wb-stack">
        <punk-production-stat
          label="Gears"
          value="640"
          unit="/min"
          layout="inline"
          trend="up"
          delta="40"
        >
          <span slot="icon" aria-hidden="true">${icon('gear')}</span>
          ${sparkline([4, 6, 5, 8, 7, 9, 12])}
        </punk-production-stat>
        <punk-production-stat label="Gears" value="640" unit="/min" delta="-12">
          ${sparkline([9, 8, 9, 6, 7, 5, 4])}
        </punk-production-stat>
      </div>`,
    )}
    ${group(
      'A narrow column keeps its values aligned',
      html`<div class="wb-stack" style="max-inline-size: 220px">
        <punk-production-stat
          label="Iron"
          value="5"
          unit="/s"
          layout="inline"
        ></punk-production-stat>
        <punk-production-stat
          label="Copper"
          value="1234"
          unit="/s"
          layout="inline"
        ></punk-production-stat>
        <punk-production-stat
          label="A label long enough to wrap onto a second line"
          value="100000000000"
          unit="items/min"
        ></punk-production-stat>
      </div>`,
    )}
    ${group(
      'Announcing',
      html`<punk-production-stat
        label="Reactor power"
        value="12.5"
        unit="MW"
        announce
      ></punk-production-stat>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => stats(),
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(stats),
});
