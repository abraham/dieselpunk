import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { RovingController } from '../../internal/roving.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { PunkMenu } from '../menu/menu.ts';
import { menubarStyles } from './menubar.styles.ts';

/**
 * A persistent row of menus at the top of an application window: the APG menubar. Each
 * `punk-menu-item` child is a menubar item, and the `punk-menu` right after it is its menu, as a
 * menu's trigger is its previous sibling. The row is one tab stop.
 *
 * Left and Right move among the items (swapped in right-to-left text), Home and End go to the
 * ends, and Enter, Space, Down, or a click opens an item's menu, Up on its last item. While a menu
 * is open, Left and Right close it and open the next item's menu. Escape closes the menu and
 * returns to its item, and Tab closes it and leaves the row.
 *
 * @tagname punk-menubar
 *
 * @slot - The `punk-menu-item` elements, each followed by its `punk-menu`.
 *
 * @csspart bar - The row.
 */
export class PunkMenubar extends PunkElement {
  static override styles = menubarStyles;

  /** Mirrors the host `aria-label`, which cannot reach the row on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  readonly #roving = new RovingController({ host: this, items: () => this.#items() });

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.#onKeyDown);
    this.#roving.connect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#onKeyDown);
    this.#roving.disconnect();
  }

  protected override firstUpdated(): void {
    if (!this.accessibleLabel && !this.hasAttribute('aria-labelledby')) {
      devWarn(this, 'It has no accessible name. Set `aria-label`.');
    }
    if (this.#items().length === 0) devWarn(this, 'It has no `punk-menu-item` children.');
  }

  #items(): HTMLElement[] {
    return [...this.children].filter(
      (child): child is HTMLElement => child.localName === 'punk-menu-item',
    );
  }

  #menuOf(item: Element | undefined): PunkMenu | null {
    const next = item?.nextElementSibling;
    return next?.localName === 'punk-menu' ? (next as PunkMenu) : null;
  }

  readonly #onSlotChange = (): void => {
    this.#roving.refresh();
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const items = this.#items();
    const path = event.composedPath();
    const item = items.find((candidate) => path[0] === candidate);
    if (item && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      if (!event.repeat) item.click();
      return;
    }
    // From inside an open menu of the row, Left and Right go to the next item's menu. A submenu's
    // own keys come first, and it stops the ones it uses.
    const menu = items
      .map((candidate) => this.#menuOf(candidate))
      .find((candidate) => candidate?.open && path.includes(candidate));
    if (!menu) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    if (!step) return;
    const from = items.indexOf(menu.previousElementSibling as HTMLElement);
    let to = from + step;
    while (items[to]?.hasAttribute('disabled')) to += step;
    const next = items[to];
    event.preventDefault();
    if (!next) return;
    menu.hide();
    this.#roving.focus(next);
    this.#menuOf(next)?.show();
  };

  protected override render() {
    return html`<div
      part="bar"
      class="bar"
      role="menubar"
      aria-orientation="horizontal"
      aria-label=${ifDefined(this.accessibleLabel ?? undefined)}
    >
      <slot @slotchange=${this.#onSlotChange}></slot>
    </div>`;
  }
}
