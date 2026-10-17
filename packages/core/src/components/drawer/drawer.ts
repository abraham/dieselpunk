import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkModalSurface } from '../../internal/modal-surface.ts';
import { renderCloseButton } from '../../styles/close-button.ts';
import { drawerStyles } from './drawer.styles.ts';

export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';

const placements: readonly string[] = ['start', 'end', 'top', 'bottom'];

/**
 * A panel that slides in from an edge of the viewport: navigation, filters, or details. Give it a
 * `heading`, or an `aria-label`. It is a `<dialog>` in the top layer, shown modal with `modal`
 * (the rest of the page is inert, focus is trapped, the page does not scroll) and beside the page
 * without it. Focus starts on its content and goes back to what opened it.
 *
 * It always has a close button, and Escape always closes it. A click on the backdrop closes
 * nothing. `start` and `end` follow the writing direction. The slide is removed under reduced
 * motion.
 *
 * @tagname punk-drawer
 *
 * @slot - The content.
 * @slot footer - The actions. They stack at container widths of 480px and below.
 *
 * @csspart drawer - The dialog.
 * @csspart header - The bar with the heading and the close button.
 * @csspart title - The heading text.
 * @csspart close-button - The close button.
 * @csspart body - The content, a focusable scroll region while it overflows.
 * @csspart footer - The actions.
 *
 * @cssprop [--punk-drawer-size=320px] - Its width at the start or end, or its height at the top or bottom.
 *
 * @fires punk-open - It opened.
 * @fires punk-close - It closed. `detail` is `{ reason }`: `escape`, `close-button`, or `method`.
 */
export class PunkDrawer extends PunkModalSurface {
  static override styles = drawerStyles;

  /** The edge it comes from. Unknown values use `start`. */
  @property({ reflect: true }) placement: DrawerPlacement = 'start';

  /** Makes the rest of the page inert while it is open. */
  @property({ type: Boolean, reflect: true }) modal = false;

  readonly #localeWatcher = new LocaleWatcher(this);

  protected readonly isDismissible = true;

  protected get isModal(): boolean {
    return this.modal;
  }

  /** Closes it. */
  close(): void {
    this.open = false;
  }

  protected override render() {
    const { labelledby, label } = this.labelAttributes;
    const placement = placements.includes(this.placement) ? this.placement : 'start';
    return html`
      <dialog
        part="drawer"
        class="drawer ${placement}"
        aria-labelledby=${ifDefined(labelledby)}
        aria-label=${ifDefined(label)}
      >
        <div part="header" class="header">
          <div part="title" class="title" id="title">${this.heading}</div>
          ${renderCloseButton({
            part: 'close-button',
            label: msg('Close', {
              id: 'close',
              desc: 'The name of the button that closes a window.',
            }),
            onClick: () => this.modalController.close('close-button'),
          })}
        </div>
        ${this.renderBody()}
      </dialog>
    `;
  }
}
