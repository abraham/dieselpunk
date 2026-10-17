import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../lib/foundations.ts';

const meta: Meta = {
  title: 'Foundations/Scales',
  tags: ['!autodocs'],
};

export default meta;
type Story = StoryObj;

export const Tokens: Story = {
  render: () => html`
    <p>
      Non-color tokens at both densities, read from <code>tokens.css</code>. Font sizes do not
      change with density.
    </p>
    <wb-scales></wb-scales>
  `,
};
