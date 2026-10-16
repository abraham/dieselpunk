import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { statusLightStyles } from './status-light.styles.ts';

export type StatusVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const variants: readonly string[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/**
 * A compact indicator: a shape in an inset lens, and the text that says what it means. Each
 * variant has its own shape, so color is never the only cue, and the shape is hidden from
 * assistive technology because the text carries the meaning.
 *
 * @tagname punk-status-light
 *
 * @slot - The text. A light without text warns in development.
 * @slot icon - Replaces the built-in shape, for example with an icon.
 *
 * @csspart indicator - The inset lens that holds the shape.
 * @csspart label - The wrapper around the text.
 */
export class PunkStatusLight extends PunkElement {
  static override styles = statusLightStyles;

  /** A ring for `neutral`, a diamond for `info`, a circle for `success`, a triangle for `warning`, a square for `danger`. Unknown values render as `neutral`. */
  @property({ reflect: true }) variant: StatusVariant = 'neutral';

  /** Makes the host a polite live region, for a light whose text changes while the user is elsewhere. */
  @property({ type: Boolean, reflect: true }) announce = false;

  readonly #presence = new SlotPresence(this, ['']);
  #hasText = true;
  // The role the host had before `announce` took it, to give back when `announce` is off.
  #authorRole: string | null | undefined;

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
    const hasText = this.#presence.has('');
    if (!hasText && this.#hasText) devWarn(this, 'It has no text. The text carries the meaning.');
    this.#hasText = hasText;
  }

  protected override render() {
    const variant = variants.includes(this.variant) ? this.variant : 'neutral';
    return html`
      <span
        part="indicator"
        class=${classMap({ indicator: true, [`variant-${variant}`]: true })}
        aria-hidden="true"
        ><slot name="icon"><span class="shape"></span></slot
      ></span>
      <span part="label" class="label"
        ><slot @slotchange=${this.#presence.handleSlotChange}></slot
      ></span>
    `;
  }
}
