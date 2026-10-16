import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { optionalNumber } from '../../internal/converters.ts';
import { PunkReceptacleBase } from '../../internal/receptacle-base.ts';
import { receptacleStyles } from '../../styles/receptacle.ts';
import { format, t } from '../../utilities/localize.ts';
import { formatNumber, formatPercent, resolveLang } from '../../utilities/locale.ts';
import { itemStackStyles } from './item-stack.styles.ts';

const MAX_QUALITY = 5;

/**
 * An item in a receptacle, with its count, durability, and quality. The accessible name carries
 * the full name and the unabridged quantity whatever is shown: "Speed module, 1,234". Name it with
 * `name`, not `aria-label`, which would replace the quantity in the accessible name.
 *
 * @tagname punk-item-stack
 *
 * @slot icon - The item's artwork, usually an image or SVG.
 * @slot badge - A small mark in the corner.
 * @slot overlay - Decoration over the whole item. It does not receive pointer events.
 *
 * @csspart slot - The receptacle itself.
 * @csspart icon - The wrapper around the icon slot.
 * @csspart count - The count, on an opaque plate. Hidden when the count is exactly 1.
 * @csspart durability - The durability trough.
 * @csspart quality - The row of quality diamonds.
 * @csspart badge - The wrapper around the badge slot.
 * @csspart overlay - The wrapper around the overlay slot.
 *
 * @cssprop [--punk-slot-size=40px] - Width and height of a medium item. Small is 0.8 times it and large is 1.2 times.
 *
 * @fires punk-activate - The item was clicked or activated with Enter or Space. `detail` is `{ value, item }`.
 */
export class PunkItemStack extends PunkReceptacleBase {
  static override styles = [receptacleStyles, itemStackStyles];

  /** The item's name, read by assistive technology but not shown. */
  @property({ reflect: true }) name = '';

  /** How many. Shown on the item unless it is exactly 1, and never below 0. */
  @property({ type: Number, reflect: true }) count = 1;

  /** The most the stack holds. When set, the count is shown as `count/capacity`. */
  @property({ converter: optionalNumber, reflect: true }) capacity: number | undefined;

  /** Remaining durability from 0 to 1. Leave it unset for an item that does not wear. */
  @property({ converter: optionalNumber, reflect: true }) durability: number | undefined;

  /** A whole number from 0 to 5, shown as that many diamonds. */
  @property({ type: Number, reflect: true }) quality = 0;

  /** Abbreviates the shown count, such as 1.2K. The accessible text is never abbreviated. */
  @property({ type: Boolean, attribute: 'compact-count', reflect: true }) compactCount = false;

  /** Effective values after clamping, shared by rendering, the name, and the warnings. */
  #resolve() {
    // Removing a number attribute sets its property to null, which means "use the default".
    const rawCount = (this.count as number | null) ?? 1;
    const rawQuality = (this.quality as number | null) ?? 0;
    const count = Number.isFinite(rawCount) ? Math.max(rawCount, 0) : 0;
    const capacity =
      this.capacity !== undefined && Number.isFinite(this.capacity) && this.capacity > 0
        ? this.capacity
        : undefined;
    const durability =
      this.durability !== undefined && Number.isFinite(this.durability)
        ? Math.min(Math.max(this.durability, 0), 1)
        : undefined;
    const quality = Number.isFinite(rawQuality)
      ? Math.min(Math.max(Math.round(rawQuality), 0), MAX_QUALITY)
      : 0;
    return { count, capacity, durability, quality, rawCount, rawQuality };
  }

  protected override describeProblems(): string[] {
    const found = super.describeProblems();
    const { count, capacity, durability, quality, rawCount, rawQuality } = this.#resolve();
    if (count !== rawCount) {
      found.push(`\`count\` is ${rawCount}; using ${count}, because it must be 0 or more.`);
    }
    if (this.capacity !== undefined && capacity === undefined) {
      found.push(`\`capacity\` is ${this.capacity}; ignoring it, because it must be above 0.`);
    }
    if (this.durability !== undefined && durability !== this.durability) {
      found.push(
        `\`durability\` is ${this.durability}; using ${durability ?? 'none'}, from 0 to 1.`,
      );
    }
    if (quality !== rawQuality) {
      found.push(`\`quality\` is ${rawQuality}; using ${quality}, a whole number from 0 to 5.`);
    }
    return found;
  }

  protected get hasName(): boolean {
    return this.name !== '';
  }

  protected get hasContent(): boolean {
    return this.presence.has('icon');
  }

  protected get empty(): boolean {
    return !this.hasContent && !this.#shownCount;
  }

  /** The count is shown unless it is exactly 1, and always when there is a capacity. */
  get #shownCount(): boolean {
    const { count, capacity } = this.#resolve();
    return capacity !== undefined || count !== 1;
  }

  protected accessibleParts(): string[] {
    const { count, capacity, durability, quality } = this.#resolve();
    const lang = resolveLang(this);
    const full = (value: number) => formatNumber(value, lang);
    return [
      this.name,
      capacity === undefined
        ? format('stackCount', '{count}', { count: full(count) })
        : format('stackCapacity', '{count} of {capacity}', {
            count: full(count),
            capacity: full(capacity),
          }),
      durability === undefined
        ? ''
        : format('durability', 'durability {percent}', {
            percent: formatPercent(durability, lang),
          }),
      quality === 0 ? '' : format('quality', 'quality {level}', { level: full(quality) }),
      this.invalid ? t('invalid', 'invalid') : '',
    ];
  }

  protected override render() {
    const { count, capacity, durability, quality } = this.#resolve();
    const lang = resolveLang(this);
    const shown = (value: number) =>
      formatNumber(
        value,
        lang,
        this.compactCount ? { notation: 'compact', maximumFractionDigits: 1 } : {},
      );
    const level =
      durability === undefined
        ? ''
        : durability >= 0.5
          ? 'ok'
          : durability >= 0.25
            ? 'low'
            : 'critical';

    return this.renderReceptacle(
      'icon',
      html`<slot name="icon" @slotchange=${this.presence.handleSlotChange}></slot>`,
      html`
        ${
          quality === 0
            ? nothing
            : html`<div part="quality" class="quality" aria-hidden="true">
                ${Array.from({ length: quality }, () => html`<span class="diamond"></span>`)}
              </div>`
        }
        ${
          durability === undefined
            ? nothing
            : html`<div part="durability" class="durability" aria-hidden="true">
                <div class="durability-fill level-${level}" style="--_ratio: ${durability}"></div>
              </div>`
        }
        ${
          this.#shownCount
            ? html`<span
                part="count"
                class=${classMap({ count: true, 'above-bar': durability !== undefined })}
                aria-hidden="true"
                >${capacity === undefined ? shown(count) : `${shown(count)}/${shown(capacity)}`}</span
              >`
            : nothing
        }
      `,
    );
  }
}
