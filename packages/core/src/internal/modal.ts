import type { OverlayEntry } from './overlay-stack.ts';
import { overlayStack } from './overlays.ts';

let lockCount = 0;
let savedOverflow = '';
let savedPriority = '';

/**
 * Stops the page behind a modal from scrolling. Locks are counted, so two modals open and closed
 * in either order leave `<html>` with the inline `overflow` the author had, not an empty one.
 * Returns the release, which does nothing the second time.
 */
export function acquireScrollLock(): () => void {
  const root = document.documentElement;
  if (lockCount++ === 0) {
    savedOverflow = root.style.getPropertyValue('overflow');
    savedPriority = root.style.getPropertyPriority('overflow');
    root.style.setProperty('overflow', 'hidden');
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lockCount > 0) return;
    if (savedOverflow) root.style.setProperty('overflow', savedOverflow, savedPriority);
    else root.style.removeProperty('overflow');
  };
}

const NATIVE_TABBABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [contenteditable=""], [contenteditable="true"]';

/** Whether `element` can take focus from Tab. A custom element counts when it delegates focus. */
export function isTabbable(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.closest('[inert], [hidden]')) return false;
  if (element.hasAttribute('disabled') || (element as { disabled?: boolean }).disabled)
    return false;
  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null && Number(tabindex) < 0) return false;
  const focusable =
    tabindex !== null ||
    element.matches(NATIVE_TABBABLE) ||
    element.shadowRoot?.delegatesFocus === true;
  return focusable && element.getClientRects().length > 0;
}

/** The first tabbable element in `roots` or below them, in document order. */
export function firstTabbable(roots: readonly Element[]): HTMLElement | null {
  for (const root of roots) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      if (isTabbable(element)) return element;
    }
  }
  return null;
}

function deepActiveElement(): HTMLElement | null {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element instanceof HTMLElement ? element : null;
}

export interface ModalOptions {
  dialog: () => HTMLDialogElement | null;
  /** `showModal()` when true, `show()` when false. */
  modal: () => boolean;
  /** Whether Escape closes it. A dialog that is not dismissible still keeps Escape from passing through. */
  dismissible: () => boolean;
  /** The content the author supplied, searched for `autofocus` and the first tabbable element. */
  contentRoots: () => Element[];
  onOpen?: () => void;
  onClose: (reason: string, returnValue?: string) => void;
}

/**
 * What a component with a `<dialog>` in its shadow tree needs beyond the platform: initial focus
 * on content (never on a titlebar button), focus back to the opener on close, a counted scroll
 * lock, a place on the Escape stack, and a fallback where `showModal` is missing. The native
 * `cancel` event, which a close request such as the Android back button sends, is treated as
 * Escape.
 */
export class ModalController {
  readonly #options: ModalOptions;
  #open = false;
  #opener: HTMLElement | null = null;
  #release: (() => void) | undefined;
  readonly #entry: OverlayEntry;

  constructor(options: ModalOptions) {
    this.#options = options;
    this.#entry = {
      get dismissible() {
        return options.dismissible();
      },
      close: () => this.close('escape'),
    };
  }

  get isOpen(): boolean {
    return this.#open;
  }

  open(): void {
    const dialog = this.#options.dialog();
    if (!dialog || this.#open) return;
    this.#opener = deepActiveElement();
    const modal = this.#options.modal();
    if (typeof dialog.showModal === 'function') {
      if (modal) dialog.showModal();
      else dialog.show();
    } else {
      dialog.setAttribute('open', '');
      dialog.dataset['fallback'] = '';
    }
    this.#open = true;
    dialog.addEventListener('cancel', this.#onCancel);
    dialog.addEventListener('close', this.#onNativeClose);
    overlayStack.push(this.#entry);
    if (modal) this.#release = acquireScrollLock();
    this.#focusInitial(dialog);
    this.#options.onOpen?.();
  }

  close(reason: string, returnValue?: string): void {
    if (!this.#open) return;
    this.#teardown();
    const dialog = this.#options.dialog();
    if (dialog?.open) {
      if (typeof dialog.close === 'function' && !('fallback' in dialog.dataset)) {
        dialog.close(returnValue);
      } else {
        dialog.removeAttribute('open');
      }
    }
    delete dialog?.dataset['fallback'];
    const opener = this.#opener;
    this.#opener = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    this.#options.onClose(reason, returnValue);
  }

  /** For disconnection: lets go of everything without sending events or moving focus. */
  dispose(): void {
    if (!this.#open) return;
    this.#teardown();
    this.#opener = null;
  }

  #teardown(): void {
    this.#open = false;
    const dialog = this.#options.dialog();
    dialog?.removeEventListener('cancel', this.#onCancel);
    dialog?.removeEventListener('close', this.#onNativeClose);
    overlayStack.remove(this.#entry);
    this.#release?.();
    this.#release = undefined;
  }

  #focusInitial(dialog: HTMLDialogElement): void {
    const roots = this.#options.contentRoots();
    const autofocus = roots
      .flatMap((root) =>
        root.matches('[autofocus]') ? [root] : [...root.querySelectorAll('[autofocus]')],
      )
      .find((element): element is HTMLElement => element instanceof HTMLElement);
    const target = autofocus ?? firstTabbable(roots);
    if (target) {
      target.focus();
      return;
    }
    dialog.setAttribute('tabindex', '-1');
    dialog.focus();
  }

  readonly #onCancel = (event: Event): void => {
    // The platform would close the dialog itself, so the decision is taken here.
    event.preventDefault();
    if (this.#options.dismissible()) this.close('escape');
  };

  readonly #onNativeClose = (): void => {
    this.close('method');
  };
}
