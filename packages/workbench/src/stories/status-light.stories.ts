import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkStatusLight } from '@dieselpunk/core';
import '@dieselpunk/core/status-light/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkStatusLight>('punk-status-light');

const variants = ['neutral', 'info', 'success', 'warning', 'danger'] as const;

const meta: Meta<StoryArgs<PunkStatusLight>> = {
  title: 'Components/Status Light',
  component: 'punk-status-light',
  args: { ...args, variant: 'success', 'default-slot': 'Running' },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
A compact status indicator made of a shape and text. The text carries the meaning; the shape is decorative and hidden from assistive technology. A light with no text warns in development builds.

**Variants** differ by shape as well as color: a ring for \`neutral\`, a diamond for \`info\`, a filled circle for \`success\`, a triangle for \`warning\`, and a square for \`danger\`. Under forced colors the shapes keep their outlines.

**Announcements:** by default the light has no role. Set \`announce\` for a light whose status changes while the user is elsewhere; it becomes a polite \`role="status"\` live region.

**Icon:** the \`icon\` slot replaces the built-in shape.

**Keyboard:** the light is not focusable and has no keyboard interaction.
`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<StoryArgs<PunkStatusLight>>;

export const Playground: Story = {};

const lights = () => html`
  <div class="wb-stack">
    ${group(
      'Variants',
      html`<div class="wb-stack">
        ${variants.map(
          (variant) => html`<punk-status-light variant=${variant}>${variant}</punk-status-light>`,
        )}
      </div>`,
    )}
    ${group(
      'Announced and with an icon',
      html`<div class="wb-stack">
        <punk-status-light variant="danger" announce>Offline</punk-status-light>
        <punk-status-light variant="success">
          <span slot="icon" aria-hidden="true">${icon('check')}</span>Running
        </punk-status-light>
      </div>`,
    )}
    ${group(
      'A long text wraps',
      html`<div style="max-inline-size: 200px">
        <punk-status-light variant="warning">
          Fuel is running low, refill before the next production cycle
        </punk-status-light>
      </div>`,
    )}
  </div>
`;

export const States: Story = {
  render: () => html`<div style="max-inline-size: 480px">${lights()}</div>`,
};

export const ThemeAndDensityMatrix: Story = {
  render: () => themeDensityMatrix(lights),
};
