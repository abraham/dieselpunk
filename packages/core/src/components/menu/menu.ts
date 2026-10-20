import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { resolveAnchor, wireAnchorState } from '../../internal/anchor.ts';
import type { AnchorState } from '../../internal/anchor.ts';
import type { PunkCloseDetail, PunkCloseReason } from '../../internal/modal-surface.ts';
import { overlayStack } from '../../internal/overlays.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import { computePosition } from '../../utilities/position.ts';
import type { TooltipPlacement } from '../../utilities/position.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkMenuItem } from './menu-item.ts';
import { menuStyles } from './menu.styles.ts';

export type MenuPlacement = TooltipPlacement;

const placements: readonly string[] = ['top', 'bottom', 'start', 'end'];
const MARGIN = 8;

const activeIn = (root: Node): Element | null => (root as Document | ShadowRoot).activeElement;

/**
 * A menu of `punk-menu-item` commands in the top layer, anchored to its trigger: the element named
 * by `for`, else the previous sibling. The trigger gets `aria-haspopup="menu"` and `aria-expanded`;
 * a click, Enter, or Space on it toggles the menu, and Down or Up opens it on the first or last
 * item. Opening always moves focus to the first enabled item.
 *
 * In the menu, Up and Down move without wrapping, Home and End go to the ends, and a letter moves
 * to the next item that starts with it. Enter, Space, and a click activate an item: a checkbox item
 * toggles, a radio item is chosen among the radio items between the nearest separators, and a plain
 * item closes every open menu and returns focus to the trigger. Each activation sends
 * `punk-activate` from the item. Escape closes the innermost menu, Tab closes them all, and so does
 * a press outside.
 *
 * A `punk-menu` placed right after an item is that item's submenu. Right (Left in right-to-left
 * languages), Enter, Space, or a click opens it on its first item, and Left or Escape closes it and
 * returns to the item. `punk-divider`, `hr`, and `role="separator"` children separate groups.
 *
 * With `context`, the trigger is an area instead: a right click, or the context-menu key or
 * Shift+F10 while focus is in it, opens the menu at the pointer.
 *
 * @tagname punk-menu
 *
 * @slot - The items, separators, and submenus.
 *
 * @csspart surface - The floating surface.
 *
 * @cssprop [--punk-menu-min-width=160px] - The narrowest the surface gets.
 *
 * @fires punk-open - It opened.
 * @fires punk-close - It closed. `detail` is `{ reason }`: `escape`, `outside`, `tab`, `action`, or `method`.
 */
export class PunkMenu extends PunkElement {
  static override styles = menuStyles;

  static override properties: PropertyDeclarations = {
    for: { attribute: 'for' },
    placement: { reflect: true },
    open: { type: Boolean, reflect: true },
    context: { type: Boolean, reflect: true },
  };

  /** Id of the trigger in this element's root. Without it, the previous sibling is the trigger. */
  for = '';

  /** Which side of the trigger. A submenu defaults to `end`. Unknown values use `bottom`. */
  placement: MenuPlacement | '' = '';

  /** Whether it is showing. */
  open = false;

  /** Opens at the pointer on a right click in the trigger, which is an area, not a button. */
  context = false;

  #trigger: HTMLElement | null = null;
  #state: AnchorState | undefined;
  #stopOpenWork: (() => void) | undefined;
  #reason: PunkCloseReason = 'method';
  #silent = false;
  #focusLast = false;
  #point: { x: number; y: number } | undefined;
  #ownedRole = false;
  #warnedTrigger = false;
  #warnedItems = false;

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  /** The menu this one is a submenu of. */
  get #parent(): PunkMenu | null {
    return this.parentElement instanceof PunkMenu ? this.parentElement : null;
  }

  get #root(): PunkMenu {
    const parent = this.#parent;
    return parent ? parent.#root : this;
  }

  get #surface(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.surface');
  }

  /** Opens it. */
  show(): void {
    this.open = true;
  }

  /** Closes it, and any submenu open inside it. */
  hide(): void {
    this.#close('method');
  }

  /** Opens it when closed, and closes it when open. */
  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#attach();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#detach();
    this.#teardown();
    this.#setRole(false);
    if (this.open) {
      this.#silent = true;
      this.open = false;
    }
  }

  protected override firstUpdated(): void {
    this.#attach();
  }

  protected override updated(changed: PropertyValues<this>): void {
    const rewired =
      (changed.has('for') && changed.get('for') !== undefined) ||
      (changed.has('context') && changed.get('context') !== undefined);
    if (rewired) this.#attach(true);
    if (changed.has('open')) this.#syncOpen(changed.get('open') === true);
    else if (this.open && changed.has('placement')) this.#reposition();
  }

  // The trigger

  #attach(force = false): void {
    const next = resolveAnchor(this, this.for);
    if (!force && next && next === this.#trigger) return;
    this.#detach();
    if (!next) {
      if (!this.#warnedTrigger) {
        this.#warnedTrigger = true;
        devWarn(
          this,
          'No trigger found. Set `for` to an element id or place it after its trigger.',
        );
      }
      return;
    }
    this.#warnedTrigger = false;
    this.#trigger = next;
    if (this.context) {
      next.addEventListener('contextmenu', this.#onContextMenu);
      return;
    }
    next.addEventListener('click', this.#onTriggerClick);
    next.addEventListener('keydown', this.#onTriggerKeyDown);
    // A custom trigger that is not defined yet cannot take ARIA on its inner button.
    if (next.localName.includes('-') && !customElements.get(next.localName)) {
      void customElements.whenDefined(next.localName).then(() => {
        if (this.#trigger === next) this.#attach(true);
      });
      return;
    }
    this.#state = wireAnchorState(next, 'menu');
    this.#state.setExpanded(this.open);
  }

  #detach(): void {
    const trigger = this.#trigger;
    if (!trigger) return;
    trigger.removeEventListener('contextmenu', this.#onContextMenu);
    trigger.removeEventListener('click', this.#onTriggerClick);
    trigger.removeEventListener('keydown', this.#onTriggerKeyDown);
    this.#state?.unwire();
    this.#state = undefined;
    this.#trigger = null;
  }

  // Opening and closing

  #syncOpen(wasOpen: boolean): void {
    if (this.open) {
      // One submenu of a menu is open at a time.
      for (const sibling of this.#parent?.children ?? []) {
        if (sibling !== this && sibling instanceof PunkMenu && sibling.open)
          sibling.#closeSilently();
      }
      this.#showSurface();
      this.#startOpenWork();
      this.#state?.setExpanded(true);
      this.#setRole(true);
      this.#focusFirst();
      this.emit('punk-open');
      return;
    }
    if (!wasOpen) return;
    for (const child of this.children) {
      if (child instanceof PunkMenu && child.open) child.#closeSilently();
    }
    const silent = this.#silent;
    const reason = this.#reason;
    this.#silent = false;
    this.#reason = 'method';
    const active = activeIn(this.getRootNode());
    const hadFocus = Boolean(active && this.contains(active));
    this.#teardown();
    const surface = this.#surface;
    if (surface?.matches(':popover-open')) surface.hidePopover();
    this.#state?.setExpanded(false);
    this.#setRole(false);
    this.#point = undefined;
    if (silent) return;
    if (hadFocus) this.#trigger?.focus({ preventScroll: true });
    this.emit<PunkCloseDetail>('punk-close', { reason });
  }

  #close(reason: PunkCloseReason): void {
    if (!this.open) return;
    this.#reason = reason;
    this.open = false;
  }

  #closeSilently(): void {
    this.#silent = true;
    this.open = false;
    // Synchronously, so the parent's focus check sees it closed.
    this.performUpdate();
  }

  #showSurface(): void {
    const surface = this.#surface;
    if (!surface) return;
    // Disabling showPopover is how the fixed-position fallback is exercised.
    if (typeof surface.showPopover === 'function' && !surface.matches(':popover-open')) {
      surface.showPopover();
    }
    this.#reposition();
  }

  /** The host is the menu while it is showing, so a closed one has no menu with nothing in it. */
  #setRole(on: boolean): void {
    if (on && !this.hasAttribute('role')) {
      this.setAttribute('role', 'menu');
      this.#ownedRole = true;
    } else if (!on && this.#ownedRole) {
      this.removeAttribute('role');
      this.#ownedRole = false;
    }
  }

  #reposition(): void {
    const trigger = this.#trigger;
    const surface = this.#surface;
    if (!trigger || !surface || !this.open) return;
    const point = this.#point;
    const size = surface.getBoundingClientRect();
    const rtl = getComputedStyle(this).direction === 'rtl';
    const placement = (
      placements.includes(this.placement) ? this.placement : this.#parent ? 'end' : 'bottom'
    ) as MenuPlacement;
    const at = point ? new DOMRect(point.x, point.y, 0, 0) : trigger.getBoundingClientRect();
    // Placement centers on the cross axis, so the box it is given makes that the start edge instead.
    const anchor =
      placement === 'top' || placement === 'bottom'
        ? {
            left: rtl ? at.right - size.width : at.left,
            top: at.top,
            width: size.width,
            height: at.height,
          }
        : { left: at.left, top: at.top, width: at.width, height: size.height };
    const result = computePosition({
      anchor,
      surface: { width: size.width, height: size.height },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      placement,
      offset: this.#parent || point ? 0 : 4,
      margin: MARGIN,
      rtl,
    });
    surface.style.left = `${result.left}px`;
    surface.style.top = `${result.top}px`;
  }

  /** Work that exists only while open: nothing here runs, or stays registered, once closed. */
  #startOpenWork(): void {
    this.#teardown();
    const trigger = this.#trigger;
    const surface = this.#surface;
    if (!trigger || !surface) return;
    const entry = { dismissible: true, close: () => this.#close('escape') };
    let frame = 0;
    const schedule = (): void => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        this.#reposition();
      });
    };
    const root = !this.#parent;
    // A press outside the root menu closes every menu; submenus are inside it. A press on a button
    // trigger is left to its own click, which toggles, and one in a context area closes.
    const onPointerDown = (event: PointerEvent): void => {
      const path = event.composedPath();
      if (path.includes(this) || (!this.context && path.includes(trigger))) return;
      this.#close('outside');
    };
    overlayStack.push(entry);
    if (root) document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    this.#stopOpenWork = () => {
      overlayStack.remove(entry);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }

  #teardown(): void {
    this.#stopOpenWork?.();
    this.#stopOpenWork = undefined;
  }

  // Items

  #items(): PunkMenuItem[] {
    return [...this.children].filter(
      (child): child is PunkMenuItem => child instanceof PunkMenuItem,
    );
  }

  #submenuOf(item: Element): PunkMenu | null {
    const next = item.nextElementSibling;
    return next instanceof PunkMenu ? next : null;
  }

  #focusFirst(): void {
    const items = this.#items().filter((item) => !item.disabled);
    const target = this.#focusLast ? items.at(-1) : items[0];
    this.#focusLast = false;
    if (target) target.focus();
    else if (!this.#warnedItems) {
      this.#warnedItems = true;
      devWarn(this, 'It has no enabled `punk-menu-item` to focus.');
    }
  }

  #itemFor(event: Event): PunkMenuItem | undefined {
    const items = this.#items();
    return event
      .composedPath()
      .find((node): node is PunkMenuItem => items.includes(node as PunkMenuItem));
  }

  /** Checks a radio item and clears the radio items between the same separators. */
  #checkRadio(item: PunkMenuItem): void {
    const children = [...this.children];
    const at = children.indexOf(item);
    const isBreak = (element: Element) =>
      !(element instanceof PunkMenuItem) && !(element instanceof PunkMenu);
    let start = at;
    while (start > 0 && !isBreak(children[start - 1] as Element)) start--;
    let end = at;
    while (end < children.length - 1 && !isBreak(children[end + 1] as Element)) end++;
    for (const other of children.slice(start, end + 1)) {
      if (other instanceof PunkMenuItem && other.type === 'radio') other.checked = other === item;
    }
  }

  // Events

  readonly #onTriggerClick = (): void => {
    this.toggle();
  };

  readonly #onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const right = getComputedStyle(this).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const opens = this.#parent ? [right] : ['ArrowDown', 'ArrowUp'];
    if (!opens.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    this.#focusLast = event.key === 'ArrowUp';
    if (this.open) this.#focusFirst();
    else this.show();
  };

  readonly #onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    // The context-menu key gives no pointer position, so the menu opens at the trigger.
    this.#point =
      event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : undefined;
    if (this.open) {
      this.#reposition();
      this.#focusFirst();
    } else this.show();
  };

  readonly #onClick = (event: MouseEvent): void => {
    const item = this.#itemFor(event);
    if (!item || item.disabled || !this.open) return;
    // An item with a submenu opens it, through the submenu's own trigger listener.
    if (this.#submenuOf(item)) return;
    if (item.type === 'checkbox') item.checked = !item.checked;
    else if (item.type === 'radio') this.#checkRadio(item);
    item.dispatchEvent(
      new CustomEvent<PunkActivateDetail>('punk-activate', {
        bubbles: true,
        composed: true,
        detail: { value: item.value, item },
      }),
    );
    if (item.type !== 'checkbox' && item.type !== 'radio') this.#root.#close('action');
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const items = this.#items();
    const active = activeIn(this.getRootNode());
    const item = items.find((candidate) => candidate === active);
    if (!item) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const { key } = event;
    if (key === 'Tab') {
      const root = this.#root;
      // Firefox runs the key's own action before the next update, so focus moves and it hides now.
      root.#trigger?.focus({ preventScroll: true });
      root.#close('tab');
      root.performUpdate();
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (!event.repeat) item.click();
      return;
    }
    if (key === (rtl ? 'ArrowRight' : 'ArrowLeft') && this.#parent) {
      event.preventDefault();
      this.#close('method');
      return;
    }
    if (key.length === 1 && key !== ' ') {
      this.#typeahead(items, item, key);
      return;
    }
    const to = nextRovingIndex(
      key,
      items.indexOf(item),
      items.map((other) => other.disabled),
      { orientation: 'vertical', rtl: false },
    );
    if (to === items.indexOf(item)) return;
    event.preventDefault();
    items[to]?.focus();
  };

  #typeahead(items: PunkMenuItem[], from: PunkMenuItem, key: string): void {
    const typed = key.toLocaleLowerCase();
    const start = items.indexOf(from);
    const ordered = [...items.slice(start + 1), ...items.slice(0, start + 1)];
    ordered
      .find(
        (item) =>
          !item.disabled && (item.textContent ?? '').trim().toLocaleLowerCase().startsWith(typed),
      )
      ?.focus();
  }

  protected override render() {
    return html`<div part="surface" class="surface" popover="manual"><slot></slot></div>`;
  }
}
