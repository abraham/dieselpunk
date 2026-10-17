import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkTimeField } from './index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Shift start"'): Promise<PunkTimeField> {
  const wrapper = track(document.createElement('div'));
  wrapper.innerHTML = `<punk-time-field ${attributes}></punk-time-field>`;
  const element = wrapper.firstElementChild as PunkTimeField;
  await element.updateComplete;
  return element;
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;

// Only Chromium has a picker button that can be styled; the others draw their own.
const styledPicker = /Chrome\//.test(navigator.userAgent);

describe('punk-time-field', () => {
  it('is a native time input named by its label, with the value both ways', async () => {
    const element = await mount('label="Shift start" value="06:30"');
    expect(input(element).type).toBe('time');
    expect(input(element).labels?.[0]?.textContent).toBe('Shift start');
    expect(input(element).value).toBe('06:30');
    input(element).value = '22:15';
    input(element).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    expect(element.value).toBe('22:15');
  });

  it('takes seconds with a step below a minute', async () => {
    const element = await mount('label="Shift start" step="1" value="06:30:15"');
    expect(input(element).step).toBe('1');
    expect(element.value).toBe('06:30:15');
    expect(element.validity.valid).toBe(true);
  });

  it('clears a value that is not a time, and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('label="Shift start" value="6.30pm"');
    await element.updateComplete;
    expect(element.value).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('in the form HH:MM, so it is cleared.');
  });

  it('is out of range outside min and max', async () => {
    const element = await mount('label="Shift start" min="06:00" max="18:00" value="05:59"');
    expect(element.validity.rangeUnderflow).toBe(true);
    element.value = '18:01';
    await element.updateComplete;
    expect(element.validity.rangeOverflow).toBe(true);
  });

  // getComputedStyle cannot reach the picker button, so its rule is read from the stylesheet.
  it.runIf(styledPicker)('draws a clock, not the calendar, on its picker button', async () => {
    const element = await mount();
    const rule = (element.shadowRoot?.adoptedStyleSheets ?? [])
      .flatMap((sheet) => [...sheet.cssRules])
      .find(
        (candidate): candidate is CSSStyleRule =>
          candidate instanceof CSSStyleRule &&
          candidate.selectorText.includes('time') &&
          candidate.selectorText.includes('calendar-picker-indicator'),
      );
    expect(input(element).matches("[type='time']")).toBe(true);
    expect(rule?.style.maskImage).toContain('A7');
  });
});
