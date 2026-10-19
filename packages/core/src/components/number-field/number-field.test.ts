import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkNumberField } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Thrust"'): Promise<PunkNumberField> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '300px';
  wrapper.innerHTML = `<punk-number-field ${attributes}></punk-number-field>`;
  const element = wrapper.firstElementChild as PunkNumberField;
  await element.updateComplete;
  return element;
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;
const stepper = (element: Element, which: 'up' | 'down') =>
  element.shadowRoot?.querySelector(`.stepper.${which}`) as HTMLButtonElement;

/** Presses a stepper for a pointer, the way a mouse does: down, then up. */
async function press(element: Element, which: 'up' | 'down'): Promise<void> {
  const target = stepper(element, which);
  target.dispatchEvent(
    new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }),
  );
  target.dispatchEvent(new PointerEvent('pointerup', { button: 0, bubbles: true }));
}

describe('punk-number-field', () => {
  it('is a native number input', async () => {
    const element = await mount('label="Thrust" value="3" min="0" max="10" step="2"');
    expect(input(element).type).toBe('number');
    expect(input(element).value).toBe('3');
    expect(input(element).min).toBe('0');
    expect(input(element).max).toBe('10');
    expect(input(element).step).toBe('2');
    expect(element.valueAsNumber).toBe(3);
  });

  it('reports NaN before it has rendered, and while empty', async () => {
    expect(document.createElement('punk-number-field').valueAsNumber).toBeNaN();
    const element = await mount();
    expect(element.valueAsNumber).toBeNaN();
  });

  it('does not reflect the live value to the attribute', async () => {
    const element = await mount('label="Thrust" value="3"');
    await userEvent.fill(input(element), '7');
    expect(element.value).toBe('7');
    expect(element.getAttribute('value')).toBe('3');
  });

  it('submits the value under its name and puts it back on reset', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = '<punk-number-field label="Thrust" name="t" value="3"></punk-number-field>';
    const element = form.firstElementChild as PunkNumberField;
    await element.updateComplete;
    await userEvent.fill(input(element), '8');
    expect(new FormData(form).get('t')).toBe('8');
    form.reset();
    await element.updateComplete;
    expect(element.value).toBe('3');
    expect(new FormData(form).get('t')).toBe('3');
  });

  it('has the native range, step, and missing-value validity', async () => {
    const element = await mount('label="Thrust" min="0" max="10" step="2" required');
    expect(element.validity.valueMissing).toBe(true);
    element.value = '11';
    await element.updateComplete;
    expect(element.validity.rangeOverflow).toBe(true);
    element.value = '-2';
    await element.updateComplete;
    expect(element.validity.rangeUnderflow).toBe(true);
    element.value = '3';
    await element.updateComplete;
    expect(element.validity.stepMismatch).toBe(true);
    element.value = '4';
    await element.updateComplete;
    expect(element.validity.valid).toBe(true);
  });

  it('steps by the step from a stepper, and keeps the focus on the input', async () => {
    const element = await mount('label="Thrust" value="3" min="1" step="2"');
    const events: string[] = [];
    element.addEventListener('input', () => events.push('input'));
    element.addEventListener('change', () => events.push('change'));
    await press(element, 'up');
    expect(element.value).toBe('5');
    expect(events).toEqual(['input', 'change']);
    await press(element, 'down');
    await press(element, 'down');
    expect(element.value).toBe('1');
    expect(element.shadowRoot?.activeElement).toBe(input(element));
  });

  it('submits the stepped value straight away', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = '<punk-number-field label="Thrust" name="t" value="3"></punk-number-field>';
    const element = form.firstElementChild as PunkNumberField;
    await element.updateComplete;
    await press(element, 'up');
    expect(new FormData(form).get('t')).toBe('4');
  });

  it('stops at the bounds', async () => {
    const element = await mount('label="Thrust" value="9" min="0" max="10" step="2"');
    await press(element, 'up');
    expect(element.value).toBe('10');
    await press(element, 'up');
    expect(element.value).toBe('10');
    element.value = '1';
    await element.updateComplete;
    await press(element, 'down');
    expect(element.value).toBe('0');
  });

  it('steps with the arrow keys', async () => {
    const element = await mount('label="Thrust" value="3"');
    input(element).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(element.value).toBe('4');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(element.value).toBe('2');
  });

  it('steps by a fraction without drifting', async () => {
    const element = await mount('label="Thrust" value="0" step="0.1"');
    for (let i = 0; i < 3; i++) await press(element, 'up');
    expect(element.value).toBe('0.3');
  });

  it('takes any number with step="any", and steps by 1 within the bounds', async () => {
    const element = await mount('label="Rate" value="-0.7" min="-1" max="1.5" step="any"');
    expect(element.step).toBe('any');
    expect(input(element).step).toBe('any');
    expect(warn).not.toHaveBeenCalled();
    await userEvent.fill(input(element), '0.125');
    expect(element.validity.stepMismatch).toBe(false);
    element.value = '-0.7';
    await element.updateComplete;
    await press(element, 'up');
    expect(element.value).toBe('0.3');
    await press(element, 'up');
    expect(element.value).toBe('1.3');
    await press(element, 'up');
    expect(element.value).toBe('1.5');
    element.value = '';
    await element.updateComplete;
    await press(element, 'down');
    expect(element.value).toBe('-1');
  });

  it('repeats while a stepper is held, and sends change once when it is let go', async () => {
    const element = await mount('label="Thrust" value="0"');
    const events: string[] = [];
    element.addEventListener('change', () => events.push('change'));
    await commands.holdPointer('punk-number-field .stepper.up');
    await new Promise((resolve) => setTimeout(resolve, 900));
    await commands.releasePointer();
    expect(element.shadowRoot?.activeElement).toBe(input(element));
    expect(Number(element.value)).toBeGreaterThanOrEqual(4);
    expect(events).toEqual(['change']);
    const after = element.value;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(element.value).toBe(after);
  });

  it('steps once before the delay, and repeats only after it', async () => {
    const element = await mount('label="Thrust" value="0"');
    stepper(element, 'up').dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    stepper(element, 'up').dispatchEvent(
      new PointerEvent('pointerup', { button: 0, bubbles: true }),
    );
    expect(element.value).toBe('1');
  });

  it.each(['pointerleave', 'pointercancel', 'blur'])('stops repeating on %s', async (type) => {
    const element = await mount('label="Thrust" value="0"');
    stepper(element, 'up').dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    (type === 'blur' ? input(element) : stepper(element, 'up')).dispatchEvent(
      new Event(type, { bubbles: false }),
    );
    const frozen = element.value;
    expect(Number(frozen)).toBeGreaterThan(1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(element.value).toBe(frozen);
  });

  it('stops repeating when the element is removed', async () => {
    const element = await mount('label="Thrust" value="0"');
    stepper(element, 'up').dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
    element.remove();
    const frozen = element.value;
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(element.value).toBe(frozen);
  });

  it('ignores a press with another button', async () => {
    const element = await mount('label="Thrust" value="3"');
    stepper(element, 'up').dispatchEvent(
      new PointerEvent('pointerdown', { button: 2, bubbles: true, cancelable: true }),
    );
    expect(element.value).toBe('3');
  });

  it('keeps the steppers out of the tab order and the accessibility tree', async () => {
    const element = await mount();
    for (const which of ['up', 'down'] as const) {
      expect(stepper(element, which).tabIndex).toBe(-1);
      expect(stepper(element, which).getAttribute('aria-hidden')).toBe('true');
    }
    input(element).focus();
    await userEvent.tab();
    expect(element.shadowRoot?.activeElement).not.toBe(stepper(element, 'up'));
  });

  it('removes the steppers with hide-steppers', async () => {
    const element = await mount('label="Thrust" hide-steppers');
    expect(element.shadowRoot?.querySelector<HTMLElement>('.steppers')?.hidden).toBe(true);
    expect(getComputedStyle(element.shadowRoot!.querySelector('.steppers')!).display).toBe('none');
  });

  it('does not step while disabled or readonly', async () => {
    const off = await mount('label="Thrust" value="3" disabled');
    expect(stepper(off, 'up').disabled).toBe(true);
    const readonly = await mount('label="Thrust" value="3" readonly');
    await press(readonly, 'up');
    expect(readonly.value).toBe('3');
  });

  it('repairs a min above max and a step neither above 0 nor any, and warns once', async () => {
    const element = await mount('label="Thrust" min="10" max="0" step="0" value="3"');
    expect(input(element).hasAttribute('min')).toBe(false);
    expect(input(element).hasAttribute('max')).toBe(false);
    expect(input(element).step).toBe('1');
    element.setAttribute('value', '4');
    await element.updateComplete;
    const messages = warn.mock.calls.filter((call) => /repaired/.test(String(call[0])));
    expect(messages).toHaveLength(1);
  });

  it('does not format the number', async () => {
    const element = await mount('label="Thrust" value="1234.5"');
    expect(input(element).value).toBe('1234.5');
  });

  it('draws the placeholder at 4.5:1 on the field in every theme', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      holder.innerHTML = '<punk-number-field label="Thrust" placeholder="0"></punk-number-field>';
      const element = holder.firstElementChild as PunkNumberField;
      await element.updateComplete;
      const field = toHex(
        getComputedStyle(element.shadowRoot!.querySelector('.box')!).backgroundColor,
      );
      const found = ratio(toHex(getComputedStyle(input(element), '::placeholder').color), field);
      if (found < 4.5) problems.push(`${theme}: ${found.toFixed(2)}`);
    }
    expect(problems).toEqual([]);
  });

  it('draws the stepper glyphs in a visible color under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount();
    const glyph = element.shadowRoot!.querySelector('.stepper .glyph') as HTMLElement;
    expect(getComputedStyle(glyph).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('keeps the steppers at least 24px square', async () => {
    const element = await mount();
    for (const which of ['up', 'down'] as const) {
      const rect = stepper(element, which).getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(24);
    }
    const up = stepper(element, 'up').getBoundingClientRect();
    const down = stepper(element, 'down').getBoundingClientRect();
    expect(up.height + down.height).toBeGreaterThanOrEqual(24);
  });
});
