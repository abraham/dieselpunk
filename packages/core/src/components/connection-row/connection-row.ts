import { html, nothing } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { msg, str } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { warnNew } from '../../utilities/warn.ts';
import { connectionRowStyles } from './connection-row.styles.ts';

export type ConnectionDirection = 'forward' | 'backward' | 'both';
export type ConnectionStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface PunkRemoveDetail {
  value: string;
  item: HTMLElement;
}

declare global {
  interface HTMLElementEventMap {
    'punk-remove': CustomEvent<PunkRemoveDetail>;
  }
}

const directions: readonly string[] = ['forward', 'backward', 'both'];
const statuses: readonly string[] = ['neutral', 'info', 'success', 'warning', 'danger'];

/**
 * A logistics or circuit connection on an inset plate: a source, an arrow, a destination, details,
 * a status, and a button that asks for its removal. The nodes, the direction as a word, the
 * details, and the status text are text in reading order, and the host has no role. The status is
 * a shape as well as its text, so color is never the only cue.
 *
 * The row does not remove itself: `punk-remove` says that the button was used, and the application
 * removes the row and moves focus, since the focused button goes with it.
 *
 * @tagname punk-connection-row
 *
 * @slot source - The application's node: an icon and a label.
 * @slot destination - The application's node: an icon and a label.
 * @slot - Details, such as a condition, a signal, or a rate.
 * @slot status - The status text.
 *
 * @csspart row - The plate.
 * @csspart source - The wrapper around the source.
 * @csspart direction - The arrow and its hidden word.
 * @csspart destination - The wrapper around the destination.
 * @csspart details - The wrapper around the details.
 * @csspart status - The wrapper around the status shape and text.
 * @csspart indicator - The inset lens that holds the status shape.
 * @csspart status-label - The wrapper around the status text.
 * @csspart remove-button - The remove button.
 *
 * @fires punk-remove - The remove button was used. `detail` is `{ value, item }`. It cannot be canceled.
 */
export class PunkConnectionRow extends PunkElement {
  static override styles = connectionRowStyles;

  static override properties: PropertyDeclarations = {
    direction: { reflect: true },
    status: { reflect: true },
    removable: { type: Boolean, reflect: true },
    removeLabel: { attribute: 'remove-label', reflect: true },
    disabled: { type: Boolean, reflect: true },
    value: { reflect: true },
  };

  readonly #localeWatcher = new LocaleWatcher(this);

  /** `forward` points from the source to the destination, `backward` the other way, and `both` has two heads. It flips in right-to-left. Unknown values use `forward`. */
  direction: ConnectionDirection = 'forward';

  /** A shape beside the `status` text: a ring for `neutral`, a diamond for `info`, a circle for `success`, a triangle for `warning`, a square for `danger`. Unknown values use `neutral`. */
  status: ConnectionStatus = 'neutral';

  /** Draws the remove button. */
  removable = false;

  /** The name of the remove button. Unset, it is made from the text of the source and the destination. */
  removeLabel = '';

  /** Disables the remove button. Every word stays readable. */
  disabled = false;

  /** Identifies the row in `punk-remove`. */
  value = '';

  readonly #presence = new SlotPresence(this, ['source', 'destination', '', 'status']);
  #problems = new Set<string>();

  // The text of the two nodes, read when the row connects and on `slotchange`, so a render reads none.
  #source = '';
  #destination = '';

  #slotText(name: string): string {
    return Array.from(this.children)
      .filter((child) => (child.getAttribute('slot') ?? '') === name)
      .map((child) => child.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  #readNodes(): void {
    this.#source = this.#slotText('source');
    this.#destination = this.#slotText('destination');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readNodes();
  }

  readonly #onSlotChange = (): void => {
    this.#readNodes();
    this.#presence.handleSlotChange();
    this.requestUpdate();
  };

  readonly #onRemove = (): void => {
    this.emit<PunkRemoveDetail>('punk-remove', { value: this.value, item: this });
  };

  #word(direction: ConnectionDirection): string {
    switch (direction) {
      case 'forward':
        return msg('to', {
          id: 'connectionTo',
          desc: 'Says that a connection runs to the second node.',
        });
      case 'backward':
        return msg('from', {
          id: 'connectionFrom',
          desc: 'Says that a connection runs from the second node.',
        });
      case 'both':
        return msg('to and from', {
          id: 'connectionBoth',
          desc: 'Says that a connection runs both ways.',
        });
    }
  }

  #removeName(): string {
    if (this.removeLabel) return this.removeLabel;
    const source = this.#source;
    const destination = this.#destination;
    return msg(str`Remove connection: ${source}, ${destination}`, {
      id: 'removeConnection',
      desc: 'The name of the button that removes a connection, with the text of its two nodes.',
    });
  }

  protected override updated(): void {
    this.#problems = warnNew(this, this.#problems, () => [
      !this.#presence.has('source') &&
        !this.#presence.has('destination') &&
        !this.removeLabel &&
        'It has no `source` or `destination`, so nothing says what it connects.',
      this.status !== 'neutral' &&
        statuses.includes(this.status) &&
        !this.#presence.has('status') &&
        'A `status` other than `neutral` has no text in the `status` slot.',
    ]);
  }

  protected override render() {
    const direction = (
      directions.includes(this.direction) ? this.direction : 'forward'
    ) as ConnectionDirection;
    const status = statuses.includes(this.status) ? this.status : 'neutral';
    const has = (name: string) => this.#presence.has(name);
    const showStatus = status !== 'neutral' || has('status');
    return html`
      <div part="row" class="row readout">
        <div class="nodes">
          <span part="source" class="source"
            ><slot name="source" @slotchange=${this.#onSlotChange}></slot
          ></span>
          <span part="direction" class="direction"
            ><span class=${classMap({ arrow: true, [direction]: true })} aria-hidden="true"></span
            ><span class="visually-hidden">${this.#word(direction)}</span></span
          >
          <span part="destination" class="destination"
            ><slot name="destination" @slotchange=${this.#onSlotChange}></slot
          ></span>
        </div>
        <div part="details" class="details" ?hidden=${!has('')}>
          <slot @slotchange=${this.#onSlotChange}></slot>
        </div>
        <div part="status" class="status" ?hidden=${!showStatus}>
          <span
            part="indicator"
            class=${classMap({ indicator: true, [`variant-${status}`]: true })}
            aria-hidden="true"
            ><span class="shape"></span
          ></span>
          <span part="status-label" class="status-label" ?hidden=${!has('status')}
            ><slot name="status" @slotchange=${this.#onSlotChange}></slot
          ></span>
        </div>
        ${
          this.removable
            ? renderCloseButton({
                part: 'remove-button',
                label: this.#removeName(),
                disabled: this.disabled,
                onClick: this.#onRemove,
              })
            : nothing
        }
      </div>
    `;
  }
}
