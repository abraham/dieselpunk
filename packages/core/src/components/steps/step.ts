import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { LocaleWatcher } from '../../internal/locale-watch.ts';
import { msg } from '../../internal/localize.ts';
import { PunkElement } from '../../internal/punk-element.ts';
import { formatNumber, resolveLang } from '../../utilities/locale.ts';
import { stepStyles } from './steps.styles.ts';

export type StepState = 'complete' | 'current' | 'upcoming';

/** Where a step stands in its `punk-steps`: its 0-based index and its state. */
export interface StepPosition {
  index: number;
  state: StepState;
}

/** Set by the steps on each of its steps, and cleared when the step leaves. */
export const position = Symbol();

/**
 * One step of a `punk-steps`: a marker and the step's text. The steps tell it where it stands, so
 * it has no state of its own. A completed step shows a check and says "completed", an upcoming
 * one shows its number and says "not started", and the current one shows its number in a ring and
 * has `aria-current="step"`. The host is a `listitem`.
 *
 * @tagname punk-step
 *
 * @slot - The step's text.
 *
 * @csspart marker - The number, or the check of a completed step.
 * @csspart label - The wrapper around the text.
 * @csspart connector - The line before every step of a `punk-steps` but the first.
 */
export class PunkStep extends PunkElement {
  static override styles = stepStyles;

  /**
   * Where the steps placed it.
   * @internal
   */
  [position]: StepPosition | null = null;
  static {
    // The dev transform gives a decorator on a symbol key no key, so the property is made here.
    this.createProperty(position, { attribute: false });
  }

  readonly #localeWatcher = new LocaleWatcher(this);

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  protected override updated(changed: PropertyValues): void {
    if (!changed.has(position)) return;
    if (this[position]?.state === 'current') this.setAttribute('aria-current', 'step');
    else this.removeAttribute('aria-current');
  }

  #word(state: StepState): string {
    if (state === 'complete') {
      return msg('completed', {
        id: 'stepComplete',
        desc: 'Said after the text of a completed step.',
      });
    }
    if (state === 'upcoming') {
      return msg('not started', {
        id: 'stepUpcoming',
        desc: 'Said after the text of a step that has not been reached.',
      });
    }
    return '';
  }

  protected override render() {
    const place = this[position];
    const state = place?.state ?? 'upcoming';
    const number = place ? formatNumber(place.index + 1, resolveLang(this)) : '';
    const word = this.#word(state);
    return html`${
        place && place.index > 0
          ? html`<span part="connector" class="connector" aria-hidden="true"></span>`
          : ''
      }<span part="marker" class=${classMap({ marker: true, [state]: true })} aria-hidden="true"
        >${state === 'complete' ? html`<span class="check"></span>` : number}</span
      ><span part="label" class=${classMap({ label: true, [state]: true })}><slot></slot></span
      >${word ? html`<span class="visually-hidden"> ${word}</span>` : ''}`;
  }
}
