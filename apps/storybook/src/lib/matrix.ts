import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { paletteThemes, densities } from './options.ts';

/** Renders `content` once per theme and density, each in its own themed cell. */
export function themeDensityMatrix(content: () => TemplateResult): TemplateResult {
  return html`
    <div class="wb-matrix">
      ${paletteThemes.flatMap((theme) =>
        densities.map(
          (density) => html`
            <div class="wb-cell" data-punk-theme=${theme.value} data-punk-density=${density.value}>
              <span class="wb-caption">${theme.value} / ${density.value}</span>
              ${content()}
            </div>
          `,
        ),
      )}
    </div>
  `;
}

/** A labeled group in a state matrix. */
export function group(title: string, content: TemplateResult): TemplateResult {
  return html`
    <section class="wb-section">
      <h3>${title}</h3>
      ${content}
    </section>
  `;
}
