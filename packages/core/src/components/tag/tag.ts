import { html, nothing } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { msg, str } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { PunkRemoveDetail } from '../connection-row/connection-row.ts';
import { tagStyles } from './tag.styles.ts';

/**
 * A chip for a filter, a chosen value, or a label: its text on an inset plate, and with
 * `removable` a native button named "Remove" and the text. The host has no role; the text is
 * read where it stands.
 *
 * The tag does not remove itself: `punk-remove` says that the button was used, and the
 * application removes the tag and moves focus, since the focused button goes with it.
 *
 * @tagname punk-tag
 *
 * @slot - The text. A tag without text warns in development.
 *
 * @csspart tag - The plate.
 * @csspart label - The wrapper around the text.
 * @csspart remove-button - The remove button.
 *
 * @fires punk-remove - The remove button was used. `detail` is `{ value, item }`. It cannot be canceled.
 */
export class PunkTag extends PunkElement {
  static override styles = tagStyles;

  static override properties: PropertyDeclarations = {
    removable: { type: Boolean, reflect: true },
    removeLabel: { attribute: 'remove-label', reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { reflect: true },
  };

  readonly #localeWatcher = new LocaleWatcher(this);

  /** Draws the remove button. */
  removable = false;

  /** The name of the remove button. Unset, it is "Remove" and the tag's text. */
  removeLabel = '';

  /** Disables the remove button. The text stays readable. */
  disabled = false;

  /** Identifies the tag in `punk-remove`. */
  value = '';

  // The tag's text, read when it connects and on `slotchange`, so a render reads none.
  #text = '';
  #warned = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readText();
  }

  #readText(): void {
    this.#text = (this.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  readonly #onSlotChange = (): void => {
    this.#readText();
    this.requestUpdate();
  };

  readonly #onRemove = (): void => {
    this.emit<PunkRemoveDetail>('punk-remove', { value: this.value, item: this });
  };

  #removeName(): string {
    if (this.removeLabel) return this.removeLabel;
    const label = this.#text;
    return msg(str`Remove ${label}`, {
      id: 'removeTag',
      desc: "The name of the button that removes a tag, with the tag's text.",
    });
  }

  protected override updated(): void {
    const missing = !this.#text;
    if (missing && !this.#warned) devWarn(this, 'It has no text, so it says nothing.');
    this.#warned = missing;
  }

  protected override render() {
    return html`<span part="tag" class="tag"
      ><span part="label" class="label"><slot @slotchange=${this.#onSlotChange}></slot></span>${
        this.removable
          ? renderCloseButton({
              part: 'remove-button',
              label: this.#removeName(),
              disabled: this.disabled,
              onClick: this.#onRemove,
            })
          : nothing
      }</span
    >`;
  }
}
