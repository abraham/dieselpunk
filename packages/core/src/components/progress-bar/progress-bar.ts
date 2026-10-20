import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { formatPercent, resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { progressBarStyles } from './progress-bar.styles.ts';

export type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';

const variants: readonly string[] = ['default', 'success', 'warning', 'danger'];
const DEFAULT_MAX = 100;

/** An empty attribute means "no value", which is indeterminate, not zero. */
const valueConverter = {
  fromAttribute: (attribute: string | null): number | undefined =>
    attribute === null || attribute === '' ? undefined : Number(attribute),
  toAttribute: (value: number | undefined): string | null =>
    value === undefined ? null : String(value),
};

/**
 * A progress bar for production, research, or transfer. Without a `value` it is indeterminate.
 *
 * @tagname punk-progress-bar
 *
 * @csspart header - The row above the track, holding the label and the value text.
 * @csspart label - The label.
 * @csspart value - The percentage text, shown with `show-value`.
 * @csspart track - The inset trough. It carries the `progressbar` role.
 * @csspart fill - The filled part of the trough.
 *
 * @cssprop [--punk-progress-height=calc(var(--punk-control-height-sm) * 0.6)] - Height of the track.
 */
export class PunkProgressBar extends PunkElement {
  static override styles = progressBarStyles;

  static override properties: PropertyDeclarations = {
    value: { converter: valueConverter, reflect: true },
    max: { type: Number, reflect: true },
    variant: { reflect: true },
    label: { reflect: true },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    showValue: { type: Boolean, attribute: 'show-value', reflect: true },
    accessibleLabel: { attribute: 'aria-label' },
  };

  /** Progress from 0 to `max`. Leave it unset for an indeterminate bar. */
  value: number | undefined;

  /** The value that means complete. A value that is not above zero is treated as 100. */
  max = DEFAULT_MAX;

  /** Each variant has its own fill pattern, so none depends on color alone. */
  variant: ProgressVariant = 'default';

  /** The accessible name, and the visible text above the bar unless `label-hidden` is set. */
  label = '';

  /** Keeps the label as the accessible name but does not show it. */
  labelHidden = false;

  /** Shows the percentage as text. Assistive technology always gets it. */
  showValue = false;

  /** Names the bar when there is no `label`; the host `aria-label` cannot reach the track. */
  accessibleLabel: string | null = null;

  #problems = new Set<string>();

  protected override updated(): void {
    const current = new Set(this.#describeProblems());
    for (const problem of current) {
      if (!this.#problems.has(problem)) devWarn(this, this.#messages[problem] ?? problem);
    }
    this.#problems = current;
  }

  /** Effective values after clamping and fallbacks, shared by rendering and warnings. */
  #resolve(): { max: number; value: number | undefined } {
    const max = Number.isFinite(this.max) && this.max > 0 ? this.max : DEFAULT_MAX;
    const raw = this.value;
    if (raw === undefined || !Number.isFinite(raw)) return { max, value: undefined };
    return { max, value: Math.min(Math.max(raw, 0), max) };
  }

  #describeProblems(): string[] {
    const found: string[] = [];
    if (!(Number.isFinite(this.max) && this.max > 0)) found.push('max');
    const raw = this.value;
    if (raw !== undefined && !Number.isFinite(raw)) found.push('non-finite');
    else if (raw !== undefined && raw !== this.#resolve().value) found.push('range');
    if (!this.label && !this.accessibleLabel) found.push('unnamed');
    return found;
  }

  get #messages(): Record<string, string> {
    return {
      max: `\`max\` is ${this.max}; using ${DEFAULT_MAX} because it must be a number above zero.`,
      'non-finite': `\`value\` is ${this.value}, which is not a finite number; showing an indeterminate bar.`,
      range: `\`value\` ${this.value} is outside 0 to ${this.#resolve().max}; it is clamped.`,
      unnamed: 'A progress bar needs a `label` or an `aria-label` to have an accessible name.',
    };
  }

  protected override render() {
    const { max, value } = this.#resolve();
    const determinate = value !== undefined;
    const ratio = determinate ? value / max : 0;
    const percent = determinate ? formatPercent(ratio, resolveLang(this)) : '';
    const variant = variants.includes(this.variant) ? this.variant : 'default';
    const visibleLabel = Boolean(this.label) && !this.labelHidden;
    const visibleValue = this.showValue && determinate;

    return html`
      <div class="progress">
        <div
          part="header"
          class=${classMap({ header: true, collapsed: !visibleLabel && !visibleValue })}
        >
          <span part="label" id="label" class=${classMap({ label: true, hidden: this.labelHidden })}
            >${this.label}</span
          >
          <span part="value" class="value" ?hidden=${!visibleValue}>${percent}</span>
        </div>
        <div
          part="track"
          class="track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax=${max}
          aria-valuenow=${ifDefined(determinate ? String(value) : undefined)}
          aria-valuetext=${ifDefined(determinate ? percent : undefined)}
          aria-labelledby=${ifDefined(this.label ? 'label' : undefined)}
          aria-label=${ifDefined(this.label ? undefined : (this.accessibleLabel ?? undefined))}
        >
          <div
            part="fill"
            class=${classMap({ fill: true, [`variant-${variant}`]: true, indeterminate: !determinate })}
            style="--_ratio: ${ratio}"
          ></div>
        </div>
      </div>
    `;
  }
}
