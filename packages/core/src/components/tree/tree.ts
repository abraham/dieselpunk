import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import { SelectionModel } from '../../internal/selection-model.ts';
import type { SelectionMode } from '../../internal/selection-model.ts';
import { warnNew } from '../../utilities/warn.ts';
import type { PunkToggleDetail } from '../accordion/accordion-item.ts';
import type { PunkSelectionChangeDetail } from '../slot-grid/slot-grid.ts';
import { PunkTreeItem } from './tree-item.ts';
import { treeStyles } from './tree.styles.ts';

export type TreeSelection = SelectionMode;

const modes: readonly string[] = ['single', 'multiple'];

function write(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/**
 * Hierarchical navigation and selection, such as a file tree or a tech tree: the APG tree view.
 * The host is a `tree` named by its `aria-label`, and its `punk-tree-item` children, with theirs
 * nested inside them, are its nodes. The tree is one tab stop.
 *
 * Up and Down move among the items that show, and Home and End go to the first and last. Right
 * expands a closed parent and enters an open one, and Left collapses an open parent or goes to
 * the item's parent (swapped in right-to-left text). `*` expands every sibling, a letter moves to
 * the next item that starts with it, and Enter activates. With `selection`, Space and a click
 * select an item (`single`) or toggle it (`multiple`), and Ctrl+A or Cmd+A selects them all.
 *
 * @tagname punk-tree
 *
 * @slot - The top-level `punk-tree-item` elements.
 *
 * @csspart tree - The wrapper around the items.
 *
 * @fires punk-selection-change - A user changed the selection. `detail` is `{ values, items }`. Not sent for `values` set from code.
 */
export class PunkTree extends PunkElement implements Owner<PunkTreeItem> {
  static override styles = treeStyles;

  static override properties: PropertyDeclarations = {
    selection: { reflect: true },
  };

  /** `none` is for navigation only. Unknown values behave as `none`. */
  selection: TreeSelection = 'none';

  /**
   * The `value` of each selected item, in document order. Assign it to select by value, before or
   * after the items exist. Reading returns a copy, and assigning never changes the array you pass.
   */
  get values(): string[] {
    return this.#built ? this.#model.selected : [...(this.#requested ?? [])];
  }
  set values(values: readonly string[]) {
    this.#requested = [...values];
    if (this.#built) this.#sync();
  }

  #model = new SelectionModel('none');
  #items: PunkTreeItem[] = [];
  #requested: string[] | undefined;
  #last: PunkTreeItem | undefined;
  #built = false;
  #scheduled = false;
  #reported = new Set<string>();

  constructor() {
    super();
    // Capturing lets the tree claim Space and the click before anything inside the item.
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
    write(this, 'role', 'tree');
    write(this, 'aria-multiselectable', this.#mode === 'multiple' ? 'true' : null);
    if (changed.has('selection')) this.#schedule();
  }

  /** @internal */
  [childChanged](item: PunkTreeItem, changed: ReadonlyMap<PropertyKey, unknown>): void {
    if (!['disabled', 'value', 'expanded', 'children'].some((key) => changed.has(key))) {
      if (item.selected === this.#model.has(item.value)) return;
    }
    this.#schedule();
  }

  /** @internal */
  [release](item: PunkTreeItem): void {
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

  /** Every item, nested ones included, in document order. */
  #collect(): PunkTreeItem[] {
    return [...this.querySelectorAll('punk-tree-item')].filter(
      (item): item is PunkTreeItem => item instanceof PunkTreeItem,
    );
  }

  /** The items that show: every top-level item, and the children of expanded ones that show. */
  #visible(): PunkTreeItem[] {
    return this.#items.filter((item) => {
      for (let node = item.parentElement; node !== this; node = node?.parentElement ?? null) {
        if (!(node instanceof PunkTreeItem) || !node.expanded) return false;
      }
      return true;
    });
  }

  #sync(): void {
    const found = this.#collect();
    const values = found.map((item) => item.value);
    this.#reported = warnNew(this, this.#reported, () => [
      [...this.children].some((child) => !(child instanceof PunkTreeItem)) &&
        'It contains elements that are not `punk-tree-item`, so they are ignored.',
      !this.hasAttribute('aria-label') &&
        !this.hasAttribute('aria-labelledby') &&
        'It has no accessible name. Set `aria-label`.',
      this.#mode !== 'none' &&
        (values.includes('') || new Set(values).size < values.length) &&
        'Its items need distinct, non-empty `value`s to be selected.',
    ]);

    for (const item of this.#items) if (!found.includes(item)) this[release](item);
    for (const item of found) if (item[owner] !== this) item[owner] = this;
    this.#items = found;

    const mode = this.#mode;
    if (this.#model.mode !== mode) this.#model.setMode(mode);
    this.#model.setItems(
      values,
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
    const shown = this.#visible().filter((item) => !item.disabled);
    const stop =
      (this.#last && shown.includes(this.#last) ? this.#last : undefined) ??
      shown.find((item) => this.#model.has(item.value)) ??
      shown[0];
    for (const item of this.#items) {
      const selected = mode !== 'none' && this.#model.has(item.value);
      if (item.selected !== selected) item.selected = selected;
      write(item, 'aria-selected', mode === 'none' ? null : String(selected));
      write(item, 'tabindex', item.disabled ? null : item === stop ? '0' : '-1');
    }
  }

  #itemFor(event: Event): PunkTreeItem | undefined {
    return event
      .composedPath()
      .find((node): node is PunkTreeItem => this.#items.includes(node as PunkTreeItem));
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

  #move(item: PunkTreeItem): void {
    this.#last = item;
    this.#render();
    item.focus();
  }

  /** Expands or collapses for the user, and keeps focus out of what it hides. */
  #setExpanded(item: PunkTreeItem, expanded: boolean): void {
    if (!item.isParent || item.expanded === expanded || item.disabled) return;
    item.expanded = expanded;
    if (!expanded && item.contains(document.activeElement) && document.activeElement !== item) {
      this.#move(item);
    }
    item.dispatchEvent(
      new CustomEvent<PunkToggleDetail>('punk-toggle', {
        bubbles: true,
        composed: true,
        detail: { expanded },
      }),
    );
    this.#schedule();
  }

  #activate(item: PunkTreeItem): void {
    item.dispatchEvent(
      new CustomEvent<PunkActivateDetail>('punk-activate', {
        bubbles: true,
        composed: true,
        detail: { value: item.value, item },
      }),
    );
  }

  readonly #onFocusIn = (event: FocusEvent): void => {
    const item = this.#itemFor(event);
    if (!item || item.disabled || item === this.#last) return;
    this.#last = item;
    this.#render();
  };

  readonly #onClick = (event: MouseEvent): void => {
    const item = this.#itemFor(event);
    if (!item) return;
    if (item.disabled) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    const onToggle = event
      .composedPath()
      .some((node) => (node as Element).getAttribute?.('part') === 'toggle');
    if (onToggle) {
      this.#setExpanded(item, !item.expanded);
      return;
    }
    this.#last = item;
    const mode = this.#mode;
    if (mode !== 'none') {
      this.#interact((model) =>
        mode === 'single' ? model.select(item.value) : model.toggle(item.value),
      );
    }
    this.#activate(item);
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const item = this.#itemFor(event);
    if (!item || event.target !== item || event.defaultPrevented || event.altKey) return;
    const mode = this.#mode;
    const { key, ctrlKey, metaKey } = event;
    if ((key === 'a' || key === 'A') && (ctrlKey || metaKey) && mode === 'multiple') {
      event.preventDefault();
      this.#interact((model) => model.selectAll());
      return;
    }
    if (ctrlKey || metaKey) return;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      if (key === ' ' && mode !== 'none') {
        this.#interact((model) =>
          mode === 'single' ? model.select(item.value) : model.toggle(item.value),
        );
      } else this.#activate(item);
      return;
    }
    const shown = this.#visible().filter((other) => !other.disabled || other === item);
    const at = shown.indexOf(item);
    const rtl = getComputedStyle(this).direction === 'rtl';
    const inward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const outward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: PunkTreeItem | undefined;
    if (key === 'ArrowDown') target = shown.slice(at + 1).find((other) => !other.disabled);
    else if (key === 'ArrowUp') target = shown.slice(0, at).findLast((other) => !other.disabled);
    else if (key === 'Home') target = shown.find((other) => !other.disabled);
    else if (key === 'End') target = shown.findLast((other) => !other.disabled);
    else if (key === inward) {
      event.preventDefault();
      if (!item.isParent) return;
      if (!item.expanded) this.#setExpanded(item, true);
      else {
        const child = [...item.children].find(
          (other): other is PunkTreeItem => other instanceof PunkTreeItem && !other.disabled,
        );
        if (child) this.#move(child);
      }
      return;
    } else if (key === outward) {
      event.preventDefault();
      if (item.isParent && item.expanded) this.#setExpanded(item, false);
      else if (item.parentElement instanceof PunkTreeItem) this.#move(item.parentElement);
      return;
    } else if (key === '*') {
      event.preventDefault();
      for (const sibling of item.parentElement?.children ?? []) {
        if (sibling instanceof PunkTreeItem) this.#setExpanded(sibling, true);
      }
      return;
    } else if (key.length === 1) {
      const typed = key.toLocaleLowerCase();
      const ordered = [...shown.slice(at + 1), ...shown.slice(0, at + 1)];
      target = ordered.find(
        (other) => !other.disabled && other.label.trim().toLocaleLowerCase().startsWith(typed),
      );
    } else return;
    event.preventDefault();
    if (target && target !== item) this.#move(target);
  };

  protected override render() {
    return html`<div part="tree" class="tree">
      <slot @slotchange=${() => this.#schedule()}></slot>
    </div>`;
  }
}
