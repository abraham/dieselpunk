import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../checkbox/register.ts';
import '../text-field/register.ts';
import './register.ts';
import type { PunkFieldset } from './index.ts';

beforeEach(addStylesheets);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Power"', inner = ''): Promise<PunkFieldset> {
  const form = track(document.createElement('form'));
  form.innerHTML = `<punk-fieldset ${attributes}>${inner}</punk-fieldset>`;
  const element = form.firstElementChild as PunkFieldset;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

const controls = `
  <input name="a" value="1">
  <punk-checkbox name="b" checked>Boost</punk-checkbox>
  <punk-text-field name="c" label="Callsign" value="Echo"></punk-text-field>
  <button type="button" disabled>Already off</button>
`;

describe('semantics', () => {
  it('is a group named by its legend, and described by its hint and error', async () => {
    const element = await mount(
      'label="Power"',
      `${controls}<span slot="hint">Applies at once</span><span slot="error">Pick one source</span>`,
    );
    const group = page.getByRole('group', { name: 'Power' }).element();
    expect(group).toBe(part(element, 'fieldset'));
    expect(group.getAttribute('aria-describedby')).toBe('hint error');
    expect(part(element, 'error').hidden).toBe(false);
  });

  it('hides the hint, the error, and an empty legend', async () => {
    const element = await mount('', controls);
    expect(part(element, 'legend').hidden).toBe(true);
    expect(part(element, 'hint').hidden).toBe(true);
    expect(part(element, 'error').hidden).toBe(true);
    expect(part(element, 'fieldset').hasAttribute('aria-describedby')).toBe(false);
  });

  it('takes a rich legend from the legend slot', async () => {
    await mount('', `<span slot="legend">Main <b>power</b></span>${controls}`);
    expect(page.getByRole('group', { name: 'Main power' }).element()).toBeTruthy();
  });

  it('warns once when it has no legend', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('', '<input>');
    element.requestUpdate();
    await element.updateComplete;
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '<punk-fieldset> It has no legend. Set `label`.',
    ]);
  });
});

describe('disabled', () => {
  it('disables its native and form-associated controls, and gives exactly those back', async () => {
    const element = await mount('label="Power"', controls);
    const form = element.closest('form') as HTMLFormElement;
    expect([...new FormData(form).keys()]).toEqual(['a', 'b', 'c']);
    element.disabled = true;
    await element.updateComplete;
    expect([...new FormData(form).keys()]).toEqual([]);
    expect((part(element, 'fieldset') as HTMLFieldSetElement).disabled).toBe(true);
    element.disabled = false;
    await element.updateComplete;
    expect([...new FormData(form).keys()]).toEqual(['a', 'b', 'c']);
    expect((element.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('leaves controls in the legend enabled, and picks up added children', async () => {
    const element = await mount(
      'label="Power" disabled',
      '<label slot="legend"><input type="checkbox" name="all"> All</label><input name="a">',
    );
    expect((element.querySelector('[name="all"]') as HTMLInputElement).disabled).toBe(false);
    expect((element.querySelector('[name="a"]') as HTMLInputElement).disabled).toBe(true);
    const added = document.createElement('input');
    element.append(added);
    await new Promise((resolve) => setTimeout(resolve));
    expect(added.disabled).toBe(true);
  });

  it('gives back what it disabled when a control leaves or it disconnects', async () => {
    const element = await mount('label="Power" disabled', '<input name="a"><input name="b">');
    const [first, second] = element.querySelectorAll('input');
    (first as HTMLInputElement).remove();
    await new Promise((resolve) => setTimeout(resolve));
    expect((first as HTMLInputElement).disabled).toBe(false);
    element.remove();
    expect((second as HTMLInputElement).disabled).toBe(false);
  });
});

describe('look', () => {
  it('sets the legend on an opaque plate, so the frame never runs through it', async () => {
    const element = await mount('label="Power" disabled', controls);
    const legend = getComputedStyle(part(element, 'legend'));
    expect(legend.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(legend.boxShadow).toContain('inset');
  });
});
