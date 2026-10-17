import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkCombobox } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const options = `
  <option value="fe">Iron plate</option>
  <option value="cu">Copper plate</option>
  <option value="st" disabled>Steel plate</option>
  <option value="gear">Iron gear</option>
`;

async function mount(attributes = 'label="Item" name="item"', inner = options) {
  const form = track(document.createElement('form'));
  form.innerHTML = `<punk-combobox ${attributes}>${inner}</punk-combobox><button type="button">After</button>`;
  const element = form.firstElementChild as PunkCombobox;
  await element.updateComplete;
  return { form, element };
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;
const shownOptions = (element: Element) =>
  [...(element.shadowRoot?.querySelectorAll('[role="option"]') ?? [])].map((option) =>
    option.textContent?.trim(),
  );

describe('semantics', () => {
  it('is a combobox named by its label, controlling a listbox, collapsed at first', async () => {
    const { element } = await mount();
    const box = page.getByRole('combobox', { name: 'Item' }).element();
    expect(box).toBe(input(element));
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(box.getAttribute('aria-controls')).toBe('listbox');
    expect(box.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('shows the chosen option label for a value', async () => {
    const { element } = await mount('label="Item" value="cu"');
    expect(input(element).value).toBe('Copper plate');
    element.value = 'gear';
    await element.updateComplete;
    expect(input(element).value).toBe('Iron gear');
  });
});

describe('typing and choosing', () => {
  it('filters by what is typed, moves with the arrows, and chooses with Enter', async () => {
    const { element, form } = await mount();
    const changes: string[] = [];
    element.addEventListener('change', () => changes.push(element.value));
    await userEvent.type(input(element), 'iron');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-expanded')).toBe('true');
    expect(shownOptions(element)).toEqual(['Iron plate', 'Iron gear']);
    expect(input(element).hasAttribute('aria-activedescendant')).toBe(false);
    await userEvent.keyboard('{ArrowDown}');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-activedescendant')).toBe('option-0');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-activedescendant')).toBe('option-1');
    await userEvent.keyboard('{Enter}');
    await element.updateComplete;
    expect(element.value).toBe('gear');
    expect(input(element).value).toBe('Iron gear');
    expect(input(element).getAttribute('aria-expanded')).toBe('false');
    expect(new FormData(form).get('item')).toBe('gear');
    expect(changes).toEqual(['gear']);
  });

  it('skips disabled options, and chooses with a click without losing focus', async () => {
    const { element } = await mount();
    input(element).focus();
    await userEvent.keyboard('{ArrowDown}');
    await element.updateComplete;
    expect(shownOptions(element)).toHaveLength(4);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-activedescendant')).toBe('option-3');
    const copper = element.shadowRoot?.querySelector('#option-1') as HTMLElement;
    await userEvent.click(copper);
    await element.updateComplete;
    expect(element.value).toBe('cu');
    expect(element.shadowRoot?.activeElement).toBe(input(element));
  });

  it('closes on Escape without reaching anything beneath, and keeps the text', async () => {
    const { element } = await mount();
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    await userEvent.type(input(element), 'cop');
    await element.updateComplete;
    await userEvent.keyboard('{Escape}');
    await element.updateComplete;
    document.removeEventListener('keydown', outer);
    expect(input(element).getAttribute('aria-expanded')).toBe('false');
    expect(input(element).value).toBe('cop');
    expect(outer.mock.calls.some(([event]) => (event as KeyboardEvent).key === 'Escape')).toBe(
      false,
    );
  });

  it('keeps an exact label on leaving, and puts back the chosen label otherwise', async () => {
    const { element } = await mount('label="Item" value="fe"');
    await userEvent.fill(input(element), 'copper plate');
    await userEvent.tab();
    await element.updateComplete;
    expect(element.value).toBe('cu');
    await userEvent.fill(input(element), 'tin');
    input(element).focus();
    await userEvent.tab();
    await element.updateComplete;
    expect(element.value).toBe('cu');
    expect(input(element).value).toBe('Copper plate');
  });

  it('takes any text with allow-custom', async () => {
    const { element, form } = await mount('label="Item" name="item" allow-custom');
    await userEvent.fill(input(element), 'Tin plate');
    expect(new FormData(form).get('item')).toBe('Tin plate');
    await userEvent.tab();
    expect(element.value).toBe('Tin plate');
  });

  it('shows every option with filter="none", and follows options the application changes', async () => {
    const { element } = await mount('label="Item" filter="none"');
    await userEvent.type(input(element), 'zzz');
    await element.updateComplete;
    expect(shownOptions(element)).toHaveLength(4);
    element.querySelector('option')?.remove();
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(shownOptions(element)).toHaveLength(3);
  });

  it('holds listeners and an observer only while the list shows', async () => {
    const { element } = await mount();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    input(element).focus();
    await userEvent.keyboard('{ArrowDown}');
    await element.updateComplete;
    expect(add.mock.calls.map((call) => call[0]).sort()).toEqual(['resize', 'scroll']);
    await userEvent.keyboard('{Escape}');
    expect(remove.mock.calls.map((call) => call[0]).sort()).toEqual(['resize', 'scroll']);
  });

  it('warns when it has no options', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('label="Item"', '');
    expect(warn).toHaveBeenCalledWith(
      '<punk-combobox> It has no options. Put `<option>` elements inside it.',
    );
  });
});
