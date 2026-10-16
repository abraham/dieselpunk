import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import {
  ratio,
  ringColor,
  slotOf,
  structure,
  toHex,
} from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkActivateDetail } from '../../internal/selectable-base.ts';
import type { PunkSlot } from './index.ts';

let warn: MockInstance<typeof console.warn>;

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

function spyOnWarnings(): void {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
}

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkSlot> {
  const element = document.createElement('punk-slot');
  if (options.content !== undefined) element.innerHTML = options.content;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return track(element);
}

function listen() {
  const handler = vi.fn<(event: CustomEvent<PunkActivateDetail>) => void>();
  document.body.addEventListener('punk-activate', handler);
  return handler;
}

const art =
  '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';

describe('name and role', () => {
  it('is a button named by its label', async () => {
    const element = await mount({ label: 'Module slot 1' }, { content: art });
    expect(page.getByRole('button', { name: 'Module slot 1', exact: true }).element()).toBe(
      element,
    );
  });

  it('is named by slotted text, and by the alt text of a slotted image', async () => {
    const text = await mount({}, { content: 'Gear' });
    expect(page.getByRole('button', { name: 'Gear', exact: true }).element()).toBe(text);
    const image = await mount(
      {},
      { content: '<img alt="Coil" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />' },
    );
    expect(page.getByRole('button', { name: 'Coil', exact: true }).element()).toBe(image);
  });

  it('lets an aria-label replace the name', async () => {
    const element = await mount({ label: 'Module slot 1', 'aria-label': 'Equipment' });
    expect(page.getByRole('button', { name: 'Equipment', exact: true }).element()).toBe(element);
  });

  it('adds the word "invalid" to the name, and does not use aria-invalid', async () => {
    const element = await mount({ label: 'Module slot 1', invalid: '' });
    expect(
      page.getByRole('button', { name: 'Module slot 1, invalid', exact: true }).element(),
    ).toBe(element);
    expect(element.hasAttribute('aria-invalid')).toBe(false);
  });

  it('is disabled for assistive technology, keeps its name, and cannot be focused', async () => {
    const element = await mount({ label: 'Module slot 1', disabled: '' });
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(page.getByRole('button', { name: 'Module slot 1', exact: true }).element()).toBe(
      element,
    );
    element.focus();
    expect(document.activeElement).not.toBe(element);
  });

  it('is pressed only after it has been given a selected state', async () => {
    const element = await mount({ label: 'Module slot 1' });
    expect(element.hasAttribute('aria-pressed')).toBe(false);
    element.selected = false;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('false');
    element.selected = true;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(element.getAttribute('role')).toBe('button');
    expect(element.hasAttribute('aria-selected')).toBe(false);
  });

  it('follows a label that changes', async () => {
    const element = await mount({ label: 'Before' });
    element.label = 'After';
    await element.updateComplete;
    expect(page.getByRole('button', { name: 'After', exact: true }).element()).toBe(element);
  });
});

describe('activation', () => {
  it('activates once on a click, Enter, and Space, with its value and itself', async () => {
    const element = await mount({ label: 'Slot', value: 'gear' }, { content: art });
    const handler = listen();
    await userEvent.click(element);
    element.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(handler).toHaveBeenCalledTimes(3);
    for (const [event] of handler.mock.calls) {
      expect(event.detail).toEqual({ value: 'gear', item: element });
    }
  });

  it('is not blocked by overlay content', async () => {
    const element = await mount(
      { label: 'Slot' },
      {
        content: `${art}<span slot="overlay" style="display: block; inline-size: 100%; block-size: 100%">×</span>`,
      },
    );
    const overlay = element.querySelector('[slot="overlay"]') as HTMLElement;
    const box = element.getBoundingClientRect();
    expect(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)).not.toBe(
      overlay,
    );
    const handler = listen();
    await userEvent.click(element);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('shows its badge, and hides the badge wrapper when there is none', async () => {
    const plain = await mount({ label: 'Slot' }, { content: art });
    expect(plain.shadowRoot?.querySelector('.badge')?.hasAttribute('hidden')).toBe(true);
    const badged = await mount({ label: 'Slot' }, { content: `${art}<span slot="badge">+</span>` });
    expect(badged.shadowRoot?.querySelector('.badge')?.hasAttribute('hidden')).toBe(false);
    badged.querySelector('[slot="badge"]')?.remove();
    // `slotchange` fires after a microtask, so the update it asks for comes after that.
    await new Promise((resolve) => setTimeout(resolve));
    await badged.updateComplete;
    expect(badged.shadowRoot?.querySelector('.badge')?.hasAttribute('hidden')).toBe(true);
  });
});

describe('size', () => {
  it.each([
    ['compact', 32, 40, 48],
    ['low', 40, 50, 60],
  ] as const)(
    'is 0.8, 1, and 1.2 times the slot size at %s density',
    async (density, sm, md, lg) => {
      addStylesheets();
      const wrapper = container({ 'data-punk-density': density });
      const sizes: number[] = [];
      for (const size of ['sm', 'md', 'lg']) {
        const element = await mount({ label: 'Slot', size }, { content: art, parent: wrapper });
        const box = element.getBoundingClientRect();
        expect(box.height, `${size} is square`).toBeCloseTo(box.width, 0);
        sizes.push(box.width);
      }
      expect(sizes[0]).toBeCloseTo(sm, 0);
      expect(sizes[1]).toBeCloseTo(md, 0);
      expect(sizes[2]).toBeCloseTo(lg, 0);
    },
  );

  it('treats an unknown size as medium', async () => {
    const element = await mount({ label: 'Slot', size: 'huge' }, { content: art });
    expect(element.getBoundingClientRect().width).toBeCloseTo(40, 0);
  });
});

describe('boundary', () => {
  const surfaces = ['canvas', 'panel', 'panel-raised', 'panel-inset'] as const;

  it('draws an empty slot with a ring that meets 3:1 on every surface in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      for (const surface of surfaces) {
        const wrapper = container({ 'data-punk-theme': theme });
        wrapper.style.background = `var(--punk-color-${surface})`;
        const element = await mount({ label: 'Empty' }, { parent: wrapper });
        const slot = slotOf(element);
        const ring = ringColor(slot);
        const outside = ratio(ring, toHex(getComputedStyle(wrapper).backgroundColor));
        const inside = ratio(ring, toHex(getComputedStyle(slot).backgroundColor));
        if (outside < 3) problems.push(`${theme} on ${surface}: ${outside.toFixed(2)} outside`);
        if (inside < 3) problems.push(`${theme} on ${surface}: ${inside.toFixed(2)} inside`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('draws the boundary on an empty slot only, and the selection ring over it', async () => {
    const empty = slotOf(await mount({ label: 'Empty' }));
    const filled = slotOf(await mount({ label: 'Filled' }, { content: art }));
    expect(ringColor(empty)).not.toBe(ringColor(filled));
    const selected = slotOf(await mount({ label: 'Selected', selected: '' }));
    expect(ringColor(selected)).not.toBe(ringColor(empty));
  });
});

describe('states without color', () => {
  async function states() {
    const entries = {
      idle: {},
      selected: { selected: '' },
      highlighted: { highlighted: '' },
      invalid: { invalid: '' },
      disabled: { disabled: '' },
    };
    const result: Record<string, string> = {};
    for (const [name, attributes] of Object.entries(entries)) {
      result[name] = structure(await mount({ label: name, ...attributes }, { content: art }));
    }
    return result;
  }

  it('draws idle, selected, highlighted, invalid, and disabled differently once every color is gone', async () => {
    const found = await states();
    expect(new Set(Object.values(found)).size).toBe(Object.keys(found).length);
  });

  it('keeps them different under forced colors', async () => {
    await commands.setForcedColors('active');
    const found = await states();
    expect(new Set(Object.values(found)).size).toBe(Object.keys(found).length);
  });

  it('combines selected, highlighted, and invalid without losing any', async () => {
    const all = structure(
      await mount({ label: 'All', selected: '', highlighted: '', invalid: '' }, { content: art }),
    );
    const found = await states();
    expect(all).not.toBe(found['selected']);
    expect(all).not.toBe(found['highlighted']);
    expect(all).not.toBe(found['invalid']);
    const parsed = JSON.parse(all) as { shadow: string; outline: string[]; hatch: string };
    expect(parsed.outline[0]).toBe('dotted');
    expect(parsed.shadow).toContain('3px');
    expect(parsed.hatch).not.toBe('none');
  });
});

describe('focus', () => {
  it('is a single tab stop with a visible ring', async () => {
    const element = await mount({ label: 'Slot' }, { content: art });
    await focusWithKeyboard(element);
    expect(document.activeElement).toBe(element);
    expect(getComputedStyle(slotOf(element), '::after').boxShadow).not.toBe('none');
  });
});

describe('warnings', () => {
  it('warns once when it has no accessible name', async () => {
    spyOnWarnings();
    const element = await mount();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-slot>');
    expect(String(warn.mock.calls[0]?.[0])).toContain('accessible name');
    element.requestUpdate();
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn when a label, an aria-label, aria-labelledby, or content names it', async () => {
    spyOnWarnings();
    await mount({ label: 'Slot' });
    await mount({ 'aria-label': 'Slot' });
    await mount({ 'aria-labelledby': 'somewhere' });
    await mount({}, { content: 'Gear' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns again if the name goes away and comes back', async () => {
    spyOnWarnings();
    const element = await mount({ label: 'Slot' });
    element.label = '';
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    element.label = 'Slot';
    await element.updateComplete;
    element.label = '';
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
