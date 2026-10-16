import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { createToastTimer } from '../../internal/toast-timer.ts';
import type { ToastTimer } from '../../internal/toast-timer.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { t } from '../../utilities/localize.ts';
import { devWarn } from '../../utilities/warn.ts';
import { toastStyles } from './toast.styles.ts';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';
export type PunkDismissReason = 'user' | 'timeout' | 'method' | 'limit';

export interface PunkDismissDetail {
  reason: PunkDismissReason;
}

declare global {
  interface HTMLElementEventMap {
    'punk-dismiss': CustomEvent<PunkDismissDetail>;
  }
}

/** What a stack lets its toasts tell it. */
export interface ToastOwner {
  toastChanged(toast: PunkToast): void;
  toastLeft(toast: PunkToast): void;
}

const variants: readonly string[] = ['info', 'success', 'warning', 'danger'];
const DEFAULT_DURATION = 5000;

// Toasts on their way out, which a stack does not count against its limit.
const dismissing = new WeakSet<PunkToast>();
export const isDismissing = (toast: PunkToast): boolean => dismissing.has(toast);

/**
 * A short message that does not interrupt. Put it in a `punk-toast-stack`, whose live regions are
 * what announce it; outside a stack it is only shown. The variant is a shape on an inset lens as
 * well as a color, and the text is always in the text color.
 *
 * A toast has a dismiss button. Its countdown pauses while it is hovered, has focus inside, or the
 * document is hidden, and resumes with the time that was left. Unless `duration` says otherwise, an
 * `info` or `success` toast closes after 5 seconds, and a `warning` or `danger` toast, or one with
 * an `action`, stays until it is dismissed. A dismissed toast removes itself, after a short fade
 * that reduced motion leaves out.
 *
 * @tagname punk-toast
 *
 * @slot - The message.
 * @slot action - An action, such as a button. A toast with one does not close by itself.
 *
 * @csspart toast - The toast.
 * @csspart indicator - The inset lens that holds the variant's shape.
 * @csspart heading - The heading text.
 * @csspart content - The wrapper around the message.
 * @csspart action - The wrapper around the action.
 * @csspart dismiss-button - The dismiss button.
 *
 * @fires punk-dismiss - It is being dismissed. `detail` is `{ reason }`: `user`, `timeout`, `method`, or `limit`. Cancel it to keep the toast, for example when a framework removes it.
 */
export class PunkToast extends PunkElement {
  static override styles = toastStyles;

  /** A shape and a color. `warning` and `danger` are announced at once, `info` and `success` politely. Unknown values use `info`. */
  @property({ reflect: true }) variant: ToastVariant = 'info';

  /** Milliseconds before it dismisses itself. Unset is 5000 for `info` and `success`, and none for `warning`, `danger`, or a toast with an `action`. `0` means none. */
  @property({ type: Number, reflect: true }) duration: number | null = null;

  /** A line above the message. */
  @property({ reflect: true }) heading = '';

  /** The stack that manages this toast, which places it in the right live region. */
  @property({ attribute: false }) owner: ToastOwner | null = null;

  @state() protected leaving = false;

  readonly #slots = new SlotPresence(this, ['', 'action']);
  #timer: ToastTimer | undefined;
  #timerDuration = -1;
  #hovered = false;
  #focused = false;
  #warnedText = false;

  constructor() {
    super();
    this.addEventListener('pointerenter', this.#onPointerEnter);
    this.addEventListener('pointerleave', this.#onPointerLeave);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focusout', this.#onFocusOut);
  }

  /** Dismisses it, with the given reason. */
  dismiss(reason: PunkDismissReason = 'method'): void {
    if (dismissing.has(this)) return;
    dismissing.add(this);
    this.#stopTimer();
    const event = new CustomEvent<PunkDismissDetail>('punk-dismiss', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { reason },
    });
    if (!this.dispatchEvent(event)) {
      dismissing.delete(this);
      return;
    }
    void this.#leave();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#syncTimer();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stopTimer();
    this.#hovered = false;
    this.#focused = false;
    this.owner?.toastLeft(this);
  }

  get #variant(): ToastVariant {
    return variants.includes(this.variant) ? this.variant : 'info';
  }

  get #effectiveDuration(): number {
    if (this.duration !== null && Number.isFinite(this.duration)) return Math.max(0, this.duration);
    const quiet = this.#variant === 'info' || this.#variant === 'success';
    return quiet && !this.#slots.has('action') ? DEFAULT_DURATION : 0;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('variant') && changed.get('variant') !== undefined) {
      this.owner?.toastChanged(this);
    }
    this.#syncTimer();
    const hasText = Boolean(this.heading) || this.#slots.has('');
    if (!hasText && !this.#warnedText) {
      this.#warnedText = true;
      devWarn(this, 'It has no text. Fill the default slot or set `heading`.');
    }
  }

  async #leave(): Promise<void> {
    this.leaving = true;
    await this.updateComplete;
    const animations = this.renderRoot.querySelector('.toast')?.getAnimations() ?? [];
    await Promise.allSettled(animations.map((animation) => animation.finished));
    this.remove();
  }

  // The countdown exists only for a toast that will close by itself, and the visibility listener
  // only while it does.
  #syncTimer(): void {
    const duration = this.#effectiveDuration;
    if (this.#timer && duration === this.#timerDuration) return;
    this.#stopTimer();
    if (duration <= 0 || !this.isConnected || dismissing.has(this)) return;
    const timer = createToastTimer(duration, () => this.dismiss('timeout'));
    this.#timer = timer;
    this.#timerDuration = duration;
    if (this.#hovered) timer.hold('hover');
    if (this.#focused) timer.hold('focus');
    if (document.hidden) timer.hold('hidden');
    document.addEventListener('visibilitychange', this.#onVisibilityChange);
    timer.start();
  }

  #stopTimer(): void {
    if (!this.#timer) return;
    this.#timer.stop();
    this.#timer = undefined;
    this.#timerDuration = -1;
    document.removeEventListener('visibilitychange', this.#onVisibilityChange);
  }

  readonly #onVisibilityChange = (): void => {
    if (document.hidden) this.#timer?.hold('hidden');
    else this.#timer?.release('hidden');
  };

  // A touch makes a pointer enter and leave at once, so only a mouse or pen pauses it.
  readonly #onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovered = true;
    this.#timer?.hold('hover');
  };

  readonly #onPointerLeave = (): void => {
    this.#hovered = false;
    this.#timer?.release('hover');
  };

  readonly #onFocusIn = (): void => {
    this.#focused = true;
    this.#timer?.hold('focus');
  };

  // Focus moving between its own parts is a focusout and then a focusin, so it stays paused.
  readonly #onFocusOut = (): void => {
    this.#focused = false;
    this.#timer?.release('focus');
  };

  protected override render() {
    return html`
      <div
        part="toast"
        class=${classMap({
          toast: true,
          leaving: this.leaving,
          [`variant-${this.#variant}`]: true,
        })}
      >
        <span part="indicator" class="indicator" aria-hidden="true"
          ><span class="shape"></span
        ></span>
        <div class="main">
          <div part="heading" class="heading" ?hidden=${!this.heading}>${this.heading}</div>
          <div part="content" class="content">
            <slot @slotchange=${this.#slots.handleSlotChange}></slot>
          </div>
          <div part="action" class="action" ?hidden=${!this.#slots.has('action')}>
            <slot name="action" @slotchange=${this.#slots.handleSlotChange}></slot>
          </div>
        </div>
        ${renderCloseButton({
          part: 'dismiss-button',
          label: t('dismiss', 'Dismiss'),
          onClick: () => this.dismiss('user'),
        })}
      </div>
    `;
  }
}
