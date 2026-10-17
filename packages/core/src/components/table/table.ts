import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Ledger } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { PunkSelectionChangeDetail } from '../slot-grid/slot-grid.ts';
import { tableContentCss, tableStyles } from './table.styles.ts';

export type SortDirection = 'ascending' | 'descending';

export interface PunkSortChangeDetail {
  /** The `data-sort` of the column. */
  key: string;
  direction: SortDirection;
}

declare global {
  interface HTMLElementEventMap {
    'punk-sort-change': CustomEvent<PunkSortChangeDetail>;
  }
}

const ROW_BOX = '[data-punk-select]';
const ALL_BOX = '[data-punk-select-all]';

interface Box extends HTMLElement {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
}

// One sheet for the light-DOM table, adopted once into each document or shadow root that holds a
// table, since a shadow tree's styles cannot reach a slotted element's descendants.
let sheet: CSSStyleSheet | undefined;
const adopted = new WeakSet<Document | ShadowRoot>();

function adoptContentStyles(root: Node): void {
  if (!(root instanceof Document || root instanceof ShadowRoot) || adopted.has(root)) return;
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(tableContentCss);
  }
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  adopted.add(root);
}

/**
 * Tabular data in a native `<table>` written inside it, which keeps its own semantics: give it a
 * `<caption>` or an `aria-label`. The table scrolls sideways inside the element instead of the
 * page, and while it overflows the scroll area is a focusable `region` named like the table, so a
 * keyboard can scroll it. `--punk-table-max-height` makes the header row stick while the body
 * scrolls. Its look comes from one stylesheet the element adds to the table's document or shadow
 * root, scoped to `punk-table > table`, at the lowest specificity so the application's rules win.
 *
 * **Sorting** is the application's: a header cell with `data-sort="key"` and a `<button>` inside
 * becomes sortable. A click on the button sets `aria-sort` on the cell, cycling ascending and
 * descending, clears it on the others, and sends `punk-sort-change`; the application reorders the
 * rows. `sort-key` and `sort-direction` set the state from code without an event.
 *
 * **Selection** is by checkboxes the application places: a checkbox with `data-punk-select` in a
 * row (`<tr data-value>`) selects that row, and one with `data-punk-select-all` in the header
 * selects every row and shows whether some are. Selected rows get `data-selected`. Each change the
 * user makes sends `punk-selection-change`.
 *
 * @tagname punk-table
 *
 * @slot - The `<table>`.
 *
 * @csspart scroller - The area that scrolls the table.
 *
 * @cssprop [--punk-table-max-height=none] - The tallest the table gets before its body scrolls under a sticky header.
 *
 * @fires punk-sort-change - The user sorted by a column. `detail` is `{ key, direction }`.
 * @fires punk-selection-change - The user selected or cleared rows. `detail` is `{ values, items }`, the rows' `data-value` and the rows.
 */
export class PunkTable extends PunkElement {
  static override styles = tableStyles;

  /** The `data-sort` of the column the rows are sorted by, or an empty string. */
  @property({ attribute: 'sort-key', reflect: true }) sortKey = '';

  /** The direction of the sorted column. Unknown values use `ascending`. */
  @property({ attribute: 'sort-direction', reflect: true }) sortDirection: SortDirection =
    'ascending';

  /** Mirrors the host `aria-label`, which names the scroll area. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  @state() private scrollable = false;
  @state() private caption = '';

  #observer: ResizeObserver | undefined;
  readonly #sortCells = new Ledger();
  #warned = '';

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('change', this.#onChange);
  }

  /** The `data-value` of each selected row, in order. Assign it to check rows by value. */
  get values(): string[] {
    return this.#rows()
      .filter((row) => this.#rowBox(row)?.checked)
      .map((row) => row.dataset['value'] ?? '');
  }
  set values(values: readonly string[]) {
    for (const row of this.#rows()) {
      const box = this.#rowBox(row);
      if (box) box.checked = values.includes(row.dataset['value'] ?? '');
    }
    this.#syncSelection();
  }

  get #table(): HTMLTableElement | null {
    return (
      [...this.children].find(
        (child): child is HTMLTableElement => child instanceof HTMLTableElement,
      ) ?? null
    );
  }

  #rows(): HTMLTableRowElement[] {
    return [...(this.#table?.tBodies ?? [])].flatMap((body) => [...body.rows]);
  }

  #rowBox(row: HTMLTableRowElement): Box | null {
    return row.querySelector<Box>(ROW_BOX);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    adoptContentStyles(this.getRootNode());
    if (!this.hasUpdated) return;
    this.#observe();
    this.#syncSort();
    this.#syncSelection();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#sortCells.restoreAll();
    for (const row of this.#rows()) row.removeAttribute('data-selected');
  }

  protected override firstUpdated(): void {
    this.#observe();
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('sortKey') || changed.has('sortDirection')) this.#syncSort();
  }

  /** One observer while connected, on the scroll area and the table, for whether it overflows. */
  #observe(): void {
    const scroller = this.renderRoot.querySelector<HTMLElement>('.scroller');
    if (!scroller) return;
    this.#observer ??= new ResizeObserver(() => {
      this.scrollable =
        scroller.scrollWidth > scroller.clientWidth + 1 ||
        scroller.scrollHeight > scroller.clientHeight + 1;
    });
    this.#observer.disconnect();
    this.#observer.observe(scroller);
    const table = this.#table;
    if (table) this.#observer.observe(table);
  }

  readonly #onSlotChange = (): void => {
    const table = this.#table;
    this.caption = table?.caption?.textContent?.trim() ?? '';
    this.#observe();
    this.#syncSort();
    this.#syncSelection();
    const named = Boolean(
      this.caption || this.accessibleLabel || table?.hasAttribute('aria-label'),
    );
    const problem = !table
      ? 'It has no `<table>` child.'
      : named
        ? ''
        : 'Its table has no name. Give it a `<caption>`, or set `aria-label`.';
    if (problem && problem !== this.#warned) devWarn(this, problem);
    this.#warned = problem;
  };

  /** Writes `aria-sort` on the sortable header cells, and gives back what the author had on any that left. */
  #syncSort(): void {
    const cells = [...(this.#table?.querySelectorAll<HTMLElement>('th[data-sort]') ?? [])];
    this.#sortCells.restoreAll(new Set(cells));
    const direction = this.sortDirection === 'descending' ? 'descending' : 'ascending';
    for (const cell of cells) {
      const sorted = this.sortKey !== '' && cell.dataset['sort'] === this.sortKey;
      this.#sortCells.write(cell, 'aria-sort', sorted ? direction : 'none');
    }
  }

  /** Marks the selected rows, and shows on the select-all box whether all or some are. */
  #syncSelection(): void {
    const rows = this.#rows().filter((row) => this.#rowBox(row));
    let checked = 0;
    for (const row of rows) {
      const on = Boolean(this.#rowBox(row)?.checked);
      if (on) checked++;
      row.toggleAttribute('data-selected', on);
    }
    const all = this.#table?.querySelector<Box>(ALL_BOX);
    if (all) {
      all.checked = rows.length > 0 && checked === rows.length;
      all.indeterminate = checked > 0 && checked < rows.length;
    }
  }

  #reportSelection(): void {
    const items = this.#rows().filter((row) => this.#rowBox(row)?.checked);
    this.emit<PunkSelectionChangeDetail>('punk-selection-change', {
      values: items.map((row) => row.dataset['value'] ?? ''),
      items,
    });
  }

  readonly #onChange = (event: Event): void => {
    const target = event.target as Element | null;
    if (!target) return;
    if (target.matches(ALL_BOX)) {
      const on = (target as Box).checked;
      for (const row of this.#rows()) {
        const box = this.#rowBox(row);
        if (box && !box.disabled) box.checked = on;
      }
    } else if (!target.matches(ROW_BOX)) return;
    this.#syncSelection();
    this.#reportSelection();
  };

  readonly #onClick = (event: MouseEvent): void => {
    const button = (event.target as Element | null)?.closest('button');
    const cell = button?.closest<HTMLElement>('th[data-sort]');
    if (!button || !cell || !this.contains(cell)) return;
    const key = cell.dataset['sort'] ?? '';
    const direction: SortDirection =
      key === this.sortKey && this.sortDirection === 'ascending' ? 'descending' : 'ascending';
    this.sortKey = key;
    this.sortDirection = direction;
    this.#syncSort();
    this.emit<PunkSortChangeDetail>('punk-sort-change', { key, direction });
  };

  protected override render() {
    const name = this.accessibleLabel ?? (this.caption || undefined);
    return html`<div
      part="scroller"
      class="scroller"
      tabindex=${ifDefined(this.scrollable ? '0' : undefined)}
      role=${ifDefined(this.scrollable ? 'region' : undefined)}
      aria-label=${ifDefined(this.scrollable ? name : undefined)}
    >
      <slot @slotchange=${this.#onSlotChange}></slot>
    </div>`;
  }
}
