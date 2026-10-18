import preview from '#.storybook/preview';
import { html } from 'lit';
import '@dieselpunk/core/panel/register.js';
import { group } from '../lib/matrix.ts';

const meta = preview.meta({
  title: 'Foundations/Surfaces',
  tags: ['!autodocs'],
});

const panels = (style = '') => html`
  <div class="wb-row" style=${style}>
    ${(['raised', 'inset', 'flat'] as const).map(
      (variant) => html`
        <punk-panel variant=${variant} style="min-inline-size: 160px">
          <span slot="header">${variant}</span>
          Surface
        </punk-panel>
      `,
    )}
  </div>
`;

export const Recipes = meta.story({
  render: () => html`
    <p>
      Three surface recipes with bevels and outlines, no blur or glow. Raised fills with a gradient,
      inset is a flat trough, and flat is a plain panel.
    </p>
    ${group('Surfaces', panels())}
    ${group('Texture off (--punk-texture-opacity: 0)', panels('--punk-texture-opacity: 0'))}
    ${group(
      'Flat fills (--punk-surface-gradient-strength: 0)',
      panels('--punk-surface-gradient-strength: 0'),
    )}
    ${group(
      'Reduced texture theme',
      html`<div data-punk-theme="reduced-texture" class="wb-cell">${panels()}</div>`,
    )}
  `,
});
