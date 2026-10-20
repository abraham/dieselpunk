import { html } from 'lit';
import { serverValues } from '../../internal/server-values.ts';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { optionalNumber } from '../../internal/converters.ts';
import { nextIndex, stepIndex } from '../../internal/grid-navigation.ts';
import { Ledger, childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import type { PunkSelectableBase } from '../../internal/selectable-base.ts';
import { SelectionModel } from '../../internal/selection-model.ts';
import type { SelectionMode } from '../../internal/selection-model.ts';
import { warnNew } from '../../utilities/warn.ts';
import { slotGridStyles } from './slot-grid.styles.ts';

export type GridSelection = SelectionMode;

export interface PunkSelectionChangeDetail {
  values: string[];
  items: HTMLElement[];
}

declare global {
  interface HTMLElementEventMap {
    'punk-selection-change': CustomEvent<PunkSelectionChangeDetail>;
  }
}

type Item = PunkSelectableBase;

// An item with no usable value gets a key no value can equal, so it can still be selected.
const ANONYMOUS = '\u0000';
const modes: readonly string[] = ['single', 'multiple'];

const isItem = (element: Element): element is Item => owner in element;
const isPending = (element: Element): boolean =>
  element.localName.includes('-') && !customElements.get(element.localName);

function setAttribute(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/**
 * A responsive grid of `punk-slot` or `punk-item-stack` items with one tab stop, arrow-key
 * navigation, and optional selection. Give it an `aria-label`. It owns its items' role, tab stop,
 * and selected state: selection is separate from focus, so moving focus never selects.
 *
 * A click or Enter activates an item (`punk-activate`, which bubbles from the item). A click or
 * Space also selects it when `selection` is `single` or `multiple`, and then `punk-selection-change`
 * reports the result. Arrow keys follow reading order and swap in right-to-left languages; Up and
 * Down keep the column; Home and End go to the ends of the row, and with Ctrl to the ends of the
 * grid. Shift with an arrow extends the selection, and Ctrl+A selects everything.
 *
 * @tagname punk-slot-grid
 *
 * @slot - The items. Anything else is ignored and warned about in development.
 *
 * @csspart grid - The grid container.
 *
 * @cssprop [--punk-slot-size=40px] - Width of each column, and of a medium item.
 * @cssprop [--punk-slot-gap=var(--punk-space-1)] - Space between items.
 *
 * @fires punk-selection-change - The user changed the selection. `detail` is `{ values, items }`.
 */
export class PunkSlotGrid extends PunkElement implements Owner<Item> {
  static override styles = slotGridStyles;

  static override properties: PropertyDeclarations = {
    columns: { converter: optionalNumber, reflect: true },
    selection: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** The most columns to use. A narrower container uses fewer, and slots never shrink. */
  columns: number | undefined;

  /** `none` only activates items. Unknown values behave as `none`. */
  selection: GridSelection = 'none';

  /** Disables every item, and removes the tab stop. Items that were already disabled stay so. */
  disabled = false;

  /**
   * The `value` of each selected item, in item order. Assign it to select by value, before or
   * after the items exist, until the user changes the selection. Items without a `value` cannot
   * be listed. Reading returns a copy, and assigning never changes the array you pass.
   */
  get values(): string[] {
    if (!this.#built && this.#requested) return [...this.#requested];
    return this.#model.selected.filter((key) => !key.startsWith(ANONYMOUS));
  }
  set values(values: readonly string[]) {
    this.#requested = [...values];
    if (this.#built) this.#sync();
  }

  #model = new SelectionModel('none');
  #items: Item[] = [];
  #keys = new Map<Item, string>();
  #anonymous = new WeakMap<Item, string>();
  #anonymousCount = 0;
  readonly #ledger = new Ledger();
  #waiting = new Set<string>();
  #tabStop: Item | undefined;
  #lastFocused: Item | undefined;
  #requested: string[] | undefined;
  #built = false;
  #scheduled = false;
  #reported = new Set<string>();

  constructor() {
    super();
    // Capturing lets the grid claim a key or click before the item sees it.
    this.addEventListener('keydown', this.#handleKeydown, true);
    this.addEventListener('click', this.#handleClick, true);
    this.addEventListener('focusin', this.#handleFocusin);
  }

  get #mode(): SelectionMode {
    return modes.includes(this.selection) ? this.selection : 'none';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#scheduleSync();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#syncHost();
    if (changed.has('selection') || changed.has('disabled')) this.#sync();
  }

  protected override updated(): void {
    this.#warnProblems();
  }

  /** @internal */
  [childChanged](item: Item, changed: ReadonlyMap<PropertyKey, unknown>): void {
    if (!changed.has('disabled') && !changed.has('value')) {
      // Our own writes and ones that agree with the selection need no work.
      const key = this.#keys.get(item);
      if (key !== undefined && item.selected === this.#model.has(key)) return;
    }
    this.#scheduleSync();
  }

  /** @internal */
  [release](item: Item): void {
    item[owner] = null;
    this.#keys.delete(item);
    this.#ledger.restore(item);
    if (this.#tabStop === item) this.#tabStop = undefined;
    if (this.#lastFocused === item) this.#lastFocused = undefined;
  }

  #scheduleSync(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      this.#sync();
    });
  }

  #syncHost(): void {
    const mode = this.#mode;
    setAttribute(this, 'role', mode === 'none' ? 'group' : 'listbox');
    setAttribute(this, 'aria-multiselectable', mode === 'multiple' ? 'true' : null);
    setAttribute(this, 'aria-disabled', this.disabled ? 'true' : null);
  }

  /** Adopts the items, rebuilds the selection model from them, and writes the result back. */
  #sync(): void {
    // The server has no children (specs/ssr.md §3).
    if (serverValues()) return;
    this.#built = true;
    const mode = this.#mode;
    const found: Item[] = [];
    for (const child of this.children) {
      if (child.hasAttribute('slot')) continue;
      if (isItem(child)) found.push(child);
      else if (isPending(child)) this.#waitFor(child.localName);
    }

    const current = new Set(found);
    for (const item of this.#items) if (!current.has(item)) this[release](item);
    for (const item of found) {
      if (item[owner] !== this) item[owner] = this;
      if (this.disabled) this.#ledger.disable(item);
      else this.#ledger.enable(item);
    }

    const taken = new Set<string>();
    const keys = new Map<Item, string>();
    for (const item of found) {
      const value = item.value;
      if (value !== '' && !taken.has(value)) {
        taken.add(value);
        keys.set(item, value);
        continue;
      }
      let key = this.#anonymous.get(item);
      if (key === undefined) {
        key = `${ANONYMOUS}${this.#anonymousCount++}`;
        this.#anonymous.set(item, key);
      }
      keys.set(item, key);
    }

    this.#items = found;
    this.#keys = keys;
    if (this.#model.mode !== mode) this.#model.setMode(mode);
    this.#model.setItems(
      found.map((item) => keys.get(item) as string),
      found.filter((item) => item.disabled).map((item) => keys.get(item) as string),
    );
    if (this.#requested) this.#model.set(this.#requested);

    for (const item of found) {
      const selected = this.#model.has(keys.get(item) as string);
      if (item.selected !== selected) item.selected = selected;
      setAttribute(item, 'role', mode === 'none' ? 'button' : 'option');
      setAttribute(item, 'aria-selected', mode === 'none' ? null : String(selected));
    }
    this.#placeTabStop();
    this.#warnProblems();
  }

  #waitFor(tag: string): void {
    if (this.#waiting.has(tag)) return;
    this.#waiting.add(tag);
    void customElements.whenDefined(tag).then(() => {
      this.#waiting.delete(tag);
      this.#scheduleSync();
    });
  }

  /** The one item Tab reaches: where focus last was, else the first selected, else the first. */
  #placeTabStop(): void {
    const enabled = (item: Item) => !item.disabled;
    const last = this.#lastFocused;
    const stop =
      last && this.#keys.has(last) && enabled(last)
        ? last
        : (this.#items.find(
            (item) => enabled(item) && this.#model.has(this.#keys.get(item) ?? ''),
          ) ?? this.#items.find(enabled));
    this.#tabStop = stop;
    for (const item of this.#items) {
      setAttribute(item, 'tabindex', item.disabled ? null : item === stop ? '0' : '-1');
    }
  }

  #warnProblems(): void {
    this.#reported = warnNew(this, this.#reported, () => {
      const strays = [...this.children].filter(
        (child) => !child.hasAttribute('slot') && !isItem(child) && !isPending(child),
      );
      const values = this.#items.map((item) => item.value).filter((value) => value !== '');
      const repeated = values.filter((value, index) => values.indexOf(value) !== index);
      return [
        !this.hasAttribute('aria-label') &&
          !this.hasAttribute('aria-labelledby') &&
          'It has no accessible name. Set `aria-label`.',
        ...strays.map(
          (child) => `It contains <${child.localName}>, which is not an item, so it is ignored.`,
        ),
        ...repeated.map(
          (value) =>
            `Two items have the value "${value}", and only the first can be selected by it.`,
        ),
        this.#mode !== 'none' &&
          this.#items.some((item) => item.value === '') &&
          'An item has no `value`, so it is left out of `values`.',
      ];
    });
  }

  /** The item an event came from, found by walking up to the grid's direct child. */
  #itemFor(target: EventTarget | null): Item | undefined {
    let node = target as Node | null;
    while (node && node.parentNode !== this) node = node.parentNode;
    return node && this.#keys.has(node as Item) ? (node as Item) : undefined;
  }

  /** Runs a selection change, then updates the items and reports it if anything changed. */
  #interact(change: (model: SelectionModel) => void): void {
    const before = this.#model.selected;
    change(this.#model);
    // The user's choice replaces any `values` that were waiting for their items.
    this.#requested = undefined;
    const after = this.#model.selected;
    if (after.length === before.length && after.every((key) => before.includes(key))) return;
    for (const item of this.#items) {
      const selected = this.#model.has(this.#keys.get(item) as string);
      if (item.selected !== selected) item.selected = selected;
      setAttribute(item, 'aria-selected', String(selected));
    }
    this.emit<PunkSelectionChangeDetail>('punk-selection-change', {
      values: this.values,
      items: this.#items.filter((item) => this.#model.has(this.#keys.get(item) as string)),
    });
    this.#placeTabStop();
  }

  readonly #handleFocusin = (event: FocusEvent): void => {
    const item = this.#itemFor(event.target);
    if (!item || item.disabled) return;
    this.#lastFocused = item;
    if (this.#tabStop === item) return;
    if (this.#tabStop && !this.#tabStop.disabled) setAttribute(this.#tabStop, 'tabindex', '-1');
    setAttribute(item, 'tabindex', '0');
    this.#tabStop = item;
  };

  readonly #handleClick = (event: MouseEvent): void => {
    const mode = this.#mode;
    if (this.disabled || mode === 'none') return;
    const item = this.#itemFor(event.target);
    if (!item || item.disabled) return;
    const key = this.#keys.get(item) as string;
    this.#interact((model) => {
      if (mode === 'multiple') {
        if (event.shiftKey) model.extendTo(key);
        else model.toggle(key);
      } else {
        model.select(key);
      }
    });
  };

  readonly #handleKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || this.disabled) return;
    const item = this.#itemFor(event.target);
    if (!item || event.target !== item) return;
    const mode = this.#mode;
    const { key, ctrlKey, altKey, metaKey, shiftKey } = event;

    if (key === ' ' && mode !== 'none' && !ctrlKey && !altKey && !metaKey) {
      // Claimed, so the item does not also activate on Space.
      event.preventDefault();
      if (event.repeat) return;
      const own = this.#keys.get(item) as string;
      this.#interact((model) => (mode === 'single' ? model.select(own) : model.toggle(own)));
      return;
    }
    if ((key === 'a' || key === 'A') && mode === 'multiple' && (ctrlKey || metaKey) && !altKey) {
      event.preventDefault();
      this.#interact((model) => model.selectAll());
      return;
    }

    const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
    const arrow = horizontal || key === 'ArrowUp' || key === 'ArrowDown';
    const ends = key === 'Home' || key === 'End';
    if (!(arrow || ends) || altKey || metaKey || (ctrlKey && !ends)) return;

    event.preventDefault();
    const from = this.#items.indexOf(item);
    const rtl = this.matches(':dir(rtl)');
    let to: number;
    if (horizontal) {
      // Reading order needs no layout, so a horizontal key reads none.
      const forward = (key === 'ArrowRight') === !rtl;
      to = stepIndex(
        from,
        forward ? 1 : -1,
        this.#items.map((other) => other.disabled),
      );
    } else {
      to = nextIndex(
        key,
        from,
        this.#items.map((other) => {
          const box = other.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
            disabled: other.disabled,
          };
        }),
        { direction: rtl ? 'rtl' : 'ltr', ctrl: ctrlKey },
      );
    }
    if (to === from) return;
    const target = this.#items[to] as Item;
    if (mode === 'multiple' && shiftKey && arrow) {
      const start = this.#keys.get(item) as string;
      const end = this.#keys.get(target) as string;
      this.#interact((model) => {
        if (model.anchor === undefined) model.select(start);
        model.extendTo(end);
      });
    }
    target.focus();
  };

  protected override render() {
    const columns =
      this.columns !== undefined && Number.isFinite(this.columns) && this.columns >= 1
        ? Math.floor(this.columns)
        : undefined;
    return html`<div
      part="grid"
      class="grid"
      style=${ifDefined(columns === undefined ? undefined : `--_columns: ${columns}`)}
    >
      <slot @slotchange=${() => this.#scheduleSync()}></slot>
    </div>`;
  }
}
