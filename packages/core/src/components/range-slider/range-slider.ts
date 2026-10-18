import { LitElement, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { PunkFormControl } from '../../internal/form-control.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import {
  formatValue,
  keyToValue,
  normalizeRange,
  ratioOf,
  snapValue,
  valueFromPointer,
} from '../../internal/slider-math.ts';
import { resolveLang } from '../../utilities/locale.ts';
import { devWarn } from '../../utilities/warn.ts';
import { rangeSliderStyles } from './range-slider.styles.ts';

// The knob's width, repeated from `--_knob` in the styles, so a press does not read it again.
const KNOB = 20;

type End = 'low' | 'high';

interface Drag {
  pointerId: number;
  end: End;
  left: number;
  width: number;
  from: [number, number];
  rtl: boolean;
}

/**
 * A low and a high value chosen on one track, each with its own thumb. The thumbs are two
 * `role="slider"` elements in a group named by `label` (or `aria-label`), each named by the
 * localized "Minimum" or "Maximum", with its value and range, and the formatted number as
 * `aria-valuetext`. A thumb cannot pass the other, so its range ends at the other's value.
 *
 * The values are always inside the range and on a step, with the slider's arithmetic and keys.
 * A press on the track moves the nearer thumb there, and a drag follows the pointer. It takes
 * part in a form: it submits `low` and then `high` under `name`, and a form reset puts both back
 * to what the markup said.
 *
 * @tagname punk-range-slider
 *
 * @csspart header - The row with the label and the values.
 * @csspart label - The label.
 * @csspart value - The values shown beside the label, with `show-value`.
 * @csspart track - The trough.
 * @csspart fill - The part of the trough between the thumbs.
 * @csspart thumb - Each thumb.
 *
 * @fires input - A value is changing, from the keyboard or the pointer. Not sent when `low` or `high` is set from code.
 * @fires change - A key press or a drag ended with a different value. Not sent when `low` or `high` is set from code.
 */
export class PunkRangeSlider extends PunkFormControl {
  static override styles = rangeSliderStyles;

  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /** The smallest value. */
  @property({ type: Number, reflect: true }) min = 0;

  /** The largest value. A `max` that is not a whole number of steps from `min` is never reached. */
  @property({ type: Number, reflect: true }) max = 100;

  /** The distance between values, above 0. */
  @property({ type: Number, reflect: true }) step = 1;

  /** Shows both values beside the label. */
  @property({ type: Boolean, reflect: true, attribute: 'show-value' }) showValue = false;

  /** The name of the group, and the text above it. Without it, use `aria-label`. */
  @property({ reflect: true }) label = '';

  readonly #localeWatcher = new LocaleWatcher(this);
  #low = Number.NaN;
  #high = Number.NaN;
  #drag: Drag | null = null;
  #warnedRange = false;

  get #range() {
    return normalizeRange({ min: this.min, max: this.max, step: this.step });
  }

  /** The low value, on a step and no higher than `high`. The `low` attribute is the default a form reset goes back to. Without one it is `min`. */
  @property({ type: Number, noAccessor: true })
  get low(): number {
    const range = this.#range;
    const low = Number.isNaN(this.#low) ? range.min : snapValue(this.#low, range);
    return Math.min(low, this.#highOf(range));
  }

  set low(next: number) {
    const previous = this.low;
    this.#low = Number(next);
    this.requestUpdate('low', previous);
  }

  /** The high value, on a step and no lower than `low`. The `high` attribute is the default a form reset goes back to. Without one it is `max`, or the last step below it. */
  @property({ type: Number, noAccessor: true })
  get high(): number {
    return this.#highOf(this.#range);
  }

  set high(next: number) {
    const previous = this.high;
    this.#high = Number(next);
    this.requestUpdate('high', previous);
  }

  #highOf(range: ReturnType<typeof normalizeRange>): number {
    return Number.isNaN(this.#high) ? snapValue(range.max, range) : snapValue(this.#high, range);
  }

  /** Focuses the low thumb. */
  override focus(options?: FocusOptions): void {
    this.renderRoot?.querySelector<HTMLElement>('[data-end="low"]')?.focus(options);
  }

  protected override formValue(): FormValue {
    if (!this.name) return null;
    const data = new FormData();
    data.append(this.name, String(this.low));
    data.append(this.name, String(this.high));
    return data;
  }

  protected override resetToDefault(): void {
    const low = this.getAttribute('low');
    const high = this.getAttribute('high');
    this.#low = low === null ? Number.NaN : Number(low);
    this.#high = high === null ? Number.NaN : Number(high);
    this.requestUpdate();
  }

  protected override restoreState(state: FormValue): void {
    const [low, high] = state instanceof FormData ? [...state.values()] : [];
    this.#low = typeof low === 'string' ? Number(low) : Number.NaN;
    this.#high = typeof high === 'string' ? Number(high) : Number.NaN;
    this.requestUpdate();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.#range.repaired && !this.#warnedRange) {
      this.#warnedRange = true;
      devWarn(
        this,
        '`min`, `max`, and `step` are not a usable range, so 0 to 100 in steps of 1 is used where they are not.',
      );
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.warnIfUnnamed(this.resolveName(this.label));
  }

  get #lang(): string | undefined {
    return resolveLang(this);
  }

  /** Sets one end for the user, and tells the page. Returns whether it changed. */
  #change(end: End, next: number): boolean {
    const bounded = end === 'low' ? Math.min(next, this.high) : Math.max(next, this.low);
    if (bounded === this[end]) return false;
    this[end] = bounded;
    this.commit();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    return true;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (this.isDisabled || event.altKey || event.ctrlKey || event.metaKey) return;
    const end = (event.currentTarget as HTMLElement).dataset['end'] as End;
    const next = keyToValue(event.key, this[end], this.#range, this.matches(':dir(rtl)'));
    if (next === null) return;
    event.preventDefault();
    if (this.#change(end, next)) this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (this.isDisabled || event.button !== 0 || this.#drag) return;
    const area = event.currentTarget as HTMLElement;
    // The one layout read of a drag: every move after this is arithmetic on it.
    const rect = area.getBoundingClientRect();
    const track = { left: rect.left + KNOB / 2, width: rect.width - KNOB };
    const rtl = this.matches(':dir(rtl)');
    const at = valueFromPointer(event.clientX, track, this.#range, rtl);
    const { low, high } = this;
    // The nearer thumb moves. Two thumbs at one value part toward the press, and at `max` the low
    // one moves, since the high one cannot.
    const top = snapValue(this.#range.max, this.#range);
    const end: End =
      low === high
        ? at < low || (at === low && high === top)
          ? 'low'
          : 'high'
        : at <= low || (at < high && at - low <= high - at)
          ? 'low'
          : 'high';
    event.preventDefault();
    this.renderRoot
      .querySelector<HTMLElement>(`[data-end="${end}"]`)
      ?.focus({ preventScroll: true });
    area.setPointerCapture(event.pointerId);
    this.#drag = { pointerId: event.pointerId, end, ...track, from: [low, high], rtl };
    this.#change(end, at);
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (drag?.pointerId !== event.pointerId) return;
    this.#change(drag.end, valueFromPointer(event.clientX, drag, this.#range, drag.rtl));
  };

  readonly #onPointerEnd = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    this.#drag = null;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    if (this.low !== drag.from[0] || this.high !== drag.from[1]) {
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  #thumb(end: End, value: number, low: number, high: number) {
    const range = this.#range;
    const name =
      end === 'low'
        ? msg('Minimum', {
            id: 'rangeMinimum',
            desc: 'The name of the thumb that sets the low end of a range.',
          })
        : msg('Maximum', {
            id: 'rangeMaximum',
            desc: 'The name of the thumb that sets the high end of a range.',
          });
    return html`<div
      part="thumb"
      class="thumb"
      data-end=${end}
      role="slider"
      tabindex=${this.isDisabled ? nothing : 0}
      aria-label=${name}
      aria-valuemin=${end === 'low' ? range.min : low}
      aria-valuemax=${end === 'low' ? high : snapValue(range.max, range)}
      aria-valuenow=${value}
      aria-valuetext=${formatValue(value, this.#lang)}
      aria-disabled=${this.isDisabled ? 'true' : 'false'}
      style=${styleMap({ '--_ratio': String(ratioOf(value, range)) })}
      @keydown=${this.#onKeyDown}
    ></div>`;
  }

  protected override render() {
    const range = this.#range;
    const { low, high } = this;
    const lang = this.#lang;
    const name = this.resolveName(this.label);
    return html`
      <div
        class=${classMap({ slider: true, disabled: this.isDisabled })}
        role="group"
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        aria-labelledby=${this.label ? 'label' : nothing}
        aria-label=${!this.label && name ? name : nothing}
      >
        <div part="header" class="header" ?hidden=${!this.label && !this.showValue}>
          <span part="label" class="label" id="label" ?hidden=${!this.label}>${this.label}</span>
          <span part="value" class="value" aria-hidden="true" ?hidden=${!this.showValue}
            >${formatValue(low, lang)} – ${formatValue(high, lang)}</span
          >
        </div>
        <div
          class="area"
          style=${styleMap({
            '--_low': String(ratioOf(low, range)),
            '--_high': String(ratioOf(high, range)),
          })}
          @pointerdown=${this.#onPointerDown}
          @pointermove=${this.#onPointerMove}
          @pointerup=${this.#onPointerEnd}
          @pointercancel=${this.#onPointerEnd}
        >
          <div part="track" class="track"><div part="fill" class="fill"></div></div>
          ${this.#thumb('low', low, low, high)} ${this.#thumb('high', high, low, high)}
        </div>
      </div>
    `;
  }
}
