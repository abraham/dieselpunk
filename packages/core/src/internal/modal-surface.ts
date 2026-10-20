import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues, TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { devWarn } from '../utilities/warn.ts';
import { ModalController } from './modal.ts';
import { PunkElement } from './punk-element.ts';
import { SlotPresence } from './slot-presence.ts';

export type PunkCloseReason = 'escape' | 'close-button' | 'method' | 'action' | 'outside' | 'tab';

export interface PunkCloseDetail {
  reason: PunkCloseReason;
  returnValue?: string;
}

declare global {
  interface HTMLElementEventMap {
    'punk-open': CustomEvent<undefined>;
    'punk-close': CustomEvent<PunkCloseDetail>;
  }
}

/**
 * What a window and a dialog share: a `<dialog>` in the shadow tree driven by `ModalController`,
 * `open` that works from code, an attribute, and the user, a body that becomes a focusable scroll
 * region when it overflows, and a footer that is there only when it has content.
 */
export abstract class PunkModalSurface extends PunkElement {
  static override properties: PropertyDeclarations = {
    heading: { reflect: true },
    open: { type: Boolean, reflect: true },
    accessibleLabel: { attribute: 'aria-label' },
    scrollable: { attribute: false },
  };

  /** The title, and the name of the dialog. Without it, give the element an `aria-label`. */
  heading = '';

  /** Whether it is showing. Setting it from code or an attribute opens and closes it. */
  open = false;

  /** Mirrors the host `aria-label`, which cannot reach the dialog on its own. */
  accessibleLabel: string | null = null;

  /** Whether the body overflows, which makes it a focusable scroll region. */
  protected scrollable = false;

  protected abstract readonly isModal: boolean;
  protected abstract readonly isDismissible: boolean;

  protected readonly footerSlot = new SlotPresence(this, ['footer']);
  #warnedName = false;
  #listening = false;

  protected readonly modalController = new ModalController({
    dialog: () => this.renderRoot?.querySelector('dialog') ?? null,
    modal: () => this.isModal,
    dismissible: () => this.isDismissible,
    contentRoots: () => [...this.children],
    onOpen: () => {
      this.#warnName();
      this.listenForResize(true);
      this.syncScrollable();
      this.opened();
      this.emit('punk-open');
    },
    onClose: (reason, returnValue) => {
      this.listenForResize(false);
      this.closed();
      if (this.open) this.open = false;
      this.emit<PunkCloseDetail>('punk-close', { reason: reason as PunkCloseReason, returnValue });
    },
  });

  /** For a subclass: called after the dialog is showing, and after it closes. */
  protected opened(): void {}
  protected closed(): void {}

  /** The return value a close from code reports. */
  protected pendingReturnValue(): string | undefined {
    return undefined;
  }

  /** Opens it. */
  show(): void {
    this.open = true;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated && this.open) this.#syncOpen();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.modalController.dispose();
    this.listenForResize(false);
    this.renderRoot?.querySelector('dialog')?.removeAttribute('open');
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('open')) this.#syncOpen();
  }

  #syncOpen(): void {
    if (this.open && !this.modalController.isOpen) this.modalController.open();
    else if (!this.open && this.modalController.isOpen) {
      this.modalController.close('method', this.pendingReturnValue());
    }
  }

  #warnName(): void {
    if (!this.heading && !this.accessibleLabel && !this.#warnedName) {
      this.#warnedName = true;
      devWarn(this, 'It has no name. Set `heading`, or `aria-label`.');
    }
  }

  readonly #onResize = (): void => this.syncScrollable();

  protected listenForResize(on: boolean): void {
    if (on === this.#listening) return;
    this.#listening = on;
    if (on) window.addEventListener('resize', this.#onResize);
    else window.removeEventListener('resize', this.#onResize);
  }

  /** The body is a focusable scroll region while it overflows, so a keyboard can scroll it. */
  protected syncScrollable(): void {
    const body = this.renderRoot?.querySelector<HTMLElement>('.body');
    if (body) this.scrollable = body.scrollHeight > body.clientHeight + 1;
  }

  /** `aria-labelledby` or `aria-label` for the dialog. */
  protected get labelAttributes() {
    const named = Boolean(this.heading);
    return {
      labelledby: named ? 'title' : undefined,
      label: named ? undefined : (this.accessibleLabel ?? undefined),
    };
  }

  protected renderBody(): TemplateResult {
    return html`
      <div
        part="body"
        class="body"
        id="body"
        tabindex=${ifDefined(this.scrollable ? '0' : undefined)}
        role=${ifDefined(this.scrollable ? 'region' : undefined)}
        aria-labelledby=${ifDefined(this.scrollable && this.heading ? 'title' : undefined)}
        aria-label=${ifDefined(
          this.scrollable && !this.heading ? (this.accessibleLabel ?? undefined) : undefined,
        )}
      >
        <slot></slot>
      </div>
      <div part="footer" class="footer" ?hidden=${!this.footerSlot.has('footer')}>
        <slot name="footer" @slotchange=${this.footerSlot.handleSlotChange}></slot>
      </div>
    `;
  }
}
