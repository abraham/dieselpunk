import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { optionalNumber } from '../../internal/converters.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { t } from '../../utilities/localize.ts';
import { formatPercent, resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { DEFAULT_SEGMENTS, resolveMeter } from './meter-state.ts';
import type { MeterProblem, ResolvedMeter } from './meter-state.ts';
import { meterStyles } from './meter.styles.ts';

export type MeterOrientation = 'horizontal' | 'vertical';

/**
 * A segmented gauge for power, fluid, heat, or capacity. With `low`, `high`, and `optimum` it
 * follows the HTML `<meter>` rules and says whether the value is in a good, poor, or bad region,
 * in words as well as by pattern: a solid fill, diagonal hatching, or cross-hatching.
 *
 * @tagname punk-meter
 *
 * @csspart header - The row above the track, holding the label and the value text.
 * @csspart label - The label.
 * @csspart value - The percentage, and the state when there is one, shown with `show-value`.
 * @csspart track - The inset trough. It carries the `meter` role.
 * @csspart fill - The lit part of the trough.
 *
 * @cssprop [--punk-meter-length=calc(var(--punk-control-height-lg) * 3)] - Length of a vertical meter.
 * @cssprop [--punk-meter-thickness=calc(var(--punk-control-height-sm) * 0.6)] - Thickness of the track.
 */
export class PunkMeter extends PunkElement {
  static override styles = meterStyles;

  /** The current value, from `min` to `max`. Values outside it are clamped. */
  @property({ type: Number, reflect: true }) value = 0;

  /** The lowest value. Must be below `max`, or the range is 0 to 100. */
  @property({ type: Number, reflect: true }) min = 0;

  /** The highest value. */
  @property({ type: Number, reflect: true }) max = 100;

  /** Where the low region ends. Below it is the low region. */
  @property({ converter: optionalNumber, reflect: true }) low: number | undefined;

  /** Where the high region starts. Above it is the high region. */
  @property({ converter: optionalNumber, reflect: true }) high: number | undefined;

  /** A value in the best region. Without it, the best region is the middle one. */
  @property({ converter: optionalNumber, reflect: true }) optimum: number | undefined;

  /** How many segments the meter is cut into, from 2 to 100. */
  @property({ type: Number, reflect: true }) segments = DEFAULT_SEGMENTS;

  /** Unknown values render as `horizontal`. */
  @property({ reflect: true }) orientation: MeterOrientation = 'horizontal';

  /** The accessible name, and the visible text above the meter unless `label-hidden` is set. */
  @property({ reflect: true }) label = '';

  /** Keeps the label as the accessible name but does not show it. */
  @property({ type: Boolean, attribute: 'label-hidden', reflect: true }) labelHidden = false;

  /** Shows the percentage and state as text. Assistive technology always gets them. */
  @property({ type: Boolean, attribute: 'show-value', reflect: true }) showValue = false;

  /** Names the meter when there is no `label`; the host `aria-label` cannot reach the track. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  #problems = new Set<string>();

  /** Effective values, shared by rendering and warnings. A removed number attribute is null. */
  #resolve(): ResolvedMeter {
    return resolveMeter({
      value: (this.value as number | null) ?? 0,
      min: (this.min as number | null) ?? 0,
      max: (this.max as number | null) ?? 100,
      low: this.low,
      high: this.high,
      optimum: this.optimum,
      segments: (this.segments as number | null) ?? DEFAULT_SEGMENTS,
    });
  }

  protected override updated(): void {
    const found = this.#resolve().problems.map((problem) => this.#messages[problem]);
    if (!this.label && !this.accessibleLabel) {
      found.push('A meter needs a `label` or an `aria-label` to have an accessible name.');
    }
    const current = new Set(found as string[]);
    for (const problem of current) if (!this.#problems.has(problem)) devWarn(this, problem);
    this.#problems = current;
  }

  get #messages(): Record<MeterProblem, string> {
    return {
      range: `\`min\` ${this.min} and \`max\` ${this.max} are not a range, so 0 to 100 is used. \`max\` must be above \`min\`.`,
      value: `\`value\` is ${this.value}, which is not a finite number; using \`min\`.`,
      'value-range': `\`value\` ${this.value} is outside ${this.min} to ${this.max}; it is clamped.`,
      low: `\`low\` is ${this.low}, which is not a number inside the range; it is clamped or ignored.`,
      high: `\`high\` is ${this.high}, which is not a number inside the range; it is clamped or ignored.`,
      optimum: `\`optimum\` is ${this.optimum}, which is not a number inside the range; it is clamped or ignored.`,
      bounds: `\`high\` ${this.high} is below \`low\` ${this.low}; \`high\` is raised to \`low\`.`,
      segments: `\`segments\` is ${this.segments}; using a whole number from 2 to 100.`,
    };
  }

  protected override render() {
    const meter = this.#resolve();
    const lang = resolveLang(this);
    const percent = formatPercent(meter.ratio, lang);
    const word =
      meter.state === 'suboptimal'
        ? t('meterWarning', 'warning')
        : meter.state === 'critical'
          ? t('meterCritical', 'critical')
          : '';
    const text = word === '' ? percent : `${percent}, ${word}`;
    const direction = this.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const visibleLabel = Boolean(this.label) && !this.labelHidden;

    return html`
      <div class=${classMap({ meter: true, [direction]: true })}>
        <div
          part="header"
          class=${classMap({ header: true, collapsed: !visibleLabel && !this.showValue })}
        >
          <span part="label" id="label" class=${classMap({ label: true, hidden: this.labelHidden })}
            >${this.label}</span
          >
          <span part="value" class="value" ?hidden=${!this.showValue}>${text}</span>
        </div>
        <div
          part="track"
          class="track"
          role="meter"
          aria-valuemin=${meter.min}
          aria-valuemax=${meter.max}
          aria-valuenow=${meter.value}
          aria-valuetext=${text}
          aria-labelledby=${ifDefined(this.label ? 'label' : undefined)}
          aria-label=${ifDefined(this.label ? undefined : (this.accessibleLabel ?? undefined))}
          style="--_segments: ${meter.segments}; --_lit: ${meter.lit}"
        >
          <div part="fill" class=${classMap({ fill: true, [`state-${meter.state}`]: true })}></div>
          <div class="segments"></div>
        </div>
      </div>
    `;
  }
}
