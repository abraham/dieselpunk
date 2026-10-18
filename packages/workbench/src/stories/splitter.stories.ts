import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSplitter } from '@dieselpunk/core';
import '@dieselpunk/core/splitter/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes } = getStorybookHelpers<PunkSplitter>('punk-splitter');

const pane = (text: string) => html`<div style="padding: 12px">${text}</div>`;

const meta = preview.type<{ args: StoryArgs<PunkSplitter> }>().meta({
  title: 'Components/Splitter',
  component: 'punk-splitter',
  args: { ...args, value: 40, label: 'Map width' },
  argTypes,
  render: (storyArgs) =>
    html`<punk-splitter
      value=${storyArgs.value}
      min=${storyArgs.min}
      max=${storyArgs.max}
      step=${storyArgs.step}
      orientation=${storyArgs.orientation}
      label=${storyArgs.label}
      style="block-size: 240px"
    >
      <div slot="start">${pane('Map of the north works')}</div>
      <div slot="end">${pane('Details of the chosen machine')}</div>
    </punk-splitter>`,
  parameters: {
    docs: {
      description: {
        component: `
Two panes with a divider between them that the user drags, or moves with the keyboard: the APG
window splitter. The divider is a focusable \`separator\` whose value is the share of the space,
from 0 to 100, that the start pane takes; name it after that pane with \`label\`.

**Keys.** Side by side, Left and Right move the divider by \`step\` (swapped in right-to-left
text); stacked (\`orientation="vertical"\`), Up and Down do. Home and End go to \`min\` and
\`max\`, and Enter collapses the start pane to \`min\` and restores it.

**Pointer.** A drag captures the pointer and follows it, so it never needs to stay on the bar.
Under a coarse pointer the bar has a 40px target.

\`punk-split-change\` carries \`{ value }\` for every change the user makes, during a drag too.
Stacked panes need a height on the splitter.
`,
      },
    },
  },
});

export const Playground = meta.story();

const splitters = () => html`
  <div class="wb-stack">
    ${group(
      'Side by side',
      html`<punk-splitter value="35" label="Map width" style="block-size: 120px">
        <div slot="start">${pane('Map')}</div>
        <div slot="end">${pane('Details')}</div>
      </punk-splitter>`,
    )}
    ${group(
      'Stacked',
      html`<punk-splitter orientation="vertical" label="Log height" style="block-size: 200px">
        <div slot="start">${pane('Production log')}</div>
        <div slot="end">${pane('Alerts')}</div>
      </punk-splitter>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 640px">${splitters()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(splitters),
});
