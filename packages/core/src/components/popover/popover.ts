import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { resolveAnchor, wireAnchorState } from '../../internal/anchor.ts';
import type { AnchorState } from '../../internal/anchor.ts';
import { isTabbable } from '../../internal/modal.ts';
import type { PunkCloseDetail, PunkCloseReason } from '../../internal/modal-surface.ts';
import { overlayStack } from '../../internal/overlays.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import { computePosition } from '../../utilities/position.ts';
import type { TooltipPlacement } from '../../utilities/position.ts';
import { devWarn } from '../../utilities/warn.ts';
import { popoverStyles } from './popover.styles.ts';

export type PopoverPlacement = TooltipPlacement;
export type PopoverMode = 'content' | 'menu';

const placements: readonly string[] = ['top', 'bottom', 'start', 'end'];
const VIEWPORT_MARGIN = 8;
const DEFAULT_OFFSET = 8;
const MENU_ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

const activeIn = (root: Node): Element | null => (root as Document | ShadowRoot).activeElement;

/**
 * An interactive surface anchored to a trigger. The trigger is the element named by `for`, else the
 * previous sibling, and gets `aria-expanded` (and `aria-haspopup="menu"` in menu mode). A click,
 * Enter, or Space on it toggles the popover. Escape and a press outside close it.
 *
 * In `content` mode a pointer leaves focus where it is, and a keyboard open moves it to an
 * `autofocus` element, else the first tabbable one, else the surface. Tab past either end closes it
 * and carries on from the trigger. In `menu` mode the host is `role="menu"`, opening moves focus to
 * the first enabled `menuitem`, Up, Down, Home, and End move among them without wrapping, and Tab
 * closes. Focus that was inside goes back to the trigger when it closes.
 *
 * It sits in the top layer, so inside a modal window or dialog its trigger must be in the same one.
 *
 * @tagname punk-popover
 *
 * @slot - The content, or the menu items.
 *
 * @csspart surface - The floating surface.
 *
 * @cssprop [--punk-popover-max-width=320px] - Widest the surface grows before wrapping.
 * @cssprop [--punk-popover-offset=8px] - Gap between the trigger and the surface.
 *
 * @fires punk-open - It opened.
 * @fires punk-close - It closed. `detail` is `{ reason }`: `escape`, `outside`, `tab`, `action`, or `method`.
 */
export class PunkPopover extends PunkElement {
  static override styles = popoverStyles;

  /** Id of the trigger in this element's root. Without it, the previous sibling is the trigger. */
  @property({ attribute: 'for' }) for = '';

  /** Which side of the trigger. `start` and `end` follow the writing direction. Unknown values use `bottom`. */
  @property({ reflect: true }) placement: PopoverPlacement = 'bottom';

  /** `menu` makes the host a menu of `menuitem` elements. Unknown values use `content`. */
  @property({ reflect: true }) mode: PopoverMode = 'content';

  /** Whether it is showing. */
  @property({ type: Boolean, reflect: true }) open = false;

  #trigger: HTMLElement | null = null;
  #state: AnchorState | undefined;
  #stopOpenWork: (() => void) | undefined;
  #reason: PunkCloseReason = 'method';
  #keyboard = false;
  #silent = false;
  #ownedRole = false;
  #warnedTrigger = false;
  #warnedItems = false;

  constructor() {
    super();
    this.addEventListener('keydown', this.#handleKeyDown);
    this.addEventListener('click', this.#handleContentClick);
  }

  get #menu(): boolean {
    return this.mode === 'menu';
  }

  get #surface(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.surface');
  }

  /** Opens it. */
  show(): void {
    this.open = true;
  }

  /** Closes it. */
  hide(): void {
    this.#reason = 'method';
    this.open = false;
  }

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
    this.#teardownOpen();
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
      (changed.has('mode') && changed.get('mode') !== undefined) ||
      (changed.has('for') && changed.get('for') !== undefined);
    if (rewired) this.#attach(true);
    if (changed.has('open')) this.#syncOpen(changed.get('open') === true);
    else if (this.open && (changed.has('placement') || changed.has('mode'))) this.#reposition();
  }

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
    next.addEventListener('click', this.#handleTriggerClick);
    next.addEventListener('keydown', this.#handleTriggerKeyDown);
    // A custom trigger that is not defined yet cannot take ARIA on its inner button.
    if (next.localName.includes('-') && !customElements.get(next.localName)) {
      void customElements.whenDefined(next.localName).then(() => {
        if (this.#trigger === next) this.#attach(true);
      });
      return;
    }
    this.#state = wireAnchorState(next, this.#menu ? 'menu' : null);
    this.#state.setExpanded(this.open);
  }

  #detach(): void {
    const trigger = this.#trigger;
    if (!trigger) return;
    trigger.removeEventListener('click', this.#handleTriggerClick);
    trigger.removeEventListener('keydown', this.#handleTriggerKeyDown);
    this.#state?.unwire();
    this.#state = undefined;
    this.#trigger = null;
  }

  // Opening

  #syncOpen(wasOpen: boolean): void {
    if (this.open) {
      this.#showSurface();
      this.#startOpenWork();
      this.#state?.setExpanded(true);
      this.#setRole(this.#menu);
      this.#focusIn();
      this.emit('punk-open');
      return;
    }
    if (!wasOpen) return;
    const silent = this.#silent;
    const reason = this.#reason;
    this.#silent = false;
    this.#reason = 'method';
    const active = activeIn(this.getRootNode());
    const hadFocus = Boolean(active && this.contains(active));
    this.#teardownOpen();
    this.#hideSurface();
    this.#state?.setExpanded(false);
    this.#setRole(false);
    if (silent) return;
    if (hadFocus) this.#trigger?.focus({ preventScroll: true });
    this.emit<PunkCloseDetail>('punk-close', { reason });
  }

  #close(reason: PunkCloseReason): void {
    this.#reason = reason;
    this.open = false;
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

  #hideSurface(): void {
    const surface = this.#surface;
    if (surface && typeof surface.hidePopover === 'function' && surface.matches(':popover-open')) {
      surface.hidePopover();
    }
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
    const style = getComputedStyle(this);
    const offset = parseFloat(style.getPropertyValue('--punk-popover-offset')) || DEFAULT_OFFSET;
    const size = surface.getBoundingClientRect();
    const result = computePosition({
      anchor: trigger.getBoundingClientRect(),
      surface: { width: size.width, height: size.height },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      placement: placements.includes(this.placement) ? this.placement : 'bottom',
      offset,
      margin: VIEWPORT_MARGIN,
      rtl: style.direction === 'rtl',
    });
    surface.style.left = `${result.left}px`;
    surface.style.top = `${result.top}px`;
    surface.dataset['side'] = result.side;
  }

  /** Work that exists only while open: nothing here runs, or stays registered, once closed. */
  #startOpenWork(): void {
    this.#teardownOpen();
    const trigger = this.#trigger;
    const surface = this.#surface;
    if (!trigger || !surface) return;

    const entry = { dismissible: true, close: () => this.#close('escape') };
    let frame = 0;
    const schedule = (): void => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        this.#reposition();
      });
    };
    // A press outside closes it. The trigger is left to its own click, which toggles.
    const onPointerDown = (event: PointerEvent): void => {
      const path = event.composedPath();
      if (path.includes(this) || path.includes(trigger)) return;
      this.#close('outside');
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(trigger);
    observer.observe(surface);
    overlayStack.push(entry);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);

    this.#stopOpenWork = () => {
      overlayStack.remove(entry);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }

  #teardownOpen(): void {
    this.#stopOpenWork?.();
    this.#stopOpenWork = undefined;
  }

  // Focus

  #items(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(MENU_ITEM)];
  }

  #isItemDisabled(item: HTMLElement): boolean {
    return item.hasAttribute('disabled') || item.getAttribute('aria-disabled') === 'true';
  }

  #focusIn(): void {
    const keyboard = this.#keyboard;
    this.#keyboard = false;
    if (this.#menu) {
      const first = this.#items().find((item) => !this.#isItemDisabled(item));
      if (first) first.focus();
      else if (!this.#warnedItems) {
        this.#warnedItems = true;
        devWarn(this, 'A menu has no `menuitem` to focus.');
      }
      return;
    }
    if (!keyboard) return;
    const autofocus = this.querySelector<HTMLElement>('[autofocus]');
    const target = autofocus ?? [...this.querySelectorAll('*')].find(isTabbable) ?? this.#surface;
    target?.focus();
  }

  // Events

  readonly #handleTriggerClick = (event: MouseEvent): void => {
    // A click from Enter or Space on a button has no pointer, which is how a keyboard open is told.
    if (!this.open) this.#keyboard = event.detail === 0;
    this.toggle();
  };

  readonly #handleTriggerKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'ArrowDown' ||
      !this.#menu ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }
    event.preventDefault();
    if (this.open)
      this.#items()
        .find((item) => !this.#isItemDisabled(item))
        ?.focus();
    else {
      this.#keyboard = true;
      this.show();
    }
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
      return;
    if (event.key === 'Tab') return this.#handleTab(event);
    if (!this.#menu || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = this.#items();
    const active = activeIn(this.getRootNode());
    const from = items.findIndex((item) => item === active || item.contains(active));
    if (from < 0) return;
    event.preventDefault();
    const to = nextRovingIndex(
      event.key,
      from,
      items.map((item) => this.#isItemDisabled(item)),
      { orientation: 'vertical', rtl: false },
    );
    if (to !== from) items[to]?.focus();
  };

  /** Tab out of either end closes it and carries on from the trigger. */
  #handleTab(event: KeyboardEvent): void {
    if (!this.#menu) {
      const items = [...this.querySelectorAll('*')].filter(isTabbable);
      const active = activeIn(this.getRootNode());
      const index = items.findIndex((item) => item === active || item.contains(active));
      const leaving = event.shiftKey
        ? index <= 0
        : items.length === 0 || index === items.length - 1;
      if (!leaving) return;
    }
    // Firefox runs the key's own action before the next update, so focus moves and the surface hides now.
    this.#trigger?.focus({ preventScroll: true });
    this.#close('tab');
    this.performUpdate();
  }

  readonly #handleContentClick = (event: MouseEvent): void => {
    if (!this.open || !this.hasAttribute('data-punk-close-on-activate')) return;
    const item = event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(MENU_ITEM));
    if (item && !this.#isItemDisabled(item)) this.#close('action');
  };

  protected override render() {
    return html`
      <div
        part="surface"
        class=${classMap({ surface: true, open: this.open })}
        popover="manual"
        tabindex=${ifDefined(this.#menu ? undefined : '-1')}
      >
        <slot></slot>
      </div>
    `;
  }
}
