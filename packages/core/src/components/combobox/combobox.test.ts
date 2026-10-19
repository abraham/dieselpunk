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

  it('keeps the text when the application replaces the options on input', async () => {
    const { element } = await mount('label="Search" filter="none" allow-custom', '');
    element.addEventListener('input', () => {
      const text = input(element).value;
      element.replaceChildren(
        ...[1, 2].map((n) =>
          Object.assign(document.createElement('option'), {
            value: `${text}${n}`,
            text: `${text} ${n}`,
          }),
        ),
      );
    });
    await userEvent.type(input(element), 'iron');
    await element.updateComplete;
    expect(input(element).value).toBe('iron');
    expect(input(element).getAttribute('aria-expanded')).toBe('true');
    expect(shownOptions(element)).toEqual(['iron 1', 'iron 2']);
  });

  it('keeps the text when options change before its own input handler runs', async () => {
    const { element } = await mount('label="Search" filter="none" allow-custom');
    await userEvent.type(input(element), 'i');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-expanded')).toBe('true');
    const replace = () => {
      const text = input(element).value;
      element.replaceChildren(
        Object.assign(document.createElement('option'), { value: text, text: `${text} plate` }),
      );
    };
    document.addEventListener('input', replace, { capture: true });
    await userEvent.type(input(element), 'ron');
    document.removeEventListener('input', replace, { capture: true });
    await element.updateComplete;
    expect(input(element).value).toBe('iron');
    expect(element.value).toBe('iron');
    expect(shownOptions(element)).toEqual(['iron plate']);
  });

  it('opens on options that arrive after typing, while the field has focus', async () => {
    const { element } = await mount('label="Search" filter="none" allow-custom', '');
    await userEvent.type(input(element), 'iron');
    await element.updateComplete;
    expect(input(element).getAttribute('aria-expanded')).toBe('false');
    element.append(
      Object.assign(document.createElement('option'), { value: 'fe', text: 'Iron plate' }),
    );
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(input(element).value).toBe('iron');
    expect(input(element).getAttribute('aria-expanded')).toBe('true');
    expect(shownOptions(element)).toEqual(['Iron plate']);
    await userEvent.tab();
    element.append(
      Object.assign(document.createElement('option'), { value: 'cu', text: 'Copper plate' }),
    );
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(input(element).getAttribute('aria-expanded')).toBe('false');
  });

  it('groups options under their optgroup label, with start and end elements outside the label', async () => {
    const { element } = await mount('label="Item"', '');
    const option = (value: string, text: string, badge?: string) => {
      const node = Object.assign(document.createElement('option'), { value });
      const icon = Object.assign(document.createElement('span'), {
        slot: 'start',
        className: 'icon',
      });
      icon.setAttribute('aria-hidden', 'true');
      node.append(icon, text);
      if (badge)
        node.append(
          Object.assign(document.createElement('span'), { slot: 'end', textContent: badge }),
        );
      return node;
    };
    const items = Object.assign(document.createElement('optgroup'), { label: 'Items' });
    items.append(option('fe', 'Iron plate'), option('sp', 'Space science pack', 'Space Age'));
    const recipes = Object.assign(document.createElement('optgroup'), {
      label: 'Recipes',
      disabled: true,
    });
    recipes.append(option('gear', 'Iron gear'));
    element.append(items, recipes);
    input(element).focus();
    await userEvent.keyboard('{ArrowDown}');
    await element.updateComplete;
    const groups = [...(element.shadowRoot?.querySelectorAll('[role="group"]') ?? [])];
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['Items', 'Recipes']);
    expect(groups.map((group) => group.querySelectorAll('[role="option"]').length)).toEqual([2, 1]);
    const rows = [...(element.shadowRoot?.querySelectorAll('[role="option"]') ?? [])];
    expect(rows.map((row) => row.querySelector('.text')?.textContent)).toEqual([
      'Iron plate',
      'Space science pack',
      'Iron gear',
    ]);
    expect(rows[1]?.querySelector('.end')?.textContent).toBe('Space Age');
    expect(rows.every((row) => row.querySelector('.start > .icon'))).toBe(true);
    expect(rows[2]?.getAttribute('aria-disabled')).toBe('true');
    await userEvent.keyboard('{Escape}');
    await userEvent.fill(input(element), 'space');
    await element.updateComplete;
    expect(
      [...(element.shadowRoot?.querySelectorAll('.option .text') ?? [])].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Space science pack']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await element.updateComplete;
    expect(element.value).toBe('sp');
    expect(input(element).value).toBe('Space science pack');
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
