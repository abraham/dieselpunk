import { msg } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { optionalNumber } from '../../internal/converters.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { formatPercent, resolveLang } from '../../utilities/locale.ts';
import { warnNew } from '../../utilities/warn.ts';
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
  readonly #localeWatcher = new LocaleWatcher(this);

  static override styles = meterStyles;

  static override properties: PropertyDeclarations = {
    value: { type: Number, reflect: true },
    min: { type: Number, reflect: true },
    max: { type: Number, reflect: true },
    low: { converter: optionalNumber, reflect: true },
    high: { converter: optionalNumber, reflect: true },
    optimum: { converter: optionalNumber, reflect: true },
    segments: { type: Number, reflect: true },
    orientation: { reflect: true },
    label: { reflect: true },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    showValue: { type: Boolean, attribute: 'show-value', reflect: true },
    accessibleLabel: { attribute: 'aria-label' },
  };

  /** The current value, from `min` to `max`. Values outside it are clamped. */
  value = 0;

  /** The lowest value. Must be below `max`, or the range is 0 to 100. */
  min = 0;

  /** The highest value. */
  max = 100;

  /** Where the low region ends. Below it is the low region. */
  low: number | undefined;

  /** Where the high region starts. Above it is the high region. */
  high: number | undefined;

  /** A value in the best region. Without it, the best region is the middle one. */
  optimum: number | undefined;

  /** How many segments the meter is cut into, from 2 to 100. */
  segments = DEFAULT_SEGMENTS;

  /** Unknown values render as `horizontal`. */
  orientation: MeterOrientation = 'horizontal';

  /** The accessible name, and the visible text above the meter unless `label-hidden` is set. */
  label = '';

  /** Keeps the label as the accessible name but does not show it. */
  labelHidden = false;

  /** Shows the percentage and state as text. Assistive technology always gets them. */
  showValue = false;

  /** Names the meter when there is no `label`; the host `aria-label` cannot reach the track. */
  accessibleLabel: string | null = null;

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
    this.#problems = warnNew(this, this.#problems, () => {
      const messages: Record<MeterProblem, string> = {
        range: `\`min\` ${this.min} and \`max\` ${this.max} are not a range, so 0 to 100 is used. \`max\` must be above \`min\`.`,
        value: `\`value\` is ${this.value}, which is not a finite number; using \`min\`.`,
        'value-range': `\`value\` ${this.value} is outside ${this.min} to ${this.max}; it is clamped.`,
        low: `\`low\` is ${this.low}, which is not a number inside the range; it is clamped or ignored.`,
        high: `\`high\` is ${this.high}, which is not a number inside the range; it is clamped or ignored.`,
        optimum: `\`optimum\` is ${this.optimum}, which is not a number inside the range; it is clamped or ignored.`,
        bounds: `\`high\` ${this.high} is below \`low\` ${this.low}; \`high\` is raised to \`low\`.`,
        segments: `\`segments\` is ${this.segments}; using a whole number from 2 to 100.`,
      };
      return [
        ...this.#resolve().problems.map((problem) => messages[problem]),
        !this.label &&
          !this.accessibleLabel &&
          'A meter needs a `label` or an `aria-label` to have an accessible name.',
      ];
    });
  }

  protected override render() {
    const meter = this.#resolve();
    const lang = resolveLang(this);
    const percent = formatPercent(meter.ratio, lang);
    const word =
      meter.state === 'suboptimal'
        ? msg('warning', {
            id: 'meterWarning',
            desc: 'The state word of a meter that is in its warning range.',
          })
        : meter.state === 'critical'
          ? msg('critical', {
              id: 'meterCritical',
              desc: 'The state word of a meter that is in its critical range.',
            })
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
