import preview from '#.storybook/preview';
import { html } from 'lit';
import '../lib/foundations.ts';
import { paletteThemes } from '../lib/options.ts';

const meta = preview.meta({
  title: 'Foundations/Colors',
  tags: ['!autodocs'],
});

export const Palettes = meta.story({
  render: () => html`
    <p>
      Colors are read from the page's computed styles, so these are the values a consumer gets from
      <code>tokens.css</code> and <code>themes.css</code>. The ratios follow the contrast gate
      (<code>specs/visual-system.md</code> §4.1). <code>control-edge</code> is the boundary of a
      control with no other visible content, such as an empty slot; buttons are identified by their
      text or icon. <code>auto</code> uses the dark or light palette, following the system.
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
});
