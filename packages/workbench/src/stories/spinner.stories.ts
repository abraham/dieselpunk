import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkSpinner } from '@dieselpunk/core';
import '@dieselpunk/core/spinner/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkSpinner>('punk-spinner');

const meta: Meta<StoryArgs<PunkSpinner>> = {
  title: 'Components/Spinner',
  component: 'punk-spinner',
  args: { ...args },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A loading indicator for a region that is waiting for content: the loading button's dashed ring on its own, beside a \`role="status"\` element. The status says "Loading", hidden from view, or the text in the default slot, shown beside the ring. Put it in the region before the content arrives and remove it after. For a busy button, use the button's \`loading\` instead.

**Motion:** the ring turns while it is shown, and stands still under reduced motion. \`size\` takes the icon sizes.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkSpinner>>;

export const Playground: Story = {};

const spinners = () => html`
  <div class="wb-stack">
    ${group(
      'Sizes',
      html`<div style="display: flex; gap: 16px; align-items: center">
        <punk-spinner size="sm"></punk-spinner>
        <punk-spinner></punk-spinner>
        <punk-spinner size="lg"></punk-spinner>
      </div>`,
    )}
    ${group('With visible text', html`<punk-spinner>Loading the blueprints</punk-spinner>`)}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${spinners()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(spinners),
};
