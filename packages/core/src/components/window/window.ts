import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkModalSurface } from '../../internal/modal-surface.ts';
import { overlayStack } from '../../internal/overlays.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { clampOffset, keyboardStep, offsetForCenter } from '../../internal/window-position.ts';
import type { Box, Offset } from '../../internal/window-position.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { t } from '../../utilities/localize.ts';
import { windowStyles } from './window.styles.ts';

export interface PunkMoveDetail {
  /** The translation from where the window sits in the layout. */
  x: number;
  y: number;
}

declare global {
  interface HTMLElementEventMap {
    'punk-move-start': CustomEvent<PunkMoveDetail>;
    'punk-move-end': CustomEvent<PunkMoveDetail>;
  }
}

// A press on one of these is for it, not for moving the window.
const NO_DRAG =
  'button, a, input, select, textarea, [tabindex], [contenteditable], [data-punk-no-drag]';

const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

/**
 * A titled application window, optionally modal, movable, and dismissible. Give it a `heading`, or an
 * `aria-label`. A modal window makes the rest of the page inert, traps focus, and starts focus on
 * content, never on the close or move button. A non-modal one stays in the flow of the page.
 *
 * `movable` adds dragging by the titlebar and a move button, for pointers that cannot drag and for
 * the keyboard: the button starts move mode, in which the arrow keys move the window by 8px (32px
 * with Shift), a click anywhere puts the titlebar's center there, Enter places it, and Escape puts
 * it back. A window never leaves the viewport.
 *
 * @tagname punk-window
 *
 * @slot - The content.
 * @slot footer - The actions. They stack at container widths of 480px and below.
 * @slot icon - An icon before the heading.
 *
 * @csspart window - The dialog.
 * @csspart titlebar - The bar with the heading and buttons.
 * @csspart title - The heading text.
 * @csspart close-button - The close button, with `dismissible`.
 * @csspart move-button - The move button, with `movable`.
 * @csspart body - The content, a focusable scroll region while it overflows.
 * @csspart footer - The actions.
 *
 * @cssprop [--punk-window-max-width=640px] - The widest the window gets.
 *
 * @fires punk-open - It opened.
 * @fires punk-close - It closed. `detail` is `{ reason }`.
 * @fires punk-move-start - A drag or move mode began. `detail` is `{ x, y }`.
 * @fires punk-move-end - It was placed or put back. `detail` is `{ x, y }`.
 */
export class PunkWindow extends PunkModalSurface {
  static override styles = windowStyles;

  /** Makes the rest of the page inert while it is open. */
  @property({ type: Boolean, reflect: true }) modal = false;

  /** Adds dragging by the titlebar, and the move button. */
  @property({ type: Boolean, reflect: true }) movable = false;

  /** Adds the close button, and lets Escape close it. */
  @property({ type: Boolean, reflect: true }) dismissible = false;

  @state() protected moving = false;

  protected get isModal(): boolean {
    return this.modal;
  }

  protected get isDismissible(): boolean {
    return this.dismissible;
  }

  readonly #icon = new SlotPresence(this, ['icon']);
  #offset: Offset = { x: 0, y: 0 };
  #base: Box = { left: 0, top: 0, width: 0, height: 0 };
  #titlebarBase: Box = { left: 0, top: 0, width: 0, height: 0 };
  #drag: { pointerId: number; x: number; y: number; origin: Offset } | null = null;
  #placedFrom: Offset = { x: 0, y: 0 };
  #listeningForResize = false;
  readonly #moveEntry = { dismissible: true, close: () => this.#endMove(false) };

  /** Closes it. */
  close(): void {
    this.modalController.close('method');
  }

  /** Puts it back where the layout placed it. */
  resetPosition(): void {
    this.#applyOffset({ x: 0, y: 0 });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.moving) this.#endMove(false);
    this.#syncResize(false);
  }

  protected override closed(): void {
    if (this.moving) this.#endMove(false);
  }

  get #dialog(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }

  #measure(): void {
    const dialog = this.#dialog;
    const titlebar = this.renderRoot.querySelector<HTMLElement>('.titlebar');
    if (!dialog || !titlebar) return;
    const unmoved = (rect: DOMRect): Box => ({
      left: rect.left - this.#offset.x,
      top: rect.top - this.#offset.y,
      width: rect.width,
      height: rect.height,
    });
    this.#base = unmoved(dialog.getBoundingClientRect());
    this.#titlebarBase = unmoved(titlebar.getBoundingClientRect());
  }

  #clamp(desired: Offset): Offset {
    return clampOffset(desired, this.#base, viewport(), this.matches(':dir(rtl)'));
  }

  #applyOffset(offset: Offset): void {
    this.#offset = offset;
    const dialog = this.#dialog;
    if (dialog) dialog.style.translate = offset.x || offset.y ? `${offset.x}px ${offset.y}px` : '';
    this.#syncResize(Boolean(offset.x || offset.y));
  }

  // The listener exists only while the window is away from where the layout put it.
  #syncResize(on: boolean): void {
    if (on === this.#listeningForResize) return;
    this.#listeningForResize = on;
    if (on) window.addEventListener('resize', this.#onWindowResize);
    else window.removeEventListener('resize', this.#onWindowResize);
  }

  readonly #onWindowResize = (): void => {
    if (!this.open || this.#drag || this.moving) return;
    this.#measure();
    this.#applyOffset(this.#clamp(this.#offset));
  };

  #point(): Offset {
    return { ...this.#offset };
  }

  // Dragging

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (!this.movable || event.button !== 0 || this.moving) return;
    const titlebar = event.currentTarget as HTMLElement;
    const blocked = event
      .composedPath()
      .some((node) => node instanceof Element && node !== titlebar && node.matches(NO_DRAG));
    if (blocked) return;
    this.#measure();
    this.#drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: this.#point(),
    };
    titlebar.setPointerCapture(event.pointerId);
    this.emit<PunkMoveDetail>('punk-move-start', this.#point());
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.#applyOffset(
      this.#clamp({
        x: drag.origin.x + event.clientX - drag.x,
        y: drag.origin.y + event.clientY - drag.y,
      }),
    );
  };

  readonly #onPointerEnd = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.#drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.emit<PunkMoveDetail>('punk-move-end', this.#point());
  };

  // Move mode

  readonly #toggleMove = (): void => {
    if (this.moving) this.#endMove(true);
    else this.#startMove();
  };

  #startMove(): void {
    this.#measure();
    this.#placedFrom = this.#point();
    this.moving = true;
    overlayStack.push(this.#moveEntry);
    document.addEventListener('click', this.#onPlaceClick, true);
    this.emit<PunkMoveDetail>('punk-move-start', this.#point());
  }

  #endMove(place: boolean): void {
    if (!this.moving) return;
    if (!place) this.#applyOffset(this.#placedFrom);
    this.moving = false;
    overlayStack.remove(this.#moveEntry);
    document.removeEventListener('click', this.#onPlaceClick, true);
    this.emit<PunkMoveDetail>('punk-move-end', this.#point());
  }

  readonly #onPlaceClick = (event: MouseEvent): void => {
    if (
      event.composedPath().some((node) => node instanceof Element && node.matches('.move-button'))
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#applyOffset(
      this.#clamp(offsetForCenter({ x: event.clientX, y: event.clientY }, this.#titlebarBase)),
    );
    this.#endMove(true);
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.moving) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#endMove(true);
      return;
    }
    const step = keyboardStep(event.key, event.shiftKey);
    if (!step) return;
    event.preventDefault();
    this.#applyOffset(this.#clamp({ x: this.#offset.x + step.x, y: this.#offset.y + step.y }));
  };

  protected override render() {
    const { labelledby, label } = this.labelAttributes;
    return html`
      <dialog
        part="window"
        aria-labelledby=${ifDefined(labelledby)}
        aria-label=${ifDefined(label)}
        @keydown=${this.#onKeyDown}
      >
        <div
          part="titlebar"
          class="titlebar"
          @pointerdown=${this.#onPointerDown}
          @pointermove=${this.#onPointerMove}
          @pointerup=${this.#onPointerEnd}
          @pointercancel=${this.#onPointerEnd}
        >
          <span class="icon" ?hidden=${!this.#icon.has('icon')}>
            <slot name="icon" @slotchange=${this.#icon.handleSlotChange}></slot>
          </span>
          <div part="title" class="title" id="title">${this.heading}</div>
          ${
            this.movable
              ? html`<button
                  part="move-button"
                  class="close-button move-button"
                  type="button"
                  aria-label=${t('moveWindow', 'Move window')}
                  aria-pressed=${this.moving ? 'true' : 'false'}
                  @click=${this.#toggleMove}
                >
                  <span class="glyph" aria-hidden="true"></span>
                </button>`
              : nothing
          }
          ${
            this.dismissible
              ? renderCloseButton({
                  part: 'close-button',
                  label: t('close', 'Close'),
                  onClick: () => this.modalController.close('close-button'),
                })
              : nothing
          }
        </div>
        ${this.renderBody()}
        <div class="status" role="status">
          ${
            this.moving
              ? t('moving', 'Moving. Use the arrow keys, Enter to place, Escape to cancel.')
              : ''
          }
        </div>
      </dialog>
    `;
  }
}
