import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import { SelectionModel } from '../../internal/selection-model.ts';
import type { SelectionMode } from '../../internal/selection-model.ts';
import { warnNew } from '../../utilities/warn.ts';
import type { PunkSelectionChangeDetail } from '../slot-grid/slot-grid.ts';
import { PunkListItem } from './list-item.ts';
import { listStyles } from './list.styles.ts';

export type ListSelection = SelectionMode;

const modes: readonly string[] = ['single', 'multiple'];

function write(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/**
 * A one-column list of `punk-list-item` rows: files, queues, search results, settings. Give it an
 * `aria-label`. With `selection="none"` (the default) it is a `list` of `listitem` rows that take
 * no focus, so put buttons or links inside them for actions. With `single` or `multiple` it is a
 * `listbox` of `option` rows with one tab stop: Up and Down move focus without wrapping, Home and
 * End go to the ends, Space and a click select (or toggle in `multiple`), Shift with an arrow or a
 * click extends the selection, and Ctrl+A selects everything. Moving focus never selects. Enter
 * and a click activate a row (`punk-activate`).
 *
 * It owns its items' `role`, `tabindex`, `aria-selected`, and `selected`, and gives them back when
 * an item leaves. Items are identified by `value`.
 *
 * @tagname punk-list
 *
 * @slot - The `punk-list-item` rows. Anything else is ignored and warned about in development.
 *
 * @csspart list - The column of rows.
 *
 * @fires punk-selection-change - The user changed the selection. `detail` is `{ values, items }`.
 */
export class PunkList extends PunkElement implements Owner<PunkListItem> {
  static override styles = listStyles;

  static override properties: PropertyDeclarations = {
    selection: { reflect: true },
  };

  /** `none` is a plain list. Unknown values behave as `none`. */
  selection: ListSelection = 'none';

  /**
   * The `value` of each selected item, in order. Assign it to select by value, before or after the
   * items exist. Reading returns a copy, and assigning never changes the array you pass.
   */
  get values(): string[] {
    return this.#built ? this.#model.selected : [...(this.#requested ?? [])];
  }
  set values(values: readonly string[]) {
    this.#requested = [...values];
    if (this.#built) this.#sync();
  }

  #model = new SelectionModel('none');
  #items: PunkListItem[] = [];
  #requested: string[] | undefined;
  #last: PunkListItem | undefined;
  #built = false;
  #scheduled = false;
  #reported = new Set<string>();

  constructor() {
    super();
    // Capturing lets the list claim Space and the click before the item activates.
    this.addEventListener('keydown', this.#onKeyDown, true);
    this.addEventListener('click', this.#onClick, true);
    this.addEventListener('focusin', this.#onFocusIn);
  }

  get #mode(): SelectionMode {
    return modes.includes(this.selection) ? this.selection : 'none';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#schedule();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const item of this.#items) this[release](item);
    this.#items = [];
    this.#built = false;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    const mode = this.#mode;
    write(this, 'role', mode === 'none' ? 'list' : 'listbox');
    write(this, 'aria-multiselectable', mode === 'multiple' ? 'true' : null);
    if (changed.has('selection')) this.#schedule();
  }

  /** @internal */
  [childChanged](item: PunkListItem, changed: ReadonlyMap<PropertyKey, unknown>): void {
    if (!changed.has('disabled') && !changed.has('value')) {
      if (item.selected === this.#model.has(item.value)) return;
    }
    this.#schedule();
  }

  /** @internal */
  [release](item: PunkListItem): void {
    item[owner] = null;
    if (this.#last === item) this.#last = undefined;
  }

  #schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) this.#sync();
    });
  }

  #sync(): void {
    const children = [...this.children].filter((child) => !child.slot);
    const found = children.filter((child): child is PunkListItem => child instanceof PunkListItem);
    this.#reported = warnNew(this, this.#reported, () => {
      const values = found.map((item) => item.value);
      return [
        found.length !== children.length &&
          'It contains elements that are not `punk-list-item`, so they are ignored.',
        !this.hasAttribute('aria-label') &&
          !this.hasAttribute('aria-labelledby') &&
          'It has no accessible name. Set `aria-label`.',
        this.#mode !== 'none' &&
          (values.includes('') || new Set(values).size < values.length) &&
          'Its items need distinct, non-empty `value`s to be selected.',
      ];
    });

    for (const item of this.#items) if (!found.includes(item)) this[release](item);
    for (const item of found) if (item[owner] !== this) item[owner] = this;
    this.#items = found;

    const mode = this.#mode;
    if (this.#model.mode !== mode) this.#model.setMode(mode);
    this.#model.setItems(
      found.map((item) => item.value),
      found.filter((item) => item.disabled).map((item) => item.value),
    );
    if (this.#requested) this.#model.set(this.#requested);
    else if (!this.#built)
      this.#model.set(found.filter((item) => item.selected).map((item) => item.value));
    this.#built = true;
    this.#render();
  }

  #render(): void {
    const mode = this.#mode;
    const enabled = this.#items.filter((item) => !item.disabled);
    const stop =
      (this.#last && enabled.includes(this.#last) ? this.#last : undefined) ??
      enabled.find((item) => this.#model.has(item.value)) ??
      enabled[0];
    for (const item of this.#items) {
      const selected = mode !== 'none' && this.#model.has(item.value);
      if (item.selected !== selected) item.selected = selected;
      write(item, 'role', mode === 'none' ? 'listitem' : 'option');
      write(item, 'aria-selected', mode === 'none' ? null : String(selected));
      write(item, 'tabindex', mode === 'none' || item.disabled ? null : item === stop ? '0' : '-1');
    }
  }

  #itemFor(event: Event): PunkListItem | undefined {
    return event
      .composedPath()
      .find((node): node is PunkListItem => this.#items.includes(node as PunkListItem));
  }

  #interact(change: (model: SelectionModel) => void): void {
    const before = this.#model.selected;
    change(this.#model);
    this.#requested = undefined;
    const after = this.#model.selected;
    this.#render();
    if (after.length === before.length && after.every((value) => before.includes(value))) return;
    this.emit<PunkSelectionChangeDetail>('punk-selection-change', {
      values: [...after],
      items: this.#items.filter((item) => after.includes(item.value)),
    });
  }

  readonly #onFocusIn = (event: FocusEvent): void => {
    const item = this.#itemFor(event);
    if (!item || item.disabled || this.#mode === 'none') return;
    this.#last = item;
    this.#render();
  };

  readonly #onClick = (event: MouseEvent): void => {
    const mode = this.#mode;
    const item = this.#itemFor(event);
    if (mode === 'none' || !item || item.disabled) return;
    this.#last = item;
    this.#interact((model) => {
      if (mode === 'single') model.select(item.value);
      else if (event.shiftKey) model.extendTo(item.value);
      else model.toggle(item.value);
    });
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const mode = this.#mode;
    const item = this.#itemFor(event);
    if (mode === 'none' || !item || event.target !== item || event.defaultPrevented) return;
    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    if (altKey) return;
    if (key === ' ' && !ctrlKey && !metaKey) {
      // Claimed, so the item does not also activate on Space.
      event.preventDefault();
      if (!event.repeat) {
        this.#interact((model) =>
          mode === 'single' ? model.select(item.value) : model.toggle(item.value),
        );
      }
      return;
    }
    if ((key === 'a' || key === 'A') && (ctrlKey || metaKey) && mode === 'multiple') {
      event.preventDefault();
      this.#interact((model) => model.selectAll());
      return;
    }
    if (ctrlKey || metaKey) return;
    const from = this.#items.indexOf(item);
    const to = nextRovingIndex(
      key,
      from,
      this.#items.map((other) => other.disabled),
      { orientation: 'vertical', rtl: false },
    );
    const target = this.#items[to];
    if (!target || to === from) return;
    event.preventDefault();
    if (shiftKey && mode === 'multiple' && (key === 'ArrowUp' || key === 'ArrowDown')) {
      this.#interact((model) => {
        if (model.anchor === undefined) model.select(item.value);
        model.extendTo(target.value);
      });
    }
    target.focus();
  };

  protected override render() {
    return html`<div part="list" class="list">
      <slot @slotchange=${() => this.#schedule()}></slot>
    </div>`;
  }
}
