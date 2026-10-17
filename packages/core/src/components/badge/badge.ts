import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { badgeStyles } from './badge.styles.ts';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const variants: readonly string[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/**
 * A small count or status label, placed inside a tab, a button, a list item, or a row, whose text
 * then joins that element's name. The text carries the meaning: `neutral` is text alone, and
 * every other variant adds its status shape, hidden from assistive technology, so color is never
 * the only cue. It has no role and is never announced.
 *
 * @tagname punk-badge
 *
 * @slot - The text, such as a count. A badge without text warns in development.
 *
 * @csspart badge - The plate around the text.
 * @csspart label - The wrapper around the text.
 */
export class PunkBadge extends PunkElement {
  static override styles = badgeStyles;

  /** `neutral` is text alone; `info`, `success`, `warning`, and `danger` add their shape. Unknown values render as `neutral`. */
  @property({ reflect: true }) variant: BadgeVariant = 'neutral';

  readonly #presence = new SlotPresence(this, ['']);
  #hasText = true;

  protected override updated(): void {
    const hasText = this.#presence.has('');
    if (!hasText && this.#hasText) devWarn(this, 'It has no text, and its text is all it says.');
    this.#hasText = hasText;
  }

  protected override render() {
    const variant = variants.includes(this.variant) ? this.variant : 'neutral';
    return html`<span part="badge" class=${classMap({ badge: true, [`variant-${variant}`]: true })}
      ><span class="shape" aria-hidden="true" ?hidden=${variant === 'neutral'}></span
      ><span part="label" class="label"
        ><slot @slotchange=${this.#presence.handleSlotChange}></slot></span
    ></span>`;
  }
}
