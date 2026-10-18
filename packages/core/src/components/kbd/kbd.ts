import { html } from 'lit';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { devWarn } from '../../utilities/warn.ts';
import { kbdStyles } from './kbd.styles.ts';

/**
 * One keyboard key, drawn as a keycap around a native `<kbd>`. A shortcut is several keys in a
 * row, with the application's own text between them: `<punk-kbd>Ctrl</punk-kbd> +
 * <punk-kbd>S</punk-kbd>`. The key names are the application's text, so they are translated with
 * the rest of the page. It has no role, and its text joins the name of the element that holds it.
 *
 * @tagname punk-kbd
 *
 * @slot - The key's name, such as `Ctrl` or `Enter`. A key without text warns in development.
 *
 * @csspart key - The keycap, a native `<kbd>`.
 */
export class PunkKbd extends PunkElement {
  static override styles = kbdStyles;

  readonly #presence = new SlotPresence(this, ['']);
  #hasText = true;

  protected override updated(): void {
    const hasText = this.#presence.has('');
    if (!hasText && this.#hasText) devWarn(this, 'It has no text, so it names no key.');
    this.#hasText = hasText;
  }

  protected override render() {
    return html`<kbd part="key" class="key"
      ><slot @slotchange=${this.#presence.handleSlotChange}></slot
    ></kbd>`;
  }
}
