import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkTextarea } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Log"', inner = ''): Promise<PunkTextarea> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '300px';
  wrapper.innerHTML = `<punk-textarea ${attributes}>${inner}</punk-textarea>`;
  const element = wrapper.firstElementChild as PunkTextarea;
  await element.updateComplete;
  return element;
}

const control = (element: Element) =>
  element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

describe('punk-textarea', () => {
  it('shows the value in a native textarea named by its label, without reflecting it', async () => {
    const element = await mount('label="Log" value="Belt 3"');
    expect(control(element).value).toBe('Belt 3');
    expect(control(element).labels[0]?.textContent).toBe('Log');
    await userEvent.fill(control(element), 'Belt 4\nblocked');
    expect(element.value).toBe('Belt 4\nblocked');
    expect(element.getAttribute('value')).toBe('Belt 3');
  });

  it('sends input from the textarea and change from the host', async () => {
    const element = await mount();
    const events: string[] = [];
    element.addEventListener('input', () => events.push('input'));
    element.addEventListener('change', () => events.push('change'));
    await userEvent.type(control(element), 'ab');
    control(element).blur();
    expect(events).toEqual(['input', 'input', 'change']);
  });

  it('passes the native attributes through and repairs rows', async () => {
    const element = await mount(
      'label="Log" placeholder="Notes" maxlength="20" rows="5" autocomplete="off"',
    );
    expect(control(element).placeholder).toBe('Notes');
    expect(control(element).maxLength).toBe(20);
    expect(control(element).rows).toBe(5);
    expect(control(element).getAttribute('autocomplete')).toBe('off');
    element.rows = 0;
    await element.updateComplete;
    expect(control(element).rows).toBe(1);
    element.rows = Number.NaN;
    await element.updateComplete;
    expect(control(element).rows).toBe(3);
  });

  it('is at least `rows` lines tall', async () => {
    const short = control(await mount('label="Log" rows="2"')).getBoundingClientRect().height;
    const tall = control(await mount('label="Log" rows="6"')).getBoundingClientRect().height;
    expect(tall).toBeGreaterThan(short * 2);
  });

  it('has the native length validity, and stops typing at maxlength', async () => {
    const short = await mount('label="Log" minlength="4"');
    await userEvent.type(control(short), 'ab');
    expect(short.validity.tooShort).toBe(true);
    const capped = await mount('label="Log" maxlength="3"');
    await userEvent.type(control(capped), 'abcdef');
    expect(capped.value).toBe('abc');
  });

  it('shows a count that describes the field, out of maxlength when set', async () => {
    const element = await mount(
      'label="Log" show-count maxlength="40"',
      '<span slot="hint">Short</span>',
    );
    await element.updateComplete;
    expect(part(element, 'count').hidden).toBe(false);
    expect(part(element, 'count').textContent?.trim()).toBe('0/40');
    await userEvent.type(control(element), 'abc');
    expect(part(element, 'count').textContent?.trim()).toBe('3/40');
    expect(control(element).getAttribute('aria-describedby')).toBe('count hint');
    element.maxlength = null;
    element.showCount = false;
    await element.updateComplete;
    expect(part(element, 'count').hidden).toBe(true);
    expect(control(element).getAttribute('aria-describedby')).toBe('hint');
  });

  it('can be dragged taller, and grows with its text instead under autogrow where supported', async () => {
    const element = await mount();
    expect(getComputedStyle(control(element)).resize).toBe('vertical');
    element.autogrow = true;
    await element.updateComplete;
    expect(getComputedStyle(control(element)).resize).toBe('none');
    if (!CSS.supports('field-sizing', 'content')) return;
    const before = control(element).getBoundingClientRect().height;
    await userEvent.fill(control(element), 'a\nb\nc\nd\ne\nf\ng');
    expect(control(element).getBoundingClientRect().height).toBeGreaterThan(before);
  });

  it('warns when it has no name', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('');
    expect(warn).toHaveBeenCalledWith(
      '<punk-textarea> It has no accessible name. Set `label` or `aria-label`.',
    );
  });
});
