import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { childChanged, owner } from '../../internal/owner.ts';
import type { Owned, Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { treeItemStyles } from './tree.styles.ts';

/**
 * A node of a `punk-tree`: a row with its `label`, and the `punk-tree-item` elements inside it as
 * its children, shown while it is `expanded`. The host is a `treeitem` named by `label`, with
 * `aria-level`, `aria-expanded` while it has children, and `aria-disabled`; the tree writes
 * `aria-selected` and `tabindex`. A parent shows a triangle that points at its children while
 * they show.
 *
 * @tagname punk-tree-item
 *
 * @slot - The child `punk-tree-item` elements.
 * @slot icon - Before the label, such as a folder or file icon.
 *
 * @csspart row - The row.
 * @csspart toggle - The triangle of a parent, which a click expands or collapses.
 * @csspart icon - The wrapper around the icon.
 * @csspart label - The label.
 * @csspart check - The check mark of a selected item.
 * @csspart group - The `group` around the children.
 *
 * @fires punk-toggle - A user expanded or collapsed it. `detail` is `{ expanded }`. Not sent when `expanded` is set from code.
 * @fires punk-activate - It was clicked, or activated with Enter. `detail` is `{ value, item }`.
 */
export class PunkTreeItem extends PunkElement implements Owned<PunkTreeItem> {
  static override styles = treeItemStyles;

  static override properties: PropertyDeclarations = {
    label: { reflect: true },
    value: { reflect: true },
    expanded: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    selected: { type: Boolean, reflect: true },
  };

  /** The text of the row, and the item's name. */
  label = '';

  /** Identifies the item in `punk-activate` and the tree's `values`. */
  value = '';

  /** Shows the children. */
  expanded = false;

  /** Leaves it out of the arrow keys' stops and of selection. */
  disabled = false;

  /** Whether it is selected. The markup's value is the first selection; after that the tree sets it. */
  selected = false;

  /**
   * The tree that manages this item.
   * @internal
   */
  [owner]: Owner<PunkTreeItem> | null = null;
  static {
    // The dev transform gives a decorator on a symbol key no key, so the property is made here.
    this.createProperty(owner, { attribute: false });
  }

  readonly #slots = new SlotPresence(this, ['icon']);
  #parent = false;

  /** Whether it has child items. */
  get isParent(): boolean {
    return this.#parent;
  }

  /** How deep it is: 1 for an item of the tree itself. */
  get level(): number {
    let level = 1;
    for (
      let node = this.parentElement;
      node && node.localName === 'punk-tree-item';
      node = node.parentElement
    ) {
      level += 1;
    }
    return level;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readChildren();
  }

  #readChildren(): void {
    this.#parent = [...this.children].some((child) => child.localName === 'punk-tree-item');
  }

  readonly #onChildren = (): void => {
    const was = this.#parent;
    this.#readChildren();
    if (was !== this.#parent) this.requestUpdate();
    this[owner]?.[childChanged](this, new Map([['children', was]]));
  };

  protected override willUpdate(): void {
    this.setAttribute('role', 'treeitem');
    this.setAttribute('aria-level', String(this.level));
    if (this.label) this.setAttribute('aria-label', this.label);
    else this.removeAttribute('aria-label');
    if (this.#parent) this.setAttribute('aria-expanded', String(this.expanded));
    else this.removeAttribute('aria-expanded');
    if (this.disabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has(owner)) return;
    this[owner]?.[childChanged](this, changed);
  }

  protected override render() {
    return html`<div
        part="row"
        class=${classMap({ row: true, selected: this.selected })}
        style=${styleMap({ '--_level': String(this.level - 1) })}
      >
        <span
          part="toggle"
          class=${classMap({ toggle: true, open: this.expanded })}
          aria-hidden="true"
          ?hidden=${!this.#parent}
        ></span>
        <span part="icon" class="icon" ?hidden=${!this.#slots.has('icon')}
          ><slot name="icon" @slotchange=${this.#slots.handleSlotChange}></slot
        ></span>
        <span part="label" class="label">${this.label}</span>
        <span part="check" class="check" aria-hidden="true"></span>
      </div>
      <div part="group" class="group" role="group" ?hidden=${!this.expanded || !this.#parent}>
        <slot @slotchange=${this.#onChildren}></slot>
      </div>`;
  }
}
