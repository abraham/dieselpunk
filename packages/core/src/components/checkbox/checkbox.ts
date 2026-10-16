import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { PunkToggleBase } from '../../internal/toggle-base.ts';
import { checkboxStyles } from './checkbox.styles.ts';

/**
 * A checkbox that takes part in a form: it submits `value` under `name` while it is checked, and a
 * form reset puts `checked` back to what the markup said. Its name is the text in the default
 * slot, or `aria-label`. Space toggles it on key release, and a click on the label does too.
 *
 * It is `role="checkbox"` with `aria-checked`, `aria-required`, and `aria-disabled` written on the
 * host. A click on an `indeterminate` checkbox clears that and toggles `checked`, as a native one
 * does. `indeterminate` is a state for the screen, and is never submitted.
 *
 * @tagname punk-checkbox
 *
 * @slot - The label.
 *
 * @csspart control - The box and the label together, which take the focus ring.
 * @csspart box - The box.
 * @csspart mark - The check mark, or the dash while `indeterminate`.
 * @csspart label - The wrapper around the label.
 *
 * @fires input - The user toggled it. Not sent when `checked` is set from code.
 * @fires change - The user toggled it. Not sent when `checked` is set from code.
 */
export class PunkCheckbox extends PunkToggleBase {
  static override styles = checkboxStyles;

  /** Neither on nor off, for a group that is partly checked. Shown as a dash, and `aria-checked="mixed"`. */
  @property({ type: Boolean, reflect: true }) indeterminate = false;

  protected readonly toggleRole = 'checkbox';

  protected override get checkedState(): string {
    return this.indeterminate ? 'mixed' : super.checkedState;
  }

  protected override beforeToggle(): void {
    this.indeterminate = false;
  }

  protected override render() {
    const disabled = this.isDisabled;
    return html`
      <span
        part="control"
        class=${classMap({
          control: true,
          checked: this.checked && !this.indeterminate,
          mixed: this.indeterminate,
          disabled,
        })}
      >
        <span part="box" class="box"><span part="mark" class="mark"></span></span>
        ${this.renderLabel()}
      </span>
    `;
  }
}
