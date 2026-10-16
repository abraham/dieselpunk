import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkCheckbox } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(attributes = '', content = 'Fuel', parent?: Element): Promise<PunkCheckbox> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML(
    'beforeend',
    `<punk-checkbox ${attributes}>${content}</punk-checkbox>`,
  );
  const element = wrapper.lastElementChild as PunkCheckbox;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

/** The mark and box with every color gone, which is what a color-blind user gets. */
function shape(element: Element): string {
  const mark = getComputedStyle(part(element, 'mark'));
  return JSON.stringify([mark.display, mark.clipPath]);
}

describe('indeterminate', () => {
  it('is mixed for assistive technology, and reflects', async () => {
    const element = await mount('indeterminate');
    expect(element.indeterminate).toBe(true);
    expect(element.getAttribute('aria-checked')).toBe('mixed');
    element.indeterminate = false;
    await element.updateComplete;
    expect(element.hasAttribute('indeterminate')).toBe(false);
    expect(element.getAttribute('aria-checked')).toBe('false');
  });

  it('is mixed even when it is also checked', async () => {
    const element = await mount('indeterminate checked');
    expect(element.getAttribute('aria-checked')).toBe('mixed');
  });

  it('is cleared by a click, which also toggles checked, and sends the events once', async () => {
    const element = await mount('indeterminate');
    const changed = vi.fn();
    element.addEventListener('change', changed);
    await userEvent.click(element);
    expect(element.indeterminate).toBe(false);
    expect(element.checked).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(element.getAttribute('aria-checked')).toBe('true');
  });

  it('is cleared by Space too, and a checked mixed one becomes unchecked', async () => {
    const element = await mount('indeterminate checked');
    element.focus();
    await userEvent.keyboard(' ');
    expect(element.indeterminate).toBe(false);
    expect(element.checked).toBe(false);
  });

  it('is not part of the submission: only checked is', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = '<punk-checkbox name="a" indeterminate>A</punk-checkbox>';
    const element = form.querySelector('punk-checkbox') as PunkCheckbox;
    await element.updateComplete;
    expect(new FormData(form).has('a')).toBe(false);
    element.checked = true;
    await element.updateComplete;
    expect(new FormData(form).get('a')).toBe('on');
  });
});

describe('a required checkbox', () => {
  it('is missing a value until it is checked, with the browser message', async () => {
    const element = await mount('required');
    expect(element.validity.valueMissing).toBe(true);
    expect(element.validationMessage).not.toBe('');
    expect(element.checkValidity()).toBe(false);
    await userEvent.click(element);
    expect(element.validity.valid).toBe(true);
    expect(element.validationMessage).toBe('');
  });

  it('is focused when its validity is reported', async () => {
    const element = await mount('required');
    expect(element.reportValidity()).toBe(false);
    expect(document.activeElement).toBe(element);
  });
});

describe('appearance', () => {
  it('shows unchecked, checked, and mixed as three shapes, with every color gone', async () => {
    const found = new Set([
      shape(await mount()),
      shape(await mount('checked')),
      shape(await mount('indeterminate')),
    ]);
    expect(found.size).toBe(3);
  });

  it('keeps them apart, and drawn, under forced colors', async () => {
    await commands.setForcedColors('active');
    const checked = await mount('checked');
    const mixed = await mount('indeterminate');
    expect(new Set([shape(await mount()), shape(checked), shape(mixed)]).size).toBe(3);
    for (const element of [checked, mixed]) {
      const box = getComputedStyle(part(element, 'box')).backgroundColor;
      expect(getComputedStyle(part(element, 'mark')).backgroundColor).not.toBe(box);
    }
  });

  it('is a bordered box under forced colors, and a checked one differs from an unchecked one', async () => {
    await commands.setForcedColors('active');
    const off = await mount();
    const on = await mount('checked');
    expect(getComputedStyle(part(off, 'box')).borderTopStyle).toBe('solid');
    expect(getComputedStyle(part(on, 'box')).backgroundColor).not.toBe(
      getComputedStyle(part(off, 'box')).backgroundColor,
    );
  });

  it('has a boundary that meets 3:1 on every surface in every theme, read from the render', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      for (const surface of ['canvas', 'panel', 'panel-raised', 'panel-inset']) {
        const holder = track(document.createElement('div'));
        holder.setAttribute('data-punk-theme', theme);
        holder.style.background = `var(--punk-color-${surface})`;
        const element = await mount('', 'Fuel', holder);
        const edge = toHex(getComputedStyle(part(element, 'box')).borderTopColor);
        const behind = toHex(getComputedStyle(holder).backgroundColor);
        const found = ratio(edge, behind);
        if (found < 3) problems.push(`${theme} on ${surface}: ${found.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('draws the mark in the text-on-accent color on an accent fill', async () => {
    const element = await mount('checked');
    const box = getComputedStyle(part(element, 'box')).backgroundColor;
    const mark = getComputedStyle(part(element, 'mark')).backgroundColor;
    expect(ratio(toHex(box), toHex(mark))).toBeGreaterThanOrEqual(4.5);
  });
});
