import { commands } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkDateField } from './index.ts';

beforeEach(() => {
  addStylesheets();
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(
  attributes = 'label="Delivery"',
  parent?: HTMLElement,
): Promise<PunkDateField> {
  const wrapper = parent ?? track(document.createElement('div'));
  if (!parent) wrapper.style.inlineSize = '300px';
  wrapper.insertAdjacentHTML('beforeend', `<punk-date-field ${attributes}></punk-date-field>`);
  const element = wrapper.lastElementChild as PunkDateField;
  await element.updateComplete;
  return element;
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;

/** The style rules of the element's own stylesheets that style the picker button. */
function pickerRules(element: Element): CSSStyleRule[] {
  const all = (rules: CSSRuleList): CSSRule[] =>
    [...rules].flatMap((rule) => (rule instanceof CSSMediaRule ? [...all(rule.cssRules)] : [rule]));
  return (element.shadowRoot?.adoptedStyleSheets ?? [])
    .flatMap((sheet) => all(sheet.cssRules))
    .filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && rule.selectorText.includes('calendar-picker-indicator'),
    );
}

/** Changes the date as a user would. */
function choose(element: PunkDateField, value: string): void {
  input(element).value = value;
  input(element).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input(element).dispatchEvent(new Event('change', { bubbles: true }));
}

// Only Chromium has a picker button that can be styled; the others draw their own.
const styledPicker = /Chrome\//.test(navigator.userAgent);

describe('punk-date-field', () => {
  it('is a native date input named by its label', async () => {
    const element = await mount();
    expect(input(element).type).toBe('date');
    expect(input(element).labels?.[0]?.textContent).toBe('Delivery');
  });

  it('shows the value attribute and the value property in the native input', async () => {
    const element = await mount('label="Delivery" value="2025-03-14"');
    expect(input(element).value).toBe('2025-03-14');
    element.value = '2026-01-02';
    await element.updateComplete;
    expect(input(element).value).toBe('2026-01-02');
    expect(element.getAttribute('value')).toBe('2025-03-14');
  });

  it('passes min, max, step, readonly, and autocomplete through', async () => {
    const element = await mount(
      'label="Delivery" min="2025-01-01" max="2025-12-31" step="7" readonly autocomplete="bday"',
    );
    const native = input(element);
    // Firefox's autocomplete property is empty for date inputs, so read the attribute.
    expect([
      native.min,
      native.max,
      native.step,
      native.readOnly,
      native.getAttribute('autocomplete'),
    ]).toEqual(['2025-01-01', '2025-12-31', '7', true, 'bday']);
  });

  it('takes the user value, sends input and a change from the host, and nothing for script', async () => {
    const element = await mount();
    const events: string[] = [];
    element.addEventListener('input', () => events.push('input'));
    element.addEventListener('change', () => events.push('change'));
    choose(element, '2025-06-01');
    expect(element.value).toBe('2025-06-01');
    expect(events).toEqual(['input', 'change']);
    element.value = '2025-07-01';
    await element.updateComplete;
    expect(events).toEqual(['input', 'change']);
  });

  it('clears a value that is not a date, and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('label="Delivery" value="14/03/2025"');
    await element.updateComplete;
    expect(element.value).toBe('');
    expect(input(element).value).toBe('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '<punk-date-field> "14/03/2025" is not a value in the form YYYY-MM-DD, so it is cleared.',
    );
    element.value = '2025-03-14';
    await element.updateComplete;
    expect(element.value).toBe('2025-03-14');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is out of range below min and above max, and says so once touched', async () => {
    const element = await mount(
      'label="Delivery" min="2025-01-01" max="2025-01-31" value="2024-12-31"',
    );
    expect(element.validity.rangeUnderflow).toBe(true);
    element.value = '2025-02-01';
    await element.updateComplete;
    expect(element.validity.rangeOverflow).toBe(true);
    expect(element.shadowRoot?.querySelector('[part="message"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    element.reportValidity();
    await element.updateComplete;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('[part="message"]')?.hasAttribute('hidden')).toBe(
      false,
    );
    expect(input(element).getAttribute('aria-invalid')).toBe('true');
  });

  // getComputedStyle cannot reach the picker button, so its rules are read from the stylesheet.
  it.runIf(styledPicker)(
    'draws the picker button in the text color, and in ButtonText under forced colors',
    async () => {
      const element = await mount();
      const rules = pickerRules(element);
      const plain = rules.find((rule) => !rule.parentRule && !rule.selectorText.includes('time'));
      expect(plain?.style.backgroundColor).toBe('currentcolor');
      expect(plain?.style.maskImage).toContain('svg');
      const forced = rules.find((rule) => rule.parentRule instanceof CSSMediaRule);
      expect((forced?.parentRule as CSSMediaRule).conditionText).toContain('forced-colors');
      expect(forced?.style.backgroundColor.toLowerCase()).toBe('buttontext');
    },
  );

  it('fits a narrow container', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '187px';
    await mount('label="Lieferdatum für die nächste Schicht" value="2025-03-14"', holder);
    expect(holder.scrollWidth).toBeLessThanOrEqual(188);
  });
});
