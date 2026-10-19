import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { Ledger, childChanged, owner, release } from '../../internal/owner.ts';
import type { Owner } from '../../internal/owner.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import type { RovingOrientation } from '../../internal/roving-keys.ts';
import { focusItem, setTabStop } from '../../internal/roving.ts';
import { SlotPresence } from '../../internal/slot-presence.ts';
import { navigateTabs, resolveSelection } from '../../internal/tab-navigation.ts';
import type { TabActivation } from '../../internal/tab-navigation.ts';
import { devWarn } from '../../utilities/warn.ts';
import { PunkTab } from './tab.ts';
import { tabsStyles } from './tabs.styles.ts';

export type TabsOrientation = RovingOrientation;
export type { TabActivation };

export interface PunkTabChangeDetail {
  /** The selected tab's `panel`. */
  value: string;
  tab: HTMLElement;
  panel: HTMLElement | null;
}

declare global {
  interface HTMLElementEventMap {
    'punk-tab-change': CustomEvent<PunkTabChangeDetail>;
  }
}

const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  'punk-button:not([disabled])',
  'punk-icon-button:not([disabled])',
  'punk-slot-grid:not([disabled])',
].join(',');

/**
 * A list of tabs that show one panel at a time. Give it an `aria-label`. The panels are named by
 * `id` in each tab's `panel`, and can be inside the tabs or anywhere else in the same tree. The
 * tabs own the panels' `role`, `aria-labelledby`, `hidden`, and, when a panel has nothing to Tab
 * to, `tabindex="0"`, and give back what they wrote when a tab leaves.
 *
 * With `auto` activation the arrow keys select the tab they reach; with `manual` they only move
 * focus, and `Enter` or `Space` selects. Arrows swap in right-to-left languages, and vertical
 * tabs use Up and Down. Nothing wraps.
 *
 * @tagname punk-tabs
 *
 * @slot tab - The `punk-tab` elements.
 * @slot - Panels, if they are inside the tabs.
 *
 * @csspart tablist - The tab list.
 * @csspart panels - The surface around panels inside the tabs, which the selected tab joins. It is hidden when the panels are elsewhere.
 *
 * @cssprop [--punk-tabs-padding=var(--punk-space-3)] - Padding of the surface around panels inside the tabs.
 *
 * @fires punk-tab-change - The user selected a tab. `detail` is `{ value, tab, panel }`. It is not sent when the application changes the selection.
 */
export class PunkTabs extends PunkElement implements Owner<PunkTab> {
  static override styles = tabsStyles;

  /** Which way the tabs are laid out. Unknown values use `horizontal`. */
  @property({ reflect: true }) orientation: TabsOrientation = 'horizontal';

  /** `auto` selects a tab when the arrow keys reach it. Unknown values use `auto`. */
  @property({ reflect: true }) activation: TabActivation = 'auto';

  /** Mirrors the host `aria-label`, which cannot reach the tab list on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  /** The selected tab's `panel`. Assigning selects the tab with that panel. */
  get value(): string {
    return this.#selected?.panel ?? this.#requested ?? '';
  }
  set value(value: string) {
    const tab = this.#tabs.find((entry) => entry.panel === value);
    if (tab) this.#select(tab);
    else if (this.#tabs.length === 0) this.#requested = value;
  }

  #tabs: PunkTab[] = [];
  #selected: PunkTab | null = null;
  #stop: PunkTab | null = null;
  #lastIndex = 0;
  #requested: string | null = null;
  readonly #panels = new Ledger();
  readonly #slots = new SlotPresence(this, ['']);
  #warned = new Set<string>();
  #waitingForParse = false;

  constructor() {
    super();
    this.addEventListener('click', this.#handleClick);
    this.addEventListener('keydown', this.#handleKeyDown);
    this.addEventListener('focusin', this.#handleFocusIn);
  }

  get #orientation(): RovingOrientation {
    return this.orientation === 'vertical' ? 'vertical' : 'horizontal';
  }

  get #activation(): TabActivation {
    return this.activation === 'manual' ? 'manual' : 'auto';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#collect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#panels.restoreAll();
    for (const tab of this.#tabs) tab.removeAttribute('aria-controls');
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('orientation'))
      for (const tab of this.#tabs) tab.orientation = this.#orientation;
  }

  protected override firstUpdated(): void {
    if (!this.accessibleLabel && !this.hasAttribute('aria-labelledby')) {
      devWarn(this, 'It has no accessible name. Set `aria-label`.');
    }
  }

  /** @internal A tab that was upgraded after the tabs rendered calls this. */
  refreshTabs(): void {
    if (this.hasUpdated) this.#collect();
  }

  /** @internal */
  [childChanged](tab: PunkTab, changed: ReadonlyMap<PropertyKey, unknown>): void {
    if (!this.#tabs.includes(tab)) return;
    const agrees = tab.selected === (tab === this.#selected);
    if (changed.has('selected') && !agrees && tab.selected) this.#sync(tab);
    else if (changed.has('selected') && !agrees) this.#sync();
    else if (changed.has('disabled')) this.#sync();
    else if (changed.has('panel')) this.#syncPanels();
  }

  /** @internal */
  [release](tab: PunkTab): void {
    tab[owner] = null;
    tab[setTabStop](null);
    tab.removeAttribute('aria-controls');
    if (tab === this.#selected) this.#lastIndex = this.#tabs.indexOf(tab);
  }

  readonly #handleSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    this.#collect(slot.assignedElements({ flatten: true }));
  };

  #collect(assigned?: Element[]): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="tab"]');
    const tabs = (assigned ?? slot?.assignedElements({ flatten: true }) ?? []).filter(
      (element): element is PunkTab => element instanceof PunkTab,
    );
    for (const tab of this.#tabs) if (!tabs.includes(tab)) this[release](tab);
    this.#tabs = tabs;
    for (const tab of tabs) {
      tab[owner] = this;
      tab.orientation = this.#orientation;
    }
    if (this.#selected && !tabs.includes(this.#selected)) this.#selected = null;
    this.#sync();
  }

  /** Chooses the one selected tab and the one tab stop, and applies them. */
  #sync(preferred?: PunkTab): void {
    const tabs = this.#tabs;
    const disabled = tabs.map((tab) => tab.disabled);
    let index = preferred ? tabs.indexOf(preferred) : -1;
    if (index < 0 && this.#requested !== null) {
      index = tabs.findIndex((tab) => tab.panel === this.#requested);
      if (index >= 0) this.#requested = null;
    }
    if (index < 0 && this.#selected) index = tabs.indexOf(this.#selected);
    if (index < 0) index = tabs.findIndex((tab) => tab.selected && !tab.disabled);
    if (index < 0) index = Math.min(this.#lastIndex, tabs.length - 1);
    const chosen = tabs[resolveSelection(disabled, index)] ?? null;

    this.#selected = chosen;
    if (chosen) this.#lastIndex = tabs.indexOf(chosen);
    for (const tab of tabs) tab.selected = tab === chosen;
    if (!this.#stop || !tabs.includes(this.#stop) || this.#stop.disabled) this.#stop = chosen;
    if (preferred && chosen === preferred) this.#stop = chosen;
    this.#applyStops();
    this.#syncPanels();
  }

  #applyStops(): void {
    for (const tab of this.#tabs) tab[setTabStop](tab === this.#stop);
  }

  #panelOf(tab: PunkTab): HTMLElement | null {
    if (!tab.panel) return null;
    const root = tab.getRootNode() as Document | ShadowRoot;
    return root.getElementById?.(tab.panel) ?? null;
  }

  #warnOnce(key: string, message: string): void {
    if (this.#warned.has(key)) return;
    this.#warned.add(key);
    devWarn(this, message);
  }

  /** Writes the panels' roles and visibility, and gives back those of panels no tab names now. */
  #syncPanels(): void {
    // A panel after the tabs in the markup may not be parsed yet, so wait before saying it is missing.
    const parsing = document.readyState === 'loading';
    if (parsing && !this.#waitingForParse) {
      this.#waitingForParse = true;
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          this.#waitingForParse = false;
          this.#syncPanels();
        },
        { once: true },
      );
    }

    const wanted = new Map<HTMLElement, PunkTab>();
    for (const tab of this.#tabs) {
      if (!tab.panel) {
        this.#warnOnce(`none:${tab.id}`, 'A tab has no `panel`, so it shows nothing.');
        continue;
      }
      const panel = this.#panelOf(tab);
      if (!panel) {
        if (!parsing) this.#warnOnce(`missing:${tab.id}`, `No panel has the id "${tab.panel}".`);
        continue;
      }
      if (wanted.has(panel)) {
        this.#warnOnce(
          `twice:${tab.id}`,
          `Two tabs name the panel "${tab.panel}". Only the first shows it.`,
        );
        continue;
      }
      wanted.set(panel, tab);
    }

    this.#panels.restoreAll(new Set(wanted.keys()));
    const shown = new Set(wanted.values());
    for (const tab of this.#tabs) if (!shown.has(tab)) tab.removeAttribute('aria-controls');
    for (const [panel, tab] of wanted) {
      this.#panels.write(panel, 'role', 'tabpanel');
      this.#panels.write(panel, 'aria-labelledby', tab.id);
      this.#panels.write(panel, 'hidden', tab === this.#selected ? null : '');
      // The author's own tabindex is kept; otherwise a panel with nothing to Tab to takes one.
      if (this.#panels.authored(panel, 'tabindex') === null) {
        this.#panels.write(panel, 'tabindex', panel.querySelector(TABBABLE) ? null : '0');
      }
      tab.setAttribute('aria-controls', panel.id);
    }
  }

  /** A selection the user made: it also reports the change. */
  #select(tab: PunkTab, user = false): void {
    if (tab === this.#selected || tab.disabled) return;
    this.#stop = tab;
    this.#sync(tab);
    if (user) {
      this.emit<PunkTabChangeDetail>('punk-tab-change', {
        value: tab.panel,
        tab,
        panel: this.#panelOf(tab),
      });
    }
  }

  #tabAt(event: Event): number {
    const path = event.composedPath();
    return this.#tabs.findIndex((tab) => path.includes(tab));
  }

  readonly #handleClick = (event: MouseEvent): void => {
    const tab = this.#tabs[this.#tabAt(event)];
    if (tab) this.#select(tab, true);
  };

  readonly #handleFocusIn = (event: FocusEvent): void => {
    const tab = this.#tabs[this.#tabAt(event)];
    if (!tab || tab.disabled || tab === this.#stop) return;
    this.#stop = tab;
    this.#applyStops();
  };

  readonly #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const from = this.#tabAt(event);
    if (from < 0) return;
    const result = navigateTabs(
      event.key,
      from,
      this.#selected ? this.#tabs.indexOf(this.#selected) : -1,
      this.#tabs.map((tab) => tab.disabled),
      {
        orientation: this.#orientation,
        rtl: this.matches(':dir(rtl)'),
        activation: this.#activation,
      },
    );
    if (!result) return;
    event.preventDefault();
    const target = this.#tabs[result.focus];
    if (!target) return;
    this.#stop = target;
    this.#applyStops();
    target[focusItem]();
    const selection = result.select === null ? undefined : this.#tabs[result.select];
    if (selection) this.#select(selection, true);
  };

  protected override render() {
    const joined = this.#slots.has('');
    return html`
      <div
        part="tablist"
        class="tablist ${joined ? 'joined' : ''}"
        role="tablist"
        aria-orientation=${this.#orientation}
        aria-label=${ifDefined(this.accessibleLabel ?? undefined)}
      >
        <slot name="tab" @slotchange=${this.#handleSlotChange}></slot>
      </div>
      <div part="panels" class="panels" ?hidden=${!joined}>
        <slot @slotchange=${this.#slots.handleSlotChange}></slot>
      </div>
    `;
  }
}
