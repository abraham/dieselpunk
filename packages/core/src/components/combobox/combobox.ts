import { html } from 'lit';
import { serverValues } from '../../internal/server-values.ts';
import type { PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { overlayStack } from '../../internal/overlays.ts';
import { computePosition } from '../../utilities/position.ts';
import { devWarn } from '../../utilities/warn.ts';
import { comboboxStyles } from './combobox.styles.ts';

export type ComboboxFilter = 'contains' | 'none';

interface Choice {
  value: string;
  label: string;
  disabled: boolean;
  group: HTMLOptGroupElement | null;
  start: Node[];
  end: Node[];
}

const MARGIN = 8;

const isAffix = (node: Node): boolean =>
  node instanceof Element && (node.slot === 'start' || node.slot === 'end');

/** The `label` attribute, else the option's text without its start and end elements. */
function labelOf(option: HTMLOptionElement): string {
  if (option.hasAttribute('label')) return option.label;
  let text = '';
  for (const node of option.childNodes) {
    if (node.nodeType !== Node.COMMENT_NODE && !isAffix(node)) text += node.textContent;
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * A text field with a list of suggestions to choose from: the APG combobox, with a native
 * `<input role="combobox">` in its shadow tree and a `listbox` of the host's `<option>` children in
 * the top layer below it. Write the options inside it, as in a select; they are read when the list
 * opens, and watched by one observer only while it is open or the user is typing, so an application
 * can replace them as results arrive.
 *
 * `<optgroup label>` groups options under a heading. An element with `slot="start"` or
 * `slot="end"` inside an option, such as an icon or a `punk-badge`, is copied into its row and is
 * not part of its label; the copy is in the shadow tree, so style it inline, with custom
 * properties, or through a `part` it carries.
 *
 * Typing opens the list of options whose label contains the text (with `filter="none"` the
 * application filters by changing the options on `input`). Down and Up open the list and move
 * through it without wrapping, Enter or a click chooses the active option, and Escape closes the
 * list and leaves the text. Leaving the field keeps a choice: the text becomes the chosen option's
 * label, or with `allow-custom` the text itself is the value. `change` is sent once for each value
 * the user commits.
 *
 * It takes part in a form: it submits `value` under `name`, and a form reset puts back the
 * `value` attribute. `label` is its name, else `aria-label`, else a `<label for>` pointing at it.
 *
 * @tagname punk-combobox
 *
 * @slot hint - Help below the field. It describes the field for assistive technology.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart toggle - The button that opens and closes the list with a pointer.
 * @csspart listbox - The list of options.
 * @csspart option - Each option in the list.
 * @csspart group - Each `<optgroup>`'s options.
 * @csspart group-label - The heading of a group.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @cssprop [--punk-combobox-max-height=240px] - The tallest the list gets before it scrolls.
 *
 * @fires input - The user typed. Sent by the native input and crossing the shadow boundary.
 * @fires change - The user committed a value, by choosing an option or, with `allow-custom`, by leaving the field.
 */
export class PunkCombobox extends PunkFieldBase {
  static override styles = comboboxStyles;

  /** The chosen option's value, or the text with `allow-custom`. The attribute is the default a form reset goes back to. */
  @property() value = '';

  /** Shown while the field is empty. It is not a name. */
  @property({ reflect: true }) placeholder = '';

  /** Lets the value be any text, not only an option's value. */
  @property({ type: Boolean, reflect: true, attribute: 'allow-custom' }) allowCustom = false;

  /** `contains` shows the options whose label contains the text; `none` shows them all, for an application that filters. Unknown values use `contains`. */
  @property({ reflect: true }) filter: ComboboxFilter = 'contains';

  /** Whether the list is showing. */
  @state() protected expanded = false;

  @state() private text: string | null = null;
  @state() private active = -1;

  #observer: MutationObserver | undefined;
  #stopOpenWork: (() => void) | undefined;
  #warnedEmpty = false;
  #copies = new WeakMap<Element, Node>();
  /** The input's text after the last render, to tell typing the input handler has not seen yet. */
  #rendered = '';

  constructor() {
    super();
    this.addEventListener('focusout', this.#onFocusOut);
  }

  // The server has no children (specs/ssr.md §3).
  get #choices(): Choice[] {
    if (serverValues()) return [];
    return [...this.querySelectorAll('option')].map((option) => {
      const group =
        option.parentElement instanceof HTMLOptGroupElement ? option.parentElement : null;
      return {
        value: option.value,
        label: labelOf(option),
        disabled: option.disabled || !!group?.disabled,
        group,
        start: this.#copy(option, 'start'),
        end: this.#copy(option, 'end'),
      };
    });
  }

  /** Copies of an option's `slot` elements, made once for each element. */
  #copy(option: HTMLOptionElement, slot: string): Node[] {
    return [...option.children]
      .filter((child) => child.slot === slot)
      .map((child) => {
        let copy = this.#copies.get(child);
        if (!copy) this.#copies.set(child, (copy = child.cloneNode(true)));
        return copy;
      });
  }

  /** The options the list shows for the current text. */
  get #shown(): Choice[] {
    const choices = this.#choices;
    const text = (this.text ?? '').trim().toLocaleLowerCase();
    if (this.filter === 'none' || this.text === null || !text) return choices;
    return choices.filter((choice) => choice.label.toLocaleLowerCase().includes(text));
  }

  /** What the input shows: the text being typed, else the chosen option's label, else the value. */
  get #display(): string {
    if (this.text !== null) return this.text;
    return this.#choices.find((choice) => choice.value === this.value)?.label ?? this.value;
  }

  protected override formValue(): FormValue {
    return this.value;
  }

  protected override resetToDefault(): void {
    this.value = this.getAttribute('value') ?? '';
    this.text = null;
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
    this.text = null;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#setExpanded(false);
    this.#observer?.disconnect();
  }

  // A listener that runs before the input's own, and changes the options, renders before this one
  // has taken the text. Without this, that render would put back the previous text.
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const control = this.renderRoot?.querySelector<HTMLInputElement>('.control');
    if (control && control.value !== this.#rendered) this.text = control.value;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#rendered = this.renderRoot.querySelector<HTMLInputElement>('.control')?.value ?? '';
    if (changed.has('expanded') || (this.expanded && changed.has('text'))) this.#reposition();
    if (this.expanded && changed.has('active')) {
      this.renderRoot.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
    }
    if (!this.#warnedEmpty && this.#choices.length === 0 && document.readyState !== 'loading') {
      this.#warnedEmpty = true;
      devWarn(this, 'It has no options. Put `<option>` elements inside it.');
    }
  }

  // The list

  #setExpanded(on: boolean): void {
    if (on === this.expanded) return;
    this.expanded = on;
    const list = this.renderRoot?.querySelector<HTMLElement>('.listbox');
    if (on) {
      if (list && typeof list.showPopover === 'function') list.showPopover();
      this.#startOpenWork();
    } else {
      this.#stopOpenWork?.();
      this.#stopOpenWork = undefined;
      if (list?.matches(':popover-open')) list.hidePopover();
      this.active = -1;
    }
  }

  #open(active: 'first' | 'last' | 'chosen' | 'none'): void {
    const shown = this.#shown;
    if (shown.length === 0) return this.#setExpanded(false);
    this.#setExpanded(true);
    const enabled = shown
      .map((choice, index) => (choice.disabled ? -1 : index))
      .filter((i) => i >= 0);
    const chosen = shown.findIndex((choice) => choice.value === this.value && !choice.disabled);
    this.active =
      active === 'first'
        ? (enabled[0] ?? -1)
        : active === 'last'
          ? (enabled.at(-1) ?? -1)
          : active === 'chosen'
            ? chosen >= 0
              ? chosen
              : (enabled[0] ?? -1)
            : -1;
  }

  #observe(): void {
    (this.#observer ??= new MutationObserver(this.#onOptionsChange)).observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'label', 'slot'],
    });
  }

  /** While the user types and no option shows, waits for the options the application adds. */
  #wait(): void {
    if (!this.expanded && this.text !== null) this.#observe();
  }

  readonly #onOptionsChange = (): void => {
    this.requestUpdate();
    if (!this.expanded) {
      if (this.text === null) this.#observer?.disconnect();
      else this.#open('none');
    } else if (this.#shown.length === 0) {
      this.#setExpanded(false);
      this.#wait();
    }
  };

  /** Work that exists only while the list shows: the Escape entry, the observer, and repositioning. */
  #startOpenWork(): void {
    const entry = { dismissible: true, close: () => this.#setExpanded(false) };
    let frame = 0;
    const schedule = (): void => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        this.#reposition();
      });
    };
    this.#observe();
    overlayStack.push(entry);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    this.#stopOpenWork = () => {
      overlayStack.remove(entry);
      this.#observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }

  #reposition(): void {
    const box = this.renderRoot.querySelector<HTMLElement>('.box');
    const list = this.renderRoot.querySelector<HTMLElement>('.listbox');
    if (!this.expanded || !box || !list) return;
    const anchor = box.getBoundingClientRect();
    list.style.inlineSize = `${anchor.width}px`;
    const size = list.getBoundingClientRect();
    const result = computePosition({
      anchor,
      surface: { width: size.width, height: size.height },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      },
      placement: 'bottom',
      offset: 2,
      margin: MARGIN,
      rtl: false,
    });
    list.style.left = `${result.left}px`;
    list.style.top = `${result.top}px`;
  }

  // Choosing

  /** Makes `value` the value, as the user did, and sends `change` if it changed. */
  #commit(value: string): void {
    this.text = null;
    if (value === this.value) return;
    this.value = value;
    this.commit();
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #choose(index: number): void {
    const choice = this.#shown[index];
    if (!choice || choice.disabled) return;
    this.#setExpanded(false);
    this.#commit(choice.value);
  }

  /** What leaving the field, or Enter with nothing active, keeps. */
  #settle(): void {
    if (this.text === null) return;
    const text = this.text.trim();
    if (this.allowCustom) return this.#commit(this.text);
    const match = this.#choices.find(
      (choice) => !choice.disabled && choice.label.toLocaleLowerCase() === text.toLocaleLowerCase(),
    );
    if (match) this.#commit(match.value);
    else if (!text) this.#commit('');
    else this.text = null;
  }

  // Events

  readonly #onInput = (event: Event): void => {
    this.text = (event.target as HTMLInputElement).value;
    if (this.allowCustom) {
      this.value = this.text;
      this.commit();
    }
    this.#open('none');
    this.#wait();
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey) return;
    const shown = this.#shown;
    const step = (from: number, by: 1 | -1): number => {
      for (let index = from + by; index >= 0 && index < shown.length; index += by) {
        if (!shown[index]?.disabled) return index;
      }
      return from;
    };
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.expanded) this.#open(event.altKey ? 'none' : 'chosen');
        else if (!event.altKey) this.active = step(this.active, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) this.#setExpanded(false);
        else if (!this.expanded) this.#open('last');
        else if (this.active >= 0) this.active = step(this.active, -1);
        break;
      case 'Enter':
        if (!this.expanded) return this.#settle();
        event.preventDefault();
        if (this.active >= 0) this.#choose(this.active);
        else {
          this.#setExpanded(false);
          this.#settle();
        }
        break;
    }
  };

  readonly #onFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && this.shadowRoot?.contains(event.relatedTarget))
      return;
    this.#setExpanded(false);
    this.#observer?.disconnect();
    this.#settle();
  };

  readonly #onToggle = (): void => {
    if (this.isDisabled) return;
    if (this.expanded) this.#setExpanded(false);
    else this.#open('chosen');
    this.focus();
  };

  // A press on the list keeps focus in the field, so it does not blur and close first.
  readonly #keepFocus = (event: Event): void => event.preventDefault();

  #renderOption(choice: Choice, index: number): TemplateResult {
    return html`<div
      part="option"
      class="option"
      id="option-${index}"
      role="option"
      aria-selected=${String(choice.value === this.value)}
      aria-disabled=${ifDefined(choice.disabled ? 'true' : undefined)}
      ?data-active=${index === this.active}
      @click=${() => this.#choose(index)}
    >
      ${choice.start.length ? html`<span class="start">${choice.start}</span>` : ''}
      <span class="text">${choice.label}</span>
      ${choice.end.length ? html`<span class="end">${choice.end}</span>` : ''}
    </div>`;
  }

  /** The shown options, with each run of one `<optgroup>`'s options in a group under its label. */
  #renderOptions(): unknown[] {
    const runs: { group: HTMLOptGroupElement | null; rows: TemplateResult[] }[] = [];
    this.#shown.forEach((choice, index) => {
      const row = this.#renderOption(choice, index);
      const last = runs.at(-1);
      if (last && last.group === choice.group) last.rows.push(row);
      else runs.push({ group: choice.group, rows: [row] });
    });
    return runs.map(({ group, rows }) =>
      group
        ? html`<div part="group" class="group" role="group" aria-label=${group.label}>
            <div part="group-label" class="group-label" aria-hidden="true">${group.label}</div>
            ${rows}
          </div>`
        : rows,
    );
  }

  protected override render() {
    const aria = this.ariaBindings();
    const disabled = this.isDisabled;
    return this.renderField({
      affixes: false,
      control: html`<input
        part="control"
        class="control"
        id="control"
        role="combobox"
        autocomplete="off"
        aria-autocomplete=${this.filter === 'none' ? 'none' : 'list'}
        aria-expanded=${String(this.expanded)}
        aria-controls="listbox"
        aria-activedescendant=${ifDefined(this.active >= 0 ? `option-${this.active}` : undefined)}
        .value=${live(this.#display)}
        placeholder=${ifDefined(this.placeholder || undefined)}
        ?disabled=${disabled}
        ?required=${this.required}
        aria-label=${aria.label}
        aria-describedby=${aria.describedby}
        aria-invalid=${aria.invalid}
        @input=${this.#onInput}
        @keydown=${this.#onKeyDown}
      />`,
      after: html`<button
          part="toggle"
          class="toggle"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          ?disabled=${disabled}
          @pointerdown=${this.#keepFocus}
          @click=${this.#onToggle}
        ></button>
        <div
          part="listbox"
          class=${this.expanded ? 'listbox open' : 'listbox'}
          id="listbox"
          role="listbox"
          popover="manual"
          aria-label=${ifDefined(this.resolveName(this.label) ?? undefined)}
          @pointerdown=${this.#keepFocus}
        >
          ${this.#renderOptions()}
        </div>`,
    });
  }
}
