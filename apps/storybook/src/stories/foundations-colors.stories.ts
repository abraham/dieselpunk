import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import '../lib/foundations.ts';
import { paletteThemes } from '../lib/options.ts';

const meta: Meta = {
  title: 'Foundations/Colors',
  tags: ['!autodocs'],
};

export default meta;
type Story = StoryObj;

export const Palettes: Story = {
  render: () => html`
    <p>
      Colors are read from the page's computed styles, so these are the values a consumer gets from
      <code>tokens.css</code> and <code>themes.css</code>. The ratios follow the contrast gate
      (SPEC-PHASE-1 §6.8 and SPEC-PHASE-2 §6.3). <code>control-edge</code> is the boundary of a
      control with no other visible content, such as an empty slot; buttons are identified by their
      text or icon. <code>auto</code> uses the industrial or industrial-light palette, following the
      system.
    </p>
    <div class="wb-stack">
      ${paletteThemes.map(
        (theme) => html`
          <wb-color-theme
            class="wb-cell"
            theme=${theme.value}
            data-punk-theme=${theme.value}
          ></wb-color-theme>
        `,
      )}
    </div>
  `,
};
