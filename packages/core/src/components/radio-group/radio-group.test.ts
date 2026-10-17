import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkRadio, PunkRadioGroup } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const radios = `
  <punk-radio value="coal">Coal</punk-radio>
  <punk-radio value="solar" checked>Solar</punk-radio>
  <punk-radio value="wind" disabled>Wind</punk-radio>
  <punk-radio value="nuclear">Nuclear</punk-radio>
`;

async function mount(attributes = 'label="Power" name="power"', inner = radios, dir = 'ltr') {
  const form = track(document.createElement('form'));
  form.dir = dir;
  form.innerHTML = `<punk-radio-group ${attributes}>${inner}</punk-radio-group>`;
  const group = form.firstElementChild as PunkRadioGroup;
  await group.updateComplete;
  await new Promise((resolve) => setTimeout(resolve));
  await group.updateComplete;
  const items = [...group.querySelectorAll('punk-radio')] as PunkRadio[];
  await Promise.all(items.map((item) => item.updateComplete));
  return { form, group, items };
}

const states = (items: PunkRadio[]) =>
  items.map(
    (item) => `${item.value}:${item.getAttribute('aria-checked')}:${item.getAttribute('tabindex')}`,
  );

describe('semantics', () => {
  it('is a radiogroup named by its label, of radios with one tab stop on the checked one', async () => {
    const { group, items } = await mount();
    const radiogroup = page.getByRole('radiogroup', { name: 'Power' }).element();
    expect(radiogroup).toBe(group.shadowRoot?.querySelector('[part="radios"]'));
    expect(page.getByRole('radio', { name: 'Solar' }).element()).toBe(items[1]);
    expect(states(items)).toEqual([
      'coal:false:-1',
      'solar:true:0',
      'wind:false:null',
      'nuclear:false:-1',
    ]);
    expect(items[2]?.getAttribute('aria-disabled')).toBe('true');
    expect(group.value).toBe('solar');
  });

  it('puts the tab stop on the first enabled radio when none is checked', async () => {
    const { items } = await mount('label="Power"', radios.replace(' checked', ''));
    expect(states(items)[0]).toBe('coal:false:0');
  });

  it('copies aria-label to the radiogroup when there is no label, and warns with neither', async () => {
    await mount('aria-label="Source"');
    expect(page.getByRole('radiogroup', { name: 'Source' }).element()).toBeTruthy();
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('');
    expect(warn).toHaveBeenCalledWith(
      '<punk-radio-group> It has no accessible name. Set `label` or `aria-label`.',
    );
  });
});

describe('keyboard and pointer', () => {
  for (const dir of ['ltr', 'rtl']) {
    it(`moves and chooses with the arrows, skipping disabled radios and not wrapping, in ${dir}`, async () => {
      const { group, items } = await mount('label="Power" name="power"', radios, dir);
      const events: string[] = [];
      group.addEventListener('input', () => events.push('input'));
      group.addEventListener('change', () => events.push(`change:${group.value}`));
      items[1]?.focus();
      const forward = dir === 'rtl' ? '{ArrowLeft}' : '{ArrowRight}';
      const backward = dir === 'rtl' ? '{ArrowRight}' : '{ArrowLeft}';
      await userEvent.keyboard(forward);
      expect(group.value).toBe('nuclear');
      expect(document.activeElement).toBe(items[3]);
      await userEvent.keyboard('{ArrowDown}');
      expect(group.value).toBe('nuclear');
      await userEvent.keyboard('{ArrowUp}');
      await userEvent.keyboard(backward);
      expect(group.value).toBe('coal');
      await userEvent.keyboard('{ArrowUp}');
      expect(group.value).toBe('coal');
      expect(events).toEqual([
        'input',
        'change:nuclear',
        'input',
        'change:solar',
        'input',
        'change:coal',
      ]);
      expect(states(items)).toEqual([
        'coal:true:0',
        'solar:false:-1',
        'wind:false:null',
        'nuclear:false:-1',
      ]);
    });
  }

  it('chooses with Space and a click, once, and not a disabled radio', async () => {
    const { group, items } = await mount('label="Power"', radios.replace(' checked', ''));
    const change = vi.fn();
    group.addEventListener('change', change);
    await focusWithKeyboard(items[0] as PunkRadio);
    await userEvent.keyboard(' ');
    expect(group.value).toBe('coal');
    await userEvent.keyboard(' ');
    await userEvent.click(items[3] as PunkRadio);
    expect(group.value).toBe('nuclear');
    (items[2] as PunkRadio).click();
    expect(group.value).toBe('nuclear');
    expect(change).toHaveBeenCalledTimes(2);
  });

  it('sends nothing for a value set from code, which can wait for its radio', async () => {
    const { group, items } = await mount();
    const change = vi.fn();
    group.addEventListener('change', change);
    group.value = 'coal';
    await group.updateComplete;
    expect(items[0]?.checked).toBe(true);
    group.value = 'hydro';
    expect(group.value).toBe('hydro');
    expect(items.every((item) => !item.checked)).toBe(true);
    group.insertAdjacentHTML('beforeend', '<punk-radio value="hydro">Hydro</punk-radio>');
    await new Promise((resolve) => setTimeout(resolve));
    expect((group.lastElementChild as PunkRadio).checked).toBe(true);
    expect(change).not.toHaveBeenCalled();
  });
});

describe('disabled and ownership', () => {
  it('disables every radio while the group is disabled, and gives the tab stop back', async () => {
    const { group, items } = await mount();
    group.disabled = true;
    await group.updateComplete;
    await Promise.all(items.map((item) => item.updateComplete));
    expect(items.map((item) => item.getAttribute('tabindex'))).toEqual([null, null, null, null]);
    expect(items.every((item) => item.getAttribute('aria-disabled') === 'true')).toBe(true);
    (items[0] as PunkRadio).click();
    expect(group.value).toBe('solar');
    group.disabled = false;
    await group.updateComplete;
    await Promise.all(items.map((item) => item.updateComplete));
    expect(states(items)[1]).toBe('solar:true:0');
  });

  it('lets go of a radio that leaves', async () => {
    const { items } = await mount();
    const radio = items[0] as PunkRadio;
    radio.remove();
    track(radio);
    await new Promise((resolve) => setTimeout(resolve));
    await radio.updateComplete;
    expect(radio.group).toBeNull();
    expect(radio.getAttribute('tabindex')).toBe('0');
  });
});

describe('look', () => {
  it('draws a dot in a checked ring, also under forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const { items } = await mount();
      const dot = (item: PunkRadio) =>
        getComputedStyle(item.shadowRoot?.querySelector('[part="dot"]') as HTMLElement).display;
      expect(dot(items[1] as PunkRadio)).toBe('block');
      expect(dot(items[0] as PunkRadio)).toBe('none');
    }
  });

  it('lays radios out in a row when horizontal', async () => {
    const { group } = await mount('label="Power" orientation="horizontal"');
    const box = group.shadowRoot?.querySelector('[part="radios"]') as HTMLElement;
    expect(getComputedStyle(box).flexDirection).toBe('row');
  });
});
