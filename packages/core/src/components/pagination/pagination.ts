import { html } from 'lit';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg, str } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { formatNumber, resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { pageWindow } from './page-window.ts';
import { paginationStyles } from './pagination.styles.ts';

export interface PunkPageChangeDetail {
  /** The page the user chose, from 1. */
  page: number;
}

declare global {
  interface HTMLElementEventMap {
    'punk-page-change': CustomEvent<PunkPageChangeDetail>;
  }
}

/**
 * Moving through the pages of a long result set: a `nav` landmark named "Pagination" (or `label`)
 * with previous and next buttons and a button for each page it shows: the first and last, the
 * current one with `siblings` on each side, and a gap for the rest. The current page has
 * `aria-current="page"`, and each page button is named "Page 3" while it shows "3", formatted for
 * the nearest `lang`. The application owns the data: a click sets `page` and sends
 * `punk-page-change`, and focus stays on the button that was pressed, or on the current page when
 * that button is gone or disabled.
 *
 * @tagname punk-pagination
 *
 * @csspart nav - The navigation landmark.
 * @csspart list - The list of buttons.
 * @csspart previous - The previous-page button.
 * @csspart next - The next-page button.
 * @csspart page - Each page button.
 * @csspart gap - Each gap.
 *
 * @fires punk-page-change - The user chose a page. `detail` is `{ page }`.
 */
export class PunkPagination extends PunkElement {
  static override styles = paginationStyles;

  static override properties: PropertyDeclarations = {
    page: { type: Number, reflect: true },
    pages: { type: Number, reflect: true },
    siblings: { type: Number, reflect: true },
    label: { reflect: true },
  };

  /** The current page, from 1. A page out of range is clamped and warns. */
  page = 1;

  /** How many pages there are. Below 1, or not a number, is 1 and warns. */
  pages = 1;

  /** How many pages to show on each side of the current one. */
  siblings = 1;

  /** The name of the landmark. Without it, the localized "Pagination". */
  label = '';

  readonly #localeWatcher = new LocaleWatcher(this);
  #warned = '';
  #refocus: string | undefined;

  get #pages(): number {
    return Number.isFinite(this.pages) && this.pages >= 1 ? Math.floor(this.pages) : 1;
  }

  get #page(): number {
    const page = Number.isFinite(this.page) ? Math.round(this.page) : 1;
    return Math.min(Math.max(page, 1), this.#pages);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('page') && !changed.has('pages')) return;
    const problem =
      !Number.isFinite(this.pages) || this.pages < 1
        ? `\`pages\` is ${this.pages}, so it is 1.`
        : this.#page !== this.page
          ? `\`page\` ${this.page} is outside 1 to ${this.#pages}, so it is ${this.#page}.`
          : '';
    if (problem && problem !== this.#warned) devWarn(this, problem);
    this.#warned = problem;
  }

  protected override updated(): void {
    const target = this.#refocus;
    this.#refocus = undefined;
    if (!target) return;
    const button =
      this.renderRoot.querySelector<HTMLButtonElement>(
        `[data-target="${target}"]:not(:disabled)`,
      ) ?? this.renderRoot.querySelector<HTMLButtonElement>('[aria-current="page"]');
    button?.focus();
  }

  #go(page: number, target: string): void {
    const next = Math.min(Math.max(page, 1), this.#pages);
    if (next === this.#page) return;
    this.page = next;
    this.#refocus = target;
    this.emit<PunkPageChangeDetail>('punk-page-change', { page: next });
  }

  protected override render() {
    const page = this.#page;
    const pages = this.#pages;
    const lang = resolveLang(this);
    const siblings = Number.isFinite(this.siblings) ? Math.max(0, Math.floor(this.siblings)) : 1;
    const name =
      this.label ||
      msg('Pagination', {
        id: 'pagination',
        desc: 'The name of the landmark around the buttons that move between pages of results.',
      });
    return html`<nav part="nav" aria-label=${name}>
      <ul part="list" class="list">
        <li>
          <button
            part="previous"
            class="button step previous"
            type="button"
            data-target="previous"
            aria-label=${msg('Previous page', { id: 'previousPage', desc: 'The name of the button that goes to the previous page of results.' })}
            ?disabled=${page <= 1}
            @click=${() => this.#go(page - 1, 'previous')}
          >
            <span class="arrow" aria-hidden="true"></span>
          </button>
        </li>
        ${pageWindow(page, pages, siblings).map((entry) => {
          if (entry === 'gap') return html`<li part="gap" class="gap" aria-hidden="true">…</li>`;
          const shown = formatNumber(entry, lang);
          return html`<li>
            <button
              part="page"
              class="button"
              type="button"
              data-target=${entry}
              aria-label=${msg(str`Page ${shown}`, { id: 'pageNumber', desc: 'The name of a button that goes to one page of results, for example: Page 3.' })}
              aria-current=${ifDefined(entry === page ? 'page' : undefined)}
              @click=${() => this.#go(entry, String(entry))}
            >
              ${shown}
            </button>
          </li>`;
        })}
        <li>
          <button
            part="next"
            class="button step next"
            type="button"
            data-target="next"
            aria-label=${msg('Next page', { id: 'nextPage', desc: 'The name of the button that goes to the next page of results.' })}
            ?disabled=${page >= pages}
            @click=${() => this.#go(page + 1, 'next')}
          >
            <span class="arrow" aria-hidden="true"></span>
          </button>
        </li>
      </ul>
    </nav>`;
  }
}
