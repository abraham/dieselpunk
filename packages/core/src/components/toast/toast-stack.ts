import { msg } from '../../internal/localize.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { Ledger, childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { PunkToast, isDismissing } from './toast.ts';
import type { ToastVariant } from './toast.ts';
import { toastStackStyles } from './toast.styles.ts';

export type ToastPlacement = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

export interface PunkToastOptions {
  message: string;
  heading?: string;
  variant?: ToastVariant;
  /** Milliseconds, as `duration` on the toast. */
  duration?: number;
  /** An element for the toast's `action` slot, such as a button. */
  action?: HTMLElement;
}

const placements: readonly string[] = ['top-start', 'top-end', 'bottom-start', 'bottom-end'];
const DEFAULT_LIMIT = 5;

/**
 * Where toasts appear, and what announces them. It has two live regions that exist before any toast
 * does, because a region that is added together with its content is not reliably announced:
 * `role="alert"` for `warning` and `danger`, and `role="status"` for `info` and `success`. It puts
 * each toast in the right one by writing its `slot`, and gives the author's `slot` back when the
 * toast leaves. It stays in the top layer even when empty, since a hidden region is not in the
 * accessibility tree, and lets clicks through everywhere there is no toast.
 *
 * A modal window or dialog makes everything outside it inert, a stack included. Put a stack inside
 * the dialog when its toasts must be usable while it is open.
 *
 * @tagname punk-toast-stack
 *
 * @slot - The toasts. The stack moves each into `polite` or `assertive`.
 * @slot polite - Toasts announced politely. Filled by the stack.
 * @slot assertive - Toasts announced at once. Filled by the stack.
 *
 * @csspart stack - The region that holds the toasts.
 */
export class PunkToastStack extends PunkElement implements Owner<PunkToast> {
  readonly #localeWatcher = new LocaleWatcher(this);

  static override styles = toastStackStyles;

  static override properties: PropertyDeclarations = {
    placement: { reflect: true },
    limit: { type: Number, reflect: true },
    label: { reflect: true },
  };

  /** The corner. `start` and `end` follow the writing direction. Unknown values use `bottom-end`. */
  placement: ToastPlacement = 'bottom-end';

  /** The most toasts it shows. A new toast past it dismisses the oldest, with the reason `limit`. */
  limit = DEFAULT_LIMIT;

  /** The name of the region. Without it, the localized "Notifications". */
  label = '';

  readonly #ledger = new Ledger();

  /** Creates a toast, shows it, and returns it. */
  show(options: PunkToastOptions): PunkToast {
    const toast = document.createElement('punk-toast');
    if (options.heading) toast.heading = options.heading;
    if (options.variant) toast.variant = options.variant;
    if (options.duration !== undefined) toast.duration = options.duration;
    toast.textContent = options.message;
    if (options.action) {
      options.action.slot = 'action';
      toast.append(options.action);
    }
    this.#place(toast);
    this.append(toast);
    this.#enforceLimit();
    return toast;
  }

  /** Dismisses every toast. */
  clear(): void {
    for (const toast of this.#toasts) toast.dismiss('method');
  }

  /** @internal A toast's variant changed, so it moves to the matching live region. */
  [childChanged](toast: PunkToast): void {
    this.#place(toast);
  }

  /** @internal A toast was removed or dismissed: it gets the author's `slot` back. */
  [release](toast: PunkToast): void {
    if (toast[owner] === this) toast[owner] = null;
    this.#ledger.restore(toast);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#showSurface();
  }

  protected override firstUpdated(): void {
    this.#showSurface();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('limit') && changed.get('limit') !== undefined) this.#enforceLimit();
  }

  get #toasts(): PunkToast[] {
    return [...this.children].filter((child): child is PunkToast => child instanceof PunkToast);
  }

  #place(toast: PunkToast): void {
    toast[owner] = this;
    const slot = toast.variant === 'warning' || toast.variant === 'danger' ? 'assertive' : 'polite';
    this.#ledger.write(toast, 'slot', slot);
  }

  #enforceLimit(): void {
    const limit = Number.isFinite(this.limit) ? Math.max(1, Math.floor(this.limit)) : DEFAULT_LIMIT;
    const showing = this.#toasts.filter((toast) => !isDismissing(toast));
    for (const toast of showing.slice(0, Math.max(0, showing.length - limit))) {
      toast.dismiss('limit');
    }
  }

  #showSurface(): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.stack');
    // Disabling showPopover is how the fixed-position fallback is exercised.
    if (typeof surface?.showPopover === 'function' && !surface.matches(':popover-open')) {
      surface.showPopover();
    }
  }

  // Only toasts with no `slot` of their own arrive here; the rest were placed already.
  readonly #handleSlotChange = (): void => {
    for (const toast of this.#toasts) this.#place(toast);
    this.#enforceLimit();
  };

  protected override render() {
    const placement = placements.includes(this.placement) ? this.placement : 'bottom-end';
    const [side, edge] = placement.split('-') as ['top' | 'bottom', 'start' | 'end'];
    return html`
      <div
        part="stack"
        class=${classMap({ stack: true, [side]: true, [edge]: true })}
        popover="manual"
        role="region"
        aria-label=${this.label || msg('Notifications', { id: 'notifications', desc: 'The name of the region that holds toasts.' })}
      >
        <div class="region" role="status" aria-atomic="false">
          <slot name="polite"></slot>
        </div>
        <div class="region" role="alert" aria-atomic="false">
          <slot name="assertive"></slot>
        </div>
        <slot hidden @slotchange=${this.#handleSlotChange}></slot>
      </div>
    `;
  }
}
