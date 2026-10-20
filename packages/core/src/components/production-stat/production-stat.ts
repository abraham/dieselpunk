import { html, nothing } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { optionalNumber } from '../../internal/converters.ts';
import { msg } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { resolveStat } from '../../internal/stat-format.ts';
import type { ProductionTrend, ResolvedStat } from '../../internal/stat-format.ts';
import { resolveLang } from '../../utilities/locale.ts';
import { warnNew } from '../../utilities/warn.ts';
import { productionStatStyles } from './production-stat.styles.ts';

export type ProductionStatLayout = 'stacked' | 'inline';

/** A drawn graphic with no text alternative, and not hidden: assistive technology would meet it. */
function unnamedGraphic(element: Element): boolean {
  if (!['svg', 'canvas', 'img'].includes(element.localName)) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) return false;
  if (element.localName === 'img' && element.hasAttribute('alt')) return false;
  if (element.localName === 'svg' && element.querySelector(':scope > title')) return false;
  return true;
}

/**
 * A compact metric on an inset plate: a label, a value with its unit, an optional trend and
 * change, and an optional sparkline. The value is formatted for the page's language, in tabular
 * figures that reserve a width, so a column of stats lines up. The trend is a shape and a word,
 * never color alone. The label, value, unit, trend, and change are text in reading order, and the
 * host has no role unless `announce` is set.
 *
 * @tagname punk-production-stat
 *
 * @slot icon - The application's icon for the resource or machine, beside the label.
 * @slot sparkline - A small chart. Give it `aria-hidden="true"`, or a text alternative.
 *
 * @csspart stat - The plate.
 * @csspart icon - The wrapper around the icon.
 * @csspart label - The label.
 * @csspart value - The value.
 * @csspart unit - The unit.
 * @csspart trend - The trend shape and its word.
 * @csspart delta - The change.
 * @csspart sparkline - The wrapper around the sparkline.
 *
 * @cssprop [--punk-stat-value-min=4ch] - The least inline size reserved for the value.
 * @cssprop [--punk-stat-sparkline-size=calc(var(--punk-control-height-md) * 2)] - The inline size of the sparkline.
 */
export class PunkProductionStat extends PunkElement {
  static override styles = productionStatStyles;

  static override properties: PropertyDeclarations = {
    label: { reflect: true },
    value: { converter: optionalNumber, reflect: true },
    unit: { reflect: true },
    decimals: { converter: optionalNumber, reflect: true },
    compact: { type: Boolean, reflect: true },
    trend: { reflect: true },
    delta: { converter: optionalNumber, reflect: true },
    deltaPercent: { type: Boolean, attribute: 'delta-percent', reflect: true },
    layout: { reflect: true },
    announce: { type: Boolean, reflect: true },
  };

  readonly #localeWatcher = new LocaleWatcher(this);

  /** What is measured. */
  label = '';

  /** The measurement, formatted for the page's language. Leave it unset while there is none. */
  value: number | undefined;

  /** The unit, as text. It is never formatted or translated. */
  unit = '';

  /** A fixed number of fraction digits, from 0 to 6. Unset uses the language's own. */
  decimals: number | undefined;

  /** Abbreviates what is shown (`1.2K`). The accessible text always has the full number. */
  compact = false;

  /** The direction of change. When unset it follows the sign of `delta`. */
  trend: ProductionTrend | undefined;

  /** The change, shown with its sign. A plain number, or a ratio with `delta-percent`. */
  delta: number | undefined;

  /** Treats `delta` as a ratio and shows it as a percentage (`0.12` is `+12%`). */
  deltaPercent = false;

  /** `stacked` puts the label above the value. `inline` puts them on one row where there is room. */
  layout: ProductionStatLayout = 'stacked';

  /** Makes the host a polite live region, for a stat that changes while the user is elsewhere. */
  announce = false;

  readonly #presence = new SlotPresence(this, ['icon', 'sparkline']);
  #problems = new Set<string>();
  // The role the host had before `announce` took it, to give back when `announce` is off.
  #authorRole: string | null | undefined;

  #resolve(): ResolvedStat {
    return resolveStat(
      {
        value: this.value,
        decimals: this.decimals,
        compact: this.compact,
        trend: this.trend,
        delta: this.delta,
        deltaPercent: this.deltaPercent,
      },
      resolveLang(this),
    );
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (this.announce) {
      if (this.#authorRole === undefined) this.#authorRole = this.getAttribute('role');
      this.setAttribute('role', 'status');
    } else if (this.#authorRole !== undefined) {
      if (this.#authorRole === null) this.removeAttribute('role');
      else this.setAttribute('role', this.#authorRole);
      this.#authorRole = undefined;
    }
  }

  protected override updated(): void {
    this.#problems = warnNew(this, this.#problems, () => [
      ...this.#resolve().repairs,
      !this.label && 'It has no `label`, so it has no name.',
      [...this.children].some((child) => child.slot === 'sparkline' && unnamedGraphic(child)) &&
        'A graphic in `sparkline` has no `aria-hidden="true"` or text alternative.',
    ]);
  }

  #word(trend: ProductionTrend): string {
    switch (trend) {
      case 'up':
        return msg('up', { id: 'trendUp', desc: 'A measurement is rising.' });
      case 'down':
        return msg('down', { id: 'trendDown', desc: 'A measurement is falling.' });
      case 'flat':
        return msg('unchanged', { id: 'trendFlat', desc: 'A measurement is steady.' });
    }
  }

  #value(stat: ResolvedStat) {
    if (stat.fullValueText === '') {
      return html`<span aria-hidden="true">–</span
        ><span class="visually-hidden"
          >${msg('no value', {
            id: 'statNoValue',
            desc: 'Hidden text for the dash of a measurement not there yet.',
          })}</span
        >`;
    }
    return stat.valueText === stat.fullValueText
      ? stat.valueText
      : html`<span aria-hidden="true">${stat.valueText}</span
          ><span class="visually-hidden">${stat.fullValueText}</span>`;
  }

  protected override render() {
    const stat = this.#resolve();
    const inline = this.layout === 'inline';
    return html`
      <div part="stat" class=${classMap({ stat: true, readout: true, inline })}>
        <div class="head">
          <span part="label" class="label readout-muted">${this.label}</span>
          <span part="icon" class="icon" ?hidden=${!this.#presence.has('icon')}
            ><slot name="icon" @slotchange=${this.#presence.handleSlotChange}></slot
          ></span>
        </div>
        <div class="figures">
          <span part="value" class="value">${this.#value(stat)}</span>
          ${this.unit ? html`<span part="unit" class="unit readout-muted">${this.unit}</span>` : nothing}
          ${
            stat.trend
              ? html`<span part="trend" class=${`trend trend-${stat.trend}`}
                  ><span class="glyph" aria-hidden="true"></span
                  ><span class="visually-hidden">${this.#word(stat.trend)}</span></span
                >`
              : nothing
          }
          ${stat.deltaText ? html`<span part="delta" class="delta">${stat.deltaText}</span>` : nothing}
        </div>
        <div part="sparkline" class="sparkline" ?hidden=${!this.#presence.has('sparkline')}>
          <slot name="sparkline" @slotchange=${this.#presence.handleSlotChange}></slot>
        </div>
      </div>
    `;
  }
}
