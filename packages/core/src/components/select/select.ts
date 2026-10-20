import { html } from 'lit';
import { serverValues } from '../../internal/server-values.ts';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { devWarn } from '../../utilities/warn.ts';
import { selectStyles } from './select.styles.ts';

interface OptionData {
  value: string;
  label: string;
  disabled: boolean;
}

interface GroupData {
  group: true;
  label: string;
  disabled: boolean;
  options: OptionData[];
}

const describe = (option: HTMLOptionElement): OptionData => ({
  value: option.value,
  label: option.label,
  disabled: option.disabled,
});

/**
 * A single choice from a list, with a native `<select>` in its shadow tree. Write `<option>` and
 * `<optgroup>` elements inside it: they are copied into the native select, and kept current by one
 * observer on the host, which goes with the element. The open list is the platform's and cannot be
 * themed; the closed control is.
 *
 * The options you wrote stay the source of truth: the user's choice is written to the `selected`
 * property of the option, `value` and `selectedIndex` read it, and a form reset puts back each
 * option's `selected` attribute. Without a selected option it is the first enabled one. It takes
 * part in a form: it submits the chosen option's value under `name`, and a `required` select whose
 * first option has an empty value and is the chosen one is missing a value, which is how a
 * placeholder option works.
 *
 * `label` is the name, then `aria-label`, then the text of a `<label for>` pointing at the host. A
 * select with no options warns once.
 *
 * @tagname punk-select
 *
 * @slot hint - Help below the field. It describes the field for assistive technology.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native select.
 * @csspart arrow - The arrow at the end of the field.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user chose an option. Sent by the native select and crossing the shadow boundary.
 * @fires change - The user chose an option, from the host.
 */
export class PunkSelect extends PunkFieldBase {
  static override styles = selectStyles;

  static override properties: PropertyDeclarations = {
    value: { noAccessor: true },
  };

  #observer: MutationObserver | undefined;
  #requested: string | null = null;
  #cleared = false;
  #warnedEmpty = false;

  /** The value of the chosen option, or an empty string when none is. Set it to choose the option with that value. */
  get value(): string {
    return this.#options[this.selectedIndex]?.value ?? '';
  }

  set value(next: string) {
    const previous = this.value;
    this.#requested = String(next);
    this.#applyRequested();
    this.requestUpdate('value', previous);
  }

  /** The index of the chosen option among all of them, or -1 when none is chosen. */
  get selectedIndex(): number {
    const options = this.#options;
    const index = options.findIndex((option) => option.selected);
    if (index >= 0) return index;
    return this.#cleared ? -1 : options.findIndex((option) => !option.disabled);
  }

  set selectedIndex(index: number) {
    this.#requested = null;
    this.#choose(index);
  }

  // The server has no children (specs/ssr.md §3).
  get #options(): HTMLOptionElement[] {
    return serverValues() ? [] : [...this.querySelectorAll('option')];
  }

  #choose(index: number): void {
    const previous = this.selectedIndex;
    const options = this.#options;
    options.forEach((option, position) => {
      option.selected = position === index;
    });
    this.#cleared = !options[index];
    this.requestUpdate('selectedIndex', previous);
  }

  // A value no option has yet is kept, since the option may be added later.
  #applyRequested(): void {
    if (this.#requested === null) return;
    const options = this.#options;
    const index = options.findIndex((option) => option.value === this.#requested);
    if (index >= 0) {
      this.#choose(index);
      this.#requested = null;
    } else if (options.length > 0) {
      this.#choose(-1);
    }
  }

  protected override formValue(): FormValue {
    return this.#options[this.selectedIndex]?.value ?? null;
  }

  protected override resetToDefault(): void {
    for (const option of this.#options) option.selected = option.hasAttribute('selected');
    this.#cleared = false;
    this.#requested = null;
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer ??= new MutationObserver(() => this.#sync());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'selected', 'label'],
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  #sync = (): void => {
    this.#applyRequested();
    this.requestUpdate();
  };

  #entries(): Array<OptionData | GroupData> {
    const entries: Array<OptionData | GroupData> = [];
    if (serverValues()) return entries;
    for (const child of this.children) {
      if (child instanceof HTMLOptionElement) entries.push(describe(child));
      else if (child instanceof HTMLOptGroupElement) {
        entries.push({
          group: true,
          label: child.label,
          disabled: child.disabled,
          options: [...child.children].filter((o) => o instanceof HTMLOptionElement).map(describe),
        });
      }
    }
    return entries;
  }

  readonly #onChoose = (event: Event): void => {
    this.selectedIndex = (event.target as HTMLSelectElement).selectedIndex;
    this.commit();
  };

  protected override updated(changed: PropertyValues): void {
    const select = this.control as HTMLSelectElement | null;
    if (select) select.selectedIndex = this.selectedIndex;
    super.updated(changed);
    if (!this.#warnedEmpty && this.#options.length === 0 && document.readyState !== 'loading') {
      this.#warnedEmpty = true;
      devWarn(this, 'It has no options. Put `<option>` elements inside it.');
    }
  }

  protected override render() {
    const aria = this.ariaBindings();
    const option = (data: OptionData) =>
      html`<option value=${data.value} ?disabled=${data.disabled}>${data.label}</option>`;
    return this.renderField({
      control: html`<select
        part="control"
        class="control"
        id="control"
        ?disabled=${this.isDisabled}
        ?required=${this.required}
        aria-label=${aria.label}
        aria-describedby=${aria.describedby}
        aria-invalid=${aria.invalid}
        @input=${this.#onChoose}
        @change=${this.forwardChange}
      >
        ${this.#entries().map((entry) =>
          'group' in entry
            ? html`<optgroup label=${entry.label} ?disabled=${entry.disabled}>
                ${entry.options.map(option)}
              </optgroup>`
            : option(entry),
        )}
      </select>`,
      after: html`<span part="arrow" class="arrow" aria-hidden="true"></span>`,
    });
  }
}
