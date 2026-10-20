import { html } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { firstTabbable } from '../../internal/modal.ts';
import { PunkModalSurface } from '../../internal/modal-surface.ts';
import { devWarn } from '../../utilities/warn.ts';
import { dialogStyles } from './dialog.styles.ts';

/**
 * A modal confirmation or task surface. It makes the rest of the page inert, traps focus, starts
 * focus on content, and gives focus back to what opened it. It has no titlebar close button; its
 * actions are in the footer, and any element in it with `data-punk-close` closes it. Escape closes
 * it unless `persistent`, which also keeps Escape from reaching anything beneath. A click on the
 * backdrop closes nothing.
 *
 * @tagname punk-dialog
 *
 * @slot - The content.
 * @slot footer - The actions. They stack at container widths of 480px and below.
 *
 * @csspart dialog - The dialog.
 * @csspart header - The area around the title.
 * @csspart title - The heading text.
 * @csspart body - The content, a focusable scroll region while it overflows.
 * @csspart footer - The actions.
 *
 * @cssprop [--punk-dialog-max-width=560px] - The widest the dialog gets. It is wider than the footer's 480px stacking width, so a confirmation's actions sit in a row unless the screen is narrow.
 *
 * @fires punk-open - It opened.
 * @fires punk-close - It closed. `detail` is `{ reason, returnValue }`.
 */
export class PunkDialog extends PunkModalSurface {
  static override styles = dialogStyles;

  static override properties: PropertyDeclarations = {
    persistent: { type: Boolean, reflect: true },
    alert: { type: Boolean, reflect: true },
    returnValue: { attribute: false },
  };

  /** Escape does not close it, and does not reach anything beneath it. */
  persistent = false;

  /** Makes it an `alertdialog` described by its content. */
  alert = false;

  /** What it was closed with: the `data-punk-close` value, or the argument to `close()`. */
  returnValue = '';

  protected readonly isModal = true;

  protected get isDismissible(): boolean {
    return !this.persistent;
  }

  #warnedFocus = false;

  constructor() {
    super();
    this.addEventListener('click', this.#handleClick);
  }

  /** Closes it. `returnValue` is reported in `punk-close`. */
  close(returnValue?: string): void {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.modalController.close('method', returnValue ?? (this.returnValue || undefined));
  }

  protected override pendingReturnValue(): string | undefined {
    return this.returnValue || undefined;
  }

  protected override opened(): void {
    if (this.persistent || this.#warnedFocus || firstTabbable([...this.children])) return;
    this.#warnedFocus = true;
    devWarn(
      this,
      'It has nothing to focus, and is not `persistent`, so a touch user cannot close it.',
    );
  }

  readonly #handleClick = (event: Event): void => {
    const target = event
      .composedPath()
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement &&
          node !== this &&
          this.contains(node) &&
          node.hasAttribute('data-punk-close'),
      );
    if (!target) return;
    const value = target.getAttribute('data-punk-close') ?? '';
    this.returnValue = value;
    this.modalController.close('action', value);
  };

  protected override render() {
    const { labelledby, label } = this.labelAttributes;
    return html`
      <dialog
        part="dialog"
        role=${ifDefined(this.alert ? 'alertdialog' : undefined)}
        aria-labelledby=${ifDefined(labelledby)}
        aria-label=${ifDefined(label)}
        aria-describedby=${ifDefined(this.alert ? 'body' : undefined)}
      >
        <div part="header" class="header" ?hidden=${!this.heading}>
          <div part="title" class="title" id="title">${this.heading}</div>
        </div>
        ${this.renderBody()}
      </dialog>
    `;
  }
}
