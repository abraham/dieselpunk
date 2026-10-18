import preview from '#.storybook/preview';
import { html } from 'lit';
import '../lib/foundations.ts';

const meta = preview.meta({
  title: 'Foundations/Scales',
  tags: ['!autodocs'],
});

export const Tokens = meta.story({
  render: () => html`
    <p>
      Non-color tokens at both densities, read from <code>tokens.css</code>. Font sizes do not
      change with density.
    </p>
    <wb-scales></wb-scales>
  `,
});
