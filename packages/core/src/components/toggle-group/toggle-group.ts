import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkElement } from '../../internal/punk-element.ts';
import { nextRovingIndex } from '../../internal/roving-keys.ts';
import { SelectionModel } from '../../internal/selection-model.ts';
import { devWarn } from '../../utilities/warn.ts';
import type { PunkSelectionChangeDetail } from '../slot-grid/slot-grid.ts';
import { toggleGroupStyles } from './toggle-group.styles.ts';

export type ToggleGroupSelection = 'single' | 'multiple';

const OWNED = ['role', 'aria-checked', 'aria-pressed', 'tabindex'] as const;
type Owned = (typeof OWNED)[number];

function write(element: Element, name: string, value: string | null): void {
  if (element.getAttribute(name) === value) return;
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/**
 * A set of native `<button>` children that stay pressed: view modes, alignment, filters. Give it an
 * `aria-label`. Each button is identified by its `value`, and its text or `aria-label` is its name.
 *
 * With `selection="single"` (the default) it is a `radiogroup` of `radio` buttons: exactly one is
 * pressed once the user has chosen, and the arrow keys move and choose together. With `multiple` it
 * is a `group` of toggle buttons with `aria-pressed`: the arrow keys only move focus, and a click,
 * Enter, or Space presses or releases. Either way the group is one tab stop; Left and Right swap in
 * right-to-left languages, Up and Down also move, Home and End go to the ends, and nothing wraps.
 *
 * It owns each button's `role`, `aria-checked`, `aria-pressed`, and `tabindex`, and gives back
 * what the author had when a button leaves or the group disconnects. `disabled` disables the buttons
 * that were not already, and enables exactly those again.
 *
 * @tagname punk-toggle-group
 *
 * @slot - The `<button>` elements. Anything else is ignored and warned about in development.
 *
 * @csspart group - The strip that holds the buttons.
 *
 * @fires punk-selection-change - The user pressed or released a button. `detail` is `{ values, items }`.
 */
export class PunkToggleGroup extends PunkElement {
  static override styles = toggleGroupStyles;

  /** `single` keeps one button pressed; `multiple` lets any number be. Unknown values use `single`. */
  @property({ reflect: true }) selection: ToggleGroupSelection = 'single';

  /** Disables every button. Buttons that were already disabled stay so. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Mirrors the host `aria-label`, which cannot reach the group on its own. */
  @property({ attribute: 'aria-label' }) accessibleLabel: string | null = null;

  /**
   * The `value` of each pressed button, in order. Assign it to press buttons by value, before or
   * after they exist. Reading returns a copy, and assigning never changes the array you pass.
   */
  get values(): string[] {
    return this.#built ? this.#model.selected : [...(this.#requested ?? [])];
  }
  set values(values: readonly string[]) {
    this.#requested = [...values];
    if (this.#built) this.#sync();
  }

  #model = new SelectionModel('single');
  #buttons: HTMLButtonElement[] = [];
  #authored = new Map<HTMLButtonElement, Record<Owned, string | null>>();
  #disabledByUs = new Set<HTMLButtonElement>();
  #requested: string[] | undefined;
  #last: HTMLButtonElement | undefined;
  #built = false;
  #reported = '';

  constructor() {
    super();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('focusin', this.#onFocusIn);
  }

  get #mode(): ToggleGroupSelection {
    return this.selection === 'multiple' ? 'multiple' : 'single';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#sync();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const button of this.#buttons) this.#release(button);
    this.#buttons = [];
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('selection') || changed.has('disabled')) this.#sync();
  }

  #sync(): void {
    if (!this.isConnected) return;
    const children = [...this.children].filter((child) => !child.slot);
    const found = children.filter(
      (child): child is HTMLButtonElement => child.localName === 'button',
    );
    const problems: string[] = [];
    if (found.length !== children.length) {
      problems.push('It contains elements that are not `<button>`, so they are ignored.');
    }
    if (!this.accessibleLabel && !this.hasAttribute('aria-labelledby')) {
      problems.push('It has no accessible name. Set `aria-label`.');
    }
    const report = problems.join('\n');
    if (report && report !== this.#reported) for (const problem of problems) devWarn(this, problem);
    this.#reported = report;

    for (const button of this.#buttons) if (!found.includes(button)) this.#release(button);
    for (const button of found) {
      if (!this.#authored.has(button)) {
        const saved = {} as Record<Owned, string | null>;
        for (const name of OWNED) saved[name] = button.getAttribute(name);
        this.#authored.set(button, saved);
      }
      if (this.disabled && !button.disabled) {
        button.disabled = true;
        this.#disabledByUs.add(button);
      } else if (!this.disabled && this.#disabledByUs.delete(button)) {
        button.disabled = false;
      }
    }
    this.#buttons = found;

    const mode = this.#mode;
    const before = this.#built ? this.#model.selected : undefined;
    if (this.#model.mode !== mode) this.#model.setMode(mode);
    this.#model.setItems(
      found.map((button) => button.value),
      found.filter((button) => button.disabled).map((button) => button.value),
    );
    // Before anything is assigned, buttons the markup marked pressed or checked start pressed.
    const authored = found
      .filter((button) => {
        const saved = this.#authored.get(button);
        return saved?.['aria-pressed'] === 'true' || saved?.['aria-checked'] === 'true';
      })
      .map((button) => button.value);
    this.#model.set(this.#requested ?? before ?? authored);
    this.#built = true;
    this.#render();
  }

  #release(button: HTMLButtonElement): void {
    const saved = this.#authored.get(button);
    if (saved) for (const name of OWNED) write(button, name, saved[name]);
    this.#authored.delete(button);
    if (this.#disabledByUs.delete(button)) button.disabled = false;
    if (this.#last === button) this.#last = undefined;
  }

  /** Writes each button's role, state, and tab stop from the selection. */
  #render(): void {
    const single = this.#mode === 'single';
    const enabled = this.#buttons.filter((button) => !button.disabled);
    const pressed = (button: HTMLButtonElement) => this.#model.has(button.value);
    const stop =
      (!single && this.#last && enabled.includes(this.#last) ? this.#last : undefined) ??
      enabled.find(pressed) ??
      enabled[0];
    for (const button of this.#buttons) {
      write(button, 'role', single ? 'radio' : (this.#authored.get(button)?.role ?? null));
      write(button, 'aria-checked', single ? String(pressed(button)) : null);
      write(button, 'aria-pressed', single ? null : String(pressed(button)));
      write(button, 'tabindex', button === stop ? '0' : '-1');
    }
  }

  #buttonFor(event: Event): HTMLButtonElement | undefined {
    return event
      .composedPath()
      .find((node): node is HTMLButtonElement => this.#buttons.includes(node as HTMLButtonElement));
  }

  #press(button: HTMLButtonElement): void {
    if (button.disabled) return;
    const before = this.#model.selected;
    if (this.#mode === 'single') this.#model.select(button.value);
    else this.#model.toggle(button.value);
    this.#requested = undefined;
    this.#last = button;
    const after = this.#model.selected;
    this.#render();
    if (after.length === before.length && after.every((value) => before.includes(value))) return;
    this.emit<PunkSelectionChangeDetail>('punk-selection-change', {
      values: [...after],
      items: this.#buttons.filter((other) => after.includes(other.value)),
    });
  }

  readonly #onClick = (event: MouseEvent): void => {
    const button = this.#buttonFor(event);
    if (button) this.#press(button);
  };

  readonly #onFocusIn = (event: FocusEvent): void => {
    const button = this.#buttonFor(event);
    if (!button || this.#mode === 'single') return;
    this.#last = button;
    this.#render();
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const button = this.#buttonFor(event);
    if (!button || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    const from = this.#buttons.indexOf(button);
    const to = nextRovingIndex(
      event.key,
      from,
      this.#buttons.map((other) => other.disabled),
      { orientation: vertical ? 'vertical' : 'horizontal', rtl: this.matches(':dir(rtl)') },
    );
    const target = this.#buttons[to];
    if (!target || to === from) return;
    event.preventDefault();
    if (this.#mode === 'single') this.#press(target);
    else this.#last = target;
    this.#render();
    target.focus();
  };

  protected override render() {
    return html`<div
      part="group"
      class="group"
      role=${this.#mode === 'single' ? 'radiogroup' : 'group'}
      aria-label=${ifDefined(this.accessibleLabel ?? undefined)}
      aria-disabled=${ifDefined(this.disabled ? 'true' : undefined)}
    >
      <slot @slotchange=${() => this.#sync()}></slot>
    </div>`;
  }
}
