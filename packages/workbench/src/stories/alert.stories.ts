import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkAlert } from '@dieselpunk/core';
import '@dieselpunk/core/alert/register.js';
import '@dieselpunk/core/button/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkAlert>('punk-alert');

const meta = preview.type<{ args: StoryArgs<PunkAlert> }>().meta({
  title: 'Components/Alert',
  tags: ['data'],
  component: 'punk-alert',
  args: {
    ...args,
    variant: 'warning',
    heading: 'Belt 3 is blocked',
    'default-slot': 'Clear the jam to resume deliveries to the assembler.',
  },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 480px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A message that stays in the page until the problem goes away or the user dismisses it: a status shape in an inset lens, an optional heading, the message, and optional actions. The shape is hidden from assistive technology, since the text carries the meaning, and each variant has its own shape, so color is never the only cue.

**Announcing:** nothing is announced unless \`announce\` is set, which makes the host a live region while it is: \`alert\` for \`warning\` and \`danger\`, \`status\` for \`info\` and \`success\`. Use it for an alert that appears or changes while the user is elsewhere, not for one that is there when the page loads.

**Dismissing:** \`dismissible\` adds a dismiss button. Dismissing sends a cancelable \`punk-dismiss\` and then hides the alert with \`hidden\`. Focus on the button goes with it, so move focus in your listener, to the content the alert was about or the next heading.
`,
      },
    },
  },
});

export const Playground = meta.story();

const alerts = () => html`
  <div class="wb-stack">
    ${group(
      'Variants',
      html`<div class="wb-stack">
        <punk-alert variant="info">A new blueprint is available.</punk-alert>
        <punk-alert variant="success" heading="Research complete"
          >Steel processing is unlocked.</punk-alert
        >
        <punk-alert variant="warning" dismissible
          >Fuel is low in the north works.<punk-button slot="actions" size="sm"
            >Order fuel</punk-button
          ></punk-alert
        >
        <punk-alert variant="danger" heading="Reactor offline" dismissible
          >The reactor shut down after overheating.</punk-alert
        >
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${alerts()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(alerts),
});
