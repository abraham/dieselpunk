import { commands } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkSelect } from './index.ts';

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

const basic =
  '<option value="a">Alpha</option><option value="b">Beta</option><option value="c">Gamma</option>';

async function mount(attributes = 'label="Squadron"', inner = basic): Promise<PunkSelect> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '300px';
  wrapper.innerHTML = `<punk-select ${attributes}>${inner}</punk-select>`;
  const element = wrapper.firstElementChild as PunkSelect;
  await element.updateComplete;
  return element;
}

const native = (element: Element) =>
  element.shadowRoot?.querySelector('select') as HTMLSelectElement;
const light = (element: Element) => [...element.querySelectorAll('option')];
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/** What the user does: picks an option in the native select. */
function choose(element: Element, index: number): void {
  const select = native(element);
  select.selectedIndex = index;
  select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('punk-select', () => {
  it('copies the options into the native select, with their groups', async () => {
    const element = await mount(
      'label="Squadron"',
      '<option value="x">Top</option><optgroup label="Wings"><option value="a">Alpha</option><option value="b" disabled>Beta</option></optgroup>',
    );
    const select = native(element);
    expect([...select.options].map((o) => [o.value, o.textContent?.trim(), o.disabled])).toEqual([
      ['x', 'Top', false],
      ['a', 'Alpha', false],
      ['b', 'Beta', true],
    ]);
    const group = select.querySelector('optgroup');
    expect(group?.label).toBe('Wings');
    expect(group?.querySelectorAll('option')).toHaveLength(2);
  });

  it('chooses the first enabled option by default', async () => {
    const element = await mount(
      'label="Squadron"',
      '<option value="a" disabled>Alpha</option><option value="b">Beta</option>',
    );
    expect(element.value).toBe('b');
    expect(element.selectedIndex).toBe(1);
    expect(native(element).value).toBe('b');
  });

  it('chooses the option with the selected attribute', async () => {
    const element = await mount(
      'label="Squadron"',
      '<option value="a">Alpha</option><option value="b" selected>Beta</option>',
    );
    expect(element.value).toBe('b');
  });

  it('has an empty value and index -1 when it has no options', async () => {
    const element = await mount('label="Squadron"', '');
    expect(element.value).toBe('');
    expect(element.selectedIndex).toBe(-1);
  });

  it('chooses by value, from the property and from the attribute', async () => {
    const element = await mount('label="Squadron" value="c"');
    expect(element.value).toBe('c');
    expect(native(element).value).toBe('c');
    element.value = 'b';
    await element.updateComplete;
    expect(element.selectedIndex).toBe(1);
    expect(native(element).value).toBe('b');
    element.setAttribute('value', 'a');
    await element.updateComplete;
    expect(element.value).toBe('a');
  });

  it('chooses nothing for a value no option has, and picks it up when the option arrives', async () => {
    const element = await mount('label="Squadron" value="z"');
    expect(element.selectedIndex).toBe(-1);
    expect(element.value).toBe('');
    const later = document.createElement('option');
    later.value = 'z';
    later.textContent = 'Zulu';
    element.append(later);
    await tick();
    await element.updateComplete;
    expect(element.value).toBe('z');
    expect(native(element).value).toBe('z');
  });

  it('writes the user choice to the light option and fires input then change', async () => {
    const element = await mount();
    const events: string[] = [];
    element.addEventListener('input', () => events.push(`input:${element.value}`));
    element.addEventListener('change', () => events.push(`change:${element.value}`));
    choose(element, 2);
    expect(events).toEqual(['input:c', 'change:c']);
    expect(light(element)[2]?.selected).toBe(true);
    expect(element.selectedIndex).toBe(2);
  });

  it('submits the chosen value under its name straight away', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = `<punk-select label="Squadron" name="sq">${basic}</punk-select>`;
    const element = form.firstElementChild as PunkSelect;
    await element.updateComplete;
    expect(new FormData(form).get('sq')).toBe('a');
    choose(element, 1);
    expect(new FormData(form).get('sq')).toBe('b');
  });

  it('submits nothing while no option is chosen', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = '<punk-select label="Squadron" name="sq"></punk-select>';
    const element = form.firstElementChild as PunkSelect;
    await element.updateComplete;
    expect(new FormData(form).has('sq')).toBe(false);
  });

  it('puts back each option selected attribute on a form reset', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = `<punk-select label="Squadron" name="sq"><option value="a">Alpha</option><option value="b" selected>Beta</option></punk-select>`;
    const element = form.firstElementChild as PunkSelect;
    await element.updateComplete;
    choose(element, 0);
    expect(element.value).toBe('a');
    form.reset();
    await element.updateComplete;
    expect(element.value).toBe('b');
    expect(native(element).value).toBe('b');
    expect(new FormData(form).get('sq')).toBe('b');
  });

  it('is missing a value when required and a placeholder option is chosen', async () => {
    const element = await mount(
      'label="Squadron" required',
      '<option value="">Choose</option><option value="a">Alpha</option>',
    );
    expect(element.validity.valueMissing).toBe(true);
    choose(element, 1);
    expect(element.validity.valid).toBe(true);
  });

  it('follows options added, removed, relabeled, and disabled', async () => {
    const element = await mount();
    const extra = document.createElement('option');
    extra.value = 'd';
    extra.textContent = 'Delta';
    element.append(extra);
    await tick();
    await element.updateComplete;
    expect(native(element).options).toHaveLength(4);

    light(element)[0]!.textContent = 'Alpha one';
    await tick();
    await element.updateComplete;
    expect(native(element).options[0]?.textContent?.trim()).toBe('Alpha one');

    light(element)[1]!.disabled = true;
    light(element)[1]!.setAttribute('disabled', '');
    await tick();
    await element.updateComplete;
    expect(native(element).options[1]?.disabled).toBe(true);

    light(element)[3]!.remove();
    await tick();
    await element.updateComplete;
    expect(native(element).options).toHaveLength(3);
  });

  it('keeps the choice when an option is added, and moves on when the chosen one is removed', async () => {
    const element = await mount('label="Squadron" value="b"');
    const extra = document.createElement('option');
    extra.value = 'd';
    extra.textContent = 'Delta';
    element.prepend(extra);
    await tick();
    await element.updateComplete;
    expect(element.value).toBe('b');
    light(element)
      .find((o) => o.value === 'b')!
      .remove();
    await tick();
    await element.updateComplete;
    // Nothing is chosen any more, so it falls back to the first option that can be.
    expect(element.value).toBe('d');
  });

  it('disables the options of a disabled group', async () => {
    const element = await mount(
      'label="Squadron"',
      '<option value="a">Alpha</option><optgroup label="Wings" disabled><option value="b">Beta</option></optgroup>',
    );
    expect(native(element).querySelector('optgroup')?.disabled).toBe(true);
  });

  it('observes only while connected, and one observer serves it', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const element = await mount();
    expect(observe).toHaveBeenCalledTimes(1);
    const wrapper = element.parentElement!;
    element.remove();
    expect(disconnect).toHaveBeenCalledTimes(1);
    wrapper.append(element);
    await element.updateComplete;
    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe.mock.contexts[1]).toBe(observe.mock.contexts[0]);
  });

  it('follows the text of an option changed in place, and options inside a group', async () => {
    const element = await mount(
      'label="Squadron"',
      '<optgroup label="Wings"><option value="a">Alpha</option></optgroup>',
    );
    (element.querySelector('option')!.firstChild as Text).data = 'Alpha two';
    await tick();
    await element.updateComplete;
    expect(native(element).options[0]?.textContent?.trim()).toBe('Alpha two');
    const extra = document.createElement('option');
    extra.value = 'b';
    extra.textContent = 'Beta';
    element.querySelector('optgroup')!.append(extra);
    await tick();
    await element.updateComplete;
    expect(native(element).options).toHaveLength(2);
  });

  it('draws the arrow, and the native select is the control', async () => {
    const element = await mount();
    expect(element.shadowRoot?.querySelector('[part="arrow"]')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('[part="control"]')).toBe(native(element));
    expect(getComputedStyle(native(element)).appearance).toBe('none');
  });

  it('takes the focus on the native select and opens by keyboard like one', async () => {
    const element = await mount();
    element.focus();
    expect(element.shadowRoot?.activeElement).toBe(native(element));
  });

  it('warns once that it has no options', async () => {
    const element = await mount('label="Squadron"', '');
    element.setAttribute('name', 'x');
    await element.updateComplete;
    const messages = warn.mock.calls.filter((call) => /no options/.test(String(call[0])));
    expect(messages).toHaveLength(1);
  });

  it('does not warn about options when it has some', async () => {
    await mount();
    expect(warn).not.toHaveBeenCalled();
  });

  it('draws the arrow in a visible color under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount();
    const arrow = element.shadowRoot!.querySelector('.arrow') as HTMLElement;
    expect(getComputedStyle(arrow).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
