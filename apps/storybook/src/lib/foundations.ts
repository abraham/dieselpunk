import { LitElement, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { checksFor, contrastRatio } from './contrast.ts';
import { colorNames, compactTokens, lowTokens } from './tokens.ts';

/**
 * Workbench-only elements for the Foundations pages. They render in the light DOM so the
 * workbench stylesheet applies, and read values from the page the way a consumer's CSS would.
 */

/** Swatches and measured contrast for one theme. Put `data-punk-theme` on the element itself. */
export class WbColorTheme extends LitElement {
  static override properties = { theme: { type: String } };

  theme = '';
  #colors = new Map<string, string>();

  override createRenderRoot(): this {
    return this;
  }

  // Computed on every update, so it follows the theme the element currently resolves to.
  protected override willUpdate(): void {
    const style = getComputedStyle(this);
    this.#colors = new Map(
      colorNames.map((name) => [name, style.getPropertyValue(`--punk-${name}`).trim()]),
    );
  }

  #color(name: string): string {
    return this.#colors.get(`color-${name}`) ?? '';
  }

  protected override render(): TemplateResult {
    return html`
      <h3>${this.theme}</h3>
      <div class="wb-swatches">
        ${colorNames.map(
          (name) => html`
            <div class="wb-swatch">
              <div class="wb-swatch-chip" style="background: ${this.#colors.get(name)}"></div>
              <div class="wb-swatch-text">
                ${name.replace('color-', '')}<br />${this.#colors.get(name)}
              </div>
            </div>
          `,
        )}
      </div>
      <table class="wb-table" style="margin-block-start: 16px">
        <thead>
          <tr>
            <th>Foreground</th>
            <th>Background</th>
            <th>Ratio</th>
            <th>Needs</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${checksFor(this.theme).map((check) => this.#row(check))}
        </tbody>
      </table>
    `;
  }

  #row(check: ReturnType<typeof checksFor>[number]): TemplateResult {
    const ratio = contrastRatio(this.#color(check.foreground), this.#color(check.background));
    const passes = ratio !== null && ratio >= check.required;
    const result = passes
      ? html`<span class="wb-pass">pass</span>`
      : check.knownGap
        ? html`<span class="wb-gap" title="Open gap, SPEC-PHASE-1 §6.8">gap</span>`
        : html`<span class="wb-fail">fail</span>`;
    return html`
      <tr>
        <td>${check.foreground}</td>
        <td>${check.background}</td>
        <td class="num">${ratio === null ? '?' : `${ratio.toFixed(2)}:1`}</td>
        <td class="num">${check.required}:1</td>
        <td>${result}</td>
      </tr>
    `;
  }
}

const scaleGroups: { title: string; match: (name: string) => boolean }[] = [
  { title: 'Space', match: (name) => name.startsWith('space-') },
  {
    title: 'Control sizes',
    match: (name) => /^(control-height|icon-size)-/.test(name) || name === 'slot-size',
  },
  { title: 'Type', match: (name) => name.startsWith('font-') },
  {
    title: 'Shape and motion',
    match: (name) => ['radius', 'border-width'].includes(name) || name.startsWith('duration-'),
  },
];

function sample(name: string): TemplateResult | typeof nothing {
  const variable = `var(--punk-${name})`;
  const box = 'display:inline-block;background:var(--punk-color-accent);';
  if (name.startsWith('space-')) {
    return html`<span style="${box}block-size:12px;inline-size:${variable}"></span>`;
  }
  if (name.startsWith('control-height-')) {
    return html`<span style="${box}inline-size:48px;block-size:${variable}"></span>`;
  }
  if (name.startsWith('icon-size-') || name === 'slot-size') {
    return html`<span style="${box}inline-size:${variable};block-size:${variable}"></span>`;
  }
  if (name.startsWith('font-')) {
    return html`<span style="font-family:${variable}">Assembler 0123</span>`;
  }
  return nothing;
}

/** Scale tokens at compact and low density, read from the shipped `tokens.css`. */
export class WbScales extends LitElement {
  override createRenderRoot(): this {
    return this;
  }

  protected override render(): TemplateResult {
    const grouped = new Set<string>();
    return html`
      ${scaleGroups.map(({ title, match }) => {
        const names = [...compactTokens.keys()].filter(match);
        names.forEach((name) => grouped.add(name));
        return this.#table(title, names);
      })}
      ${this.#table(
        'Other',
        [...compactTokens.keys()].filter(
          (name) => !grouped.has(name) && !/^(surface|texture)-/.test(name),
        ),
      )}
    `;
  }

  #table(title: string, names: string[]): TemplateResult {
    return html`
      <section class="wb-section">
        <h3>${title}</h3>
        <table class="wb-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Compact</th>
              <th>Low</th>
            </tr>
          </thead>
          <tbody>
            ${names.map(
              (name) => html`
                <tr>
                  <td class="wb-mono">--punk-${name}</td>
                  <td data-punk-density="compact">${compactTokens.get(name)} ${sample(name)}</td>
                  <td data-punk-density="low">
                    ${lowTokens.get(name) ?? compactTokens.get(name)} ${sample(name)}
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </section>
    `;
  }
}

if (!customElements.get('wb-color-theme')) customElements.define('wb-color-theme', WbColorTheme);
if (!customElements.get('wb-scales')) customElements.define('wb-scales', WbScales);
