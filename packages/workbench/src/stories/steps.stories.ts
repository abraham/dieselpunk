import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSteps } from '@dieselpunk/core';
import '@dieselpunk/core/steps/register.js';
import '@dieselpunk/core/button/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes } = getStorybookHelpers<PunkSteps>('punk-steps');

const meta: Meta<StoryArgs<PunkSteps>> = {
  title: 'Components/Steps',
  component: 'punk-steps',
  args: { ...args, current: 2 },
  argTypes,
  render: (storyArgs) =>
    html`<punk-steps current=${storyArgs.current} label=${storyArgs.label}>
      <punk-step>Drivers</punk-step>
      <punk-step>Network</punk-step>
      <punk-step>Account</punk-step>
      <punk-step>Finish</punk-step>
    </punk-steps>`,
  parameters: {
    docs: {
      description: {
        component: `
Progress through a task of several steps, such as a setup wizard: an ordered list of
\`punk-step\` elements named "Steps", or \`label\`.

\`current\` is the 1-based number of the step the user is on. The steps before it show a check and
say "completed", the current one has its number in a ring and \`aria-current="step"\`, and the
ones after it say "not started". \`0\` is before the first step, and a number past the last means
the task is done.

**A record, not navigation.** The steps are not links or buttons: the application's own
Back and Next buttons move \`current\`.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkSteps>>;

export const Playground: Story = {};

const items = html`<punk-step>Drivers</punk-step><punk-step>Network</punk-step
  ><punk-step>Account</punk-step><punk-step>Finish</punk-step>`;

const states = () => html`
  <div class="wb-stack">
    ${group('Before the first step', html`<punk-steps current="0">${items}</punk-steps>`)}
    ${group('On the second step', html`<punk-steps current="2">${items}</punk-steps>`)}
    ${group('Done', html`<punk-steps current="5">${items}</punk-steps>`)}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 640px">${states()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(states),
};

/** The application's buttons move `current`; the steps only show it. */
export const Wizard: Story = {
  render: () => {
    const move = (by: number) => (event: Event) => {
      const steps = (event.currentTarget as HTMLElement)
        .closest('.wizard')
        ?.querySelector('punk-steps') as PunkSteps;
      steps.current = Math.min(5, Math.max(1, steps.current + by));
    };
    return html`<div class="wizard wb-stack" style="max-inline-size: 640px">
      <punk-steps current="1" label="Setup">${items}</punk-steps>
      <div style="display: flex; gap: 8px">
        <punk-button @click=${move(-1)}>Back</punk-button>
        <punk-button variant="primary" @click=${move(1)}>Next</punk-button>
      </div>
    </div>`;
  },
};
