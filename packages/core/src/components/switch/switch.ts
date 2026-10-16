import { html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { PunkToggleBase } from '../../internal/toggle-base.ts';
import { switchStyles } from './switch.styles.ts';

/**
 * An on and off switch that takes part in a form: it submits `value` under `name` while it is on,
 * and a form reset puts `checked` back to what the markup said. Its name is the text in the
 * default slot, or `aria-label`. Space toggles it on key release, Enter toggles it, and a click on
 * the label does too.
 *
 * It is `role="switch"` with `aria-checked`, `aria-required`, and `aria-disabled` written on the
 * host. On is the thumb at the end of the track with a bar on it, and off is the thumb at the start
 * with a ring, so the state is never only a color.
 *
 * @tagname punk-switch
 *
 * @slot - The label.
 *
 * @csspart control - The track and the label together, which take the focus ring.
 * @csspart track - The track.
 * @csspart thumb - The thumb that slides along the track.
 * @csspart mark - The bar on the thumb while on, and the ring while off.
 * @csspart label - The wrapper around the label.
 *
 * @fires input - The user toggled it. Not sent when `checked` is set from code.
 * @fires change - The user toggled it. Not sent when `checked` is set from code.
 */
export class PunkSwitch extends PunkToggleBase {
  static override styles = switchStyles;

  protected readonly toggleRole = 'switch';
  protected override readonly toggleOnEnter = true;

  protected override render() {
    return html`
      <span
        part="control"
        class=${classMap({ control: true, on: this.checked, disabled: this.isDisabled })}
      >
        <span part="track" class="track"
          ><span part="thumb" class="thumb"><span part="mark" class="mark"></span></span
        ></span>
        ${this.renderLabel()}
      </span>
    `;
  }
}
