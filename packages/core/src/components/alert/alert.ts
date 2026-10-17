import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { PunkDismissDetail, PunkDismissReason } from '../toast/toast.ts';
import { alertStyles } from './alert.styles.ts';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const variants: readonly string[] = ['info', 'success', 'warning', 'danger'];

/**
 * A message that stays in the page until the problem goes away or the user dismisses it: a status
 * shape in an inset lens, an optional heading, the message, and optional actions. The shape is
 * hidden from assistive technology, since the text carries the meaning.
 *
 * Nothing is announced unless `announce` is set, which makes the host a live region while it is:
 * `role="alert"` for `warning` and `danger`, `role="status"` for `info` and `success`. Use it for
 * an alert that appears or changes while the user is elsewhere, not for one that is there when the
 * page loads.
 *
 * `dismissible` adds a dismiss button. Dismissing sends a cancelable `punk-dismiss` and then hides
 * the alert with `hidden`. Focus on the button goes with it, so move focus in the listener.
 *
 * @tagname punk-alert
 *
 * @slot - The message.
 * @slot actions - Buttons or links that act on the message.
 *
 * @csspart alert - The surface.
 * @csspart indicator - The inset lens that holds the shape.
 * @csspart heading - The heading line.
 * @csspart content - The wrapper around the message.
 * @csspart actions - The wrapper around the actions.
 * @csspart dismiss-button - The dismiss button, while `dismissible`.
 *
 * @fires punk-dismiss - It is being dismissed. `detail` is `{ reason }`: `user` or `method`. Cancel it to keep the alert.
 */
export class PunkAlert extends PunkElement {
  static override styles = alertStyles;

  /** A shape and a color: a diamond for `info`, a circle for `success`, a triangle for `warning`, a square for `danger`. Unknown values use `info`. */
  @property({ reflect: true }) variant: AlertVariant = 'info';

  /** A line above the message. */
  @property({ reflect: true }) heading = '';

  /** Adds a dismiss button. */
  @property({ type: Boolean, reflect: true }) dismissible = false;

  /** Makes the host a live region: `alert` for `warning` and `danger`, `status` otherwise. */
  @property({ type: Boolean, reflect: true }) announce = false;

  readonly #localeWatcher = new LocaleWatcher(this);
  readonly #slots = new SlotPresence(this, ['', 'actions']);
  // The role the host had before `announce` took it, to give back when `announce` is off.
  #authorRole: string | null | undefined;
  #hasText = true;

  get #variant(): AlertVariant {
    return variants.includes(this.variant) ? this.variant : 'info';
  }

  /** Dismisses it, with the given reason, unless a listener cancels `punk-dismiss`. */
  dismiss(reason: PunkDismissReason = 'method'): void {
    const event = new CustomEvent<PunkDismissDetail>('punk-dismiss', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { reason },
    });
    if (this.dispatchEvent(event)) this.hidden = true;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (this.announce) {
      if (this.#authorRole === undefined) this.#authorRole = this.getAttribute('role');
      const urgent = this.#variant === 'warning' || this.#variant === 'danger';
      this.setAttribute('role', urgent ? 'alert' : 'status');
    } else if (this.#authorRole !== undefined) {
      if (this.#authorRole === null) this.removeAttribute('role');
      else this.setAttribute('role', this.#authorRole);
      this.#authorRole = undefined;
    }
  }

  protected override updated(): void {
    const hasText = Boolean(this.heading) || this.#slots.has('');
    if (!hasText && this.#hasText) {
      devWarn(this, 'It has no text. Fill the default slot or set `heading`.');
    }
    this.#hasText = hasText;
  }

  protected override render() {
    return html`
      <div part="alert" class=${classMap({ alert: true, [`variant-${this.#variant}`]: true })}>
        <span part="indicator" class="indicator" aria-hidden="true"
          ><span class="shape"></span
        ></span>
        <div class="main">
          <div part="heading" class="heading" ?hidden=${!this.heading}>${this.heading}</div>
          <div part="content" class="content">
            <slot @slotchange=${this.#slots.handleSlotChange}></slot>
          </div>
          <div part="actions" class="actions" ?hidden=${!this.#slots.has('actions')}>
            <slot name="actions" @slotchange=${this.#slots.handleSlotChange}></slot>
          </div>
        </div>
        ${
          this.dismissible
            ? renderCloseButton({
                part: 'dismiss-button',
                label: msg('Dismiss', {
                  id: 'dismiss',
                  desc: 'The name of the button that dismisses a toast.',
                }),
                onClick: () => this.dismiss('user'),
              })
            : null
        }
      </div>
    `;
  }
}
