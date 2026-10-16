import { nextRovingIndex } from './roving-keys.ts';
import type { RovingOrientation } from './roving-keys.ts';

export type { RovingOrientation };

/** What an item in a roving group lets the group do. `PunkButtonBase` implements it. */
export interface RovingItem {
  readonly isDisabled: boolean;
  focusItem(): void;
  /** `true` is the group's tab stop, `false` is skipped by Tab, `null` hands control back. */
  setTabStop(on: boolean | null): void;
}

function isRovingItem(element: HTMLElement): element is HTMLElement & RovingItem {
  return typeof (element as Partial<RovingItem>).setTabStop === 'function';
}

const originalTabindex = new WeakMap<HTMLElement, string | null>();

// Native buttons and links have no protocol, so the group writes `tabindex` and gives it back.
function adapt(element: HTMLElement): RovingItem {
  if (isRovingItem(element)) return element;
  return {
    get isDisabled() {
      return (
        Boolean(element.hidden) ||
        element.hasAttribute('data-punk-overflow') ||
        (element as Partial<HTMLButtonElement>).disabled === true ||
        element.getAttribute('aria-disabled') === 'true'
      );
    },
    focusItem: () => element.focus(),
    setTabStop(on) {
      if (!originalTabindex.has(element))
        originalTabindex.set(element, element.getAttribute('tabindex'));
      if (on === null) {
        const original = originalTabindex.get(element) ?? null;
        if (original === null) element.removeAttribute('tabindex');
        else element.setAttribute('tabindex', original);
        originalTabindex.delete(element);
      } else {
        element.setAttribute('tabindex', on ? '0' : '-1');
      }
    },
  };
}

export interface RovingOptions {
  /** The element the keys are heard on; it contains every item. */
  host: HTMLElement;
  /** The current items, in order. Separators and anything not an item are left out. */
  items: () => HTMLElement[];
  orientation?: () => RovingOrientation;
}

/**
 * One tab stop among a group of items, moved with the arrow keys, `Home`, and `End`. It reads no
 * layout (`:dir(rtl)` is a selector match) and creates no observers. Call `refresh()` when the
 * items, or whether they are disabled, change.
 */
export class RovingController {
  readonly #options: RovingOptions;
  #current: HTMLElement | null = null;
  #connected = false;

  constructor(options: RovingOptions) {
    this.#options = options;
  }

  connect(): void {
    if (this.#connected) return;
    this.#connected = true;
    this.#options.host.addEventListener('keydown', this.#onKeyDown);
    this.#options.host.addEventListener('focusin', this.#onFocusIn);
    this.refresh();
  }

  /** Stops listening and gives every item its own tab stop back. */
  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false;
    this.#options.host.removeEventListener('keydown', this.#onKeyDown);
    this.#options.host.removeEventListener('focusin', this.#onFocusIn);
    for (const item of this.#options.items()) adapt(item).setTabStop(null);
    this.#current = null;
  }

  /** The item that holds the tab stop, if any. */
  get current(): HTMLElement | null {
    return this.#current;
  }

  /** Makes `item` the tab stop, and focuses it. */
  focus(item: HTMLElement): void {
    this.#current = item;
    this.refresh();
    adapt(item).focusItem();
  }

  /** Recomputes the single tab stop: the remembered item if it is still enabled, else the first. */
  refresh(): void {
    if (!this.#connected) return;
    const items = this.#options.items();
    const adapters = items.map(adapt);
    let index = this.#current ? items.indexOf(this.#current) : -1;
    if (index < 0 || adapters[index]?.isDisabled)
      index = adapters.findIndex((item) => !item.isDisabled);
    this.#current = index >= 0 ? (items[index] ?? null) : null;
    adapters.forEach((item, position) => item.setTabStop(position === index));
  }

  #itemAt(event: Event): number {
    const items = this.#options.items();
    const path = event.composedPath();
    return items.findIndex((item) => path.includes(item));
  }

  readonly #onFocusIn = (event: FocusEvent): void => {
    const index = this.#itemAt(event);
    const item = this.#options.items()[index];
    if (item && !adapt(item).isDisabled && item !== this.#current) {
      this.#current = item;
      this.refresh();
    }
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const items = this.#options.items();
    const from = this.#itemAt(event);
    if (from < 0) return;
    const next = nextRovingIndex(
      event.key,
      from,
      items.map((item) => adapt(item).isDisabled),
      {
        orientation: this.#options.orientation?.() ?? 'horizontal',
        rtl: this.#options.host.matches(':dir(rtl)'),
      },
    );
    const target = items[next];
    if (!target || next === from) return;
    event.preventDefault();
    this.focus(target);
  };
}
