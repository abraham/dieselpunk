import { html } from 'lit';
import { PunkButtonBase } from '../../internal/button-base.ts';
import { buttonBaseStyles } from '../../internal/button-base.styles.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { buttonStyles } from './button.styles.ts';

/**
 * A raised industrial push button. Clicks surface as the native `click` event.
 *
 * @tagname punk-button
 *
 * @slot - The label.
 * @slot icon-start - An icon before the label. Hidden while empty.
 * @slot icon-end - An icon after the label. Hidden while empty.
 *
 * @csspart button - The inner native button.
 * @csspart label - The label wrapper.
 * @csspart icon-start - The wrapper of the `icon-start` slot.
 * @csspart icon-end - The wrapper of the `icon-end` slot.
 * @csspart spinner - The loading spinner.
 *
 * @cssprop [--punk-button-padding-inline=var(--punk-space-3)] - Inline padding of the button.
 */
export class PunkButton extends PunkButtonBase {
  static override styles = [buttonBaseStyles, buttonStyles];

  readonly #slots = new SlotPresence(this, ['icon-start', 'icon-end']);

  protected override renderContent() {
    return html`
      <span part="icon-start" class="icon" ?hidden=${!this.#slots.has('icon-start')}>
        <slot name="icon-start" @slotchange=${this.#slots.handleSlotChange}></slot>
      </span>
      <span part="label" class="label"><slot></slot></span>
      <span part="icon-end" class="icon" ?hidden=${!this.#slots.has('icon-end')}>
        <slot name="icon-end" @slotchange=${this.#slots.handleSlotChange}></slot>
      </span>
    `;
  }
}
