import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { menuItemStyles } from './menu.styles.ts';

export type MenuItemType = 'item' | 'checkbox' | 'radio';

const roles: Record<MenuItemType, string> = {
  item: 'menuitem',
  checkbox: 'menuitemcheckbox',
  radio: 'menuitemradio',
};

/**
 * A command in a `punk-menu`: a `menuitem`, or with `type` a `menuitemcheckbox` or `menuitemradio`
 * that shows a check or a dot while `checked`. Its text is its name. The shortcut slot is shown and
 * hidden from assistive technology, so give the item `aria-keyshortcuts` as well. A `punk-menu`
 * placed right after an item is that item's submenu, and the item then shows an arrow.
 *
 * Its role, `aria-checked`, `aria-disabled`, and `tabindex="-1"` are written on the host; the menu
 * moves focus among its items.
 *
 * @tagname punk-menu-item
 *
 * @slot - The text.
 * @slot icon - Before the text, such as an icon.
 * @slot shortcut - After the text, such as `Ctrl+S`.
 *
 * @csspart item - The row.
 * @csspart check - The check or dot of a checkbox or radio item.
 * @csspart icon - The wrapper around the icon.
 * @csspart label - The wrapper around the text.
 * @csspart shortcut - The wrapper around the shortcut.
 * @csspart arrow - The arrow of an item that opens a submenu.
 */
export class PunkMenuItem extends PunkElement {
  static override styles = menuItemStyles;

  /** `item`, `checkbox`, or `radio`. Unknown values use `item`. */
  @property({ reflect: true }) type: MenuItemType = 'item';

  /** Whether a checkbox or radio item is on. The menu changes it when the user activates the item. */
  @property({ type: Boolean, reflect: true }) checked = false;

  /** Leaves it out of the arrow keys' stops, and stops it being activated. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Identifies the item in `punk-activate`. */
  @property({ reflect: true }) value = '';

  readonly #slots = new SlotPresence(this, ['icon', 'shortcut']);
  // A menubar's items open their menus below them, so they draw no arrow.
  #inBar = false;

  constructor() {
    super();
    // A disabled item's click reaches no listener after this one, as a disabled button's would not.
    this.addEventListener('click', (event) => {
      if (!this.disabled) return;
      event.stopImmediatePropagation();
      event.preventDefault();
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const inBar = this.parentElement?.localName === 'punk-menubar';
    if (inBar !== this.#inBar) {
      this.#inBar = inBar;
      this.requestUpdate();
    }
  }

  get #type(): MenuItemType {
    return Object.hasOwn(roles, this.type) ? this.type : 'item';
  }

  protected override willUpdate(): void {
    const type = this.#type;
    this.setAttribute('role', roles[type]);
    if (type === 'item') this.removeAttribute('aria-checked');
    else this.setAttribute('aria-checked', String(this.checked));
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
  }

  protected override render() {
    const change = this.#slots.handleSlotChange;
    return html`<span part="item" class="item type-${this.#type}${this.#inBar ? ' bar' : ''}">
      <span part="check" class="check" aria-hidden="true"></span>
      <span part="icon" class="icon" ?hidden=${!this.#slots.has('icon')}
        ><slot name="icon" @slotchange=${change}></slot
      ></span>
      <span part="label" class="label"><slot></slot></span>
      <span
        part="shortcut"
        class="shortcut"
        aria-hidden="true"
        ?hidden=${!this.#slots.has('shortcut')}
        ><slot name="shortcut" @slotchange=${change}></slot
      ></span>
      <span part="arrow" class="arrow" aria-hidden="true"></span>
    </span>`;
  }
}
