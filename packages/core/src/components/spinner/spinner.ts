import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { spinnerStyles } from './spinner.styles.ts';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const sizes: readonly string[] = ['sm', 'md', 'lg'];

/**
 * A loading indicator for a region that is waiting for content: the button's gear spinner on its
 * own, beside a `role="status"` element. The status says "Loading", hidden from view, or the text
 * in the default slot, shown beside the spinner. The spinner turns while it is connected and stands
 * still under reduced motion. For a busy button, use the button's `loading` instead.
 *
 * @tagname punk-spinner
 *
 * @slot - Text shown beside the spinner, which replaces the hidden "Loading".
 *
 * @csspart spinner - The turning ring.
 * @csspart label - The status element, which holds the text.
 */
export class PunkSpinner extends PunkElement {
  static override styles = spinnerStyles;

  static override properties: PropertyDeclarations = {
    size: { reflect: true },
  };

  /** The size of the ring, from the icon sizes. Unknown values use `md`. */
  size: SpinnerSize = 'md';

  readonly #localeWatcher = new LocaleWatcher(this);
  readonly #presence = new SlotPresence(this, ['']);

  protected override render() {
    const size = sizes.includes(this.size) ? this.size : 'md';
    const text = this.#presence.has('');
    return html`<span
        part="spinner"
        class=${classMap({ spinner: true, [`size-${size}`]: true })}
        aria-hidden="true"
      ></span
      ><span part="label" class="label" role="status"
        ><span class="visually-hidden" ?hidden=${text}
          >${msg('Loading', { id: 'loading', desc: 'Hidden text that tells assistive technology a button is busy.' })}</span
        ><slot @slotchange=${this.#presence.handleSlotChange}></slot
      ></span>`;
  }
}
