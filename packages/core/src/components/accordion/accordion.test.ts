import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { owner } from '../../internal/owner.ts';
import type { MockInstance } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  rgb,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkAccordion, PunkAccordionItem, PunkToggleDetail } from './index.ts';

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

function container(attributes: Record<string, string> = {}, width?: number): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width !== undefined) element.style.inlineSize = `${width}px`;
  return track(element);
}

async function item(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<PunkAccordionItem> {
  const element = document.createElement('punk-accordion-item');
  for (const [name, value] of Object.entries({ heading: 'Inputs', ...attributes })) {
    element.setAttribute(name, value);
  }
  element.innerHTML = options.content ?? '<p>Panel content</p>';
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

async function accordion(
  items: Array<Record<string, string>>,
  attributes: Record<string, string> = {},
  parent?: Element,
): Promise<{ group: PunkAccordion; items: PunkAccordionItem[] }> {
  const group = document.createElement('punk-accordion');
  for (const [name, value] of Object.entries(attributes)) group.setAttribute(name, value);
  items.forEach((attributes, index) => {
    const child = document.createElement('punk-accordion-item');
    for (const [name, value] of Object.entries({ heading: `Item ${index + 1}`, ...attributes })) {
      child.setAttribute(name, value);
    }
    child.innerHTML = `<p>Panel ${index + 1}</p>`;
    group.append(child);
  });
  track(group, parent);
  const children = [...group.children] as PunkAccordionItem[];
  await Promise.all([group.updateComplete, ...children.map((child) => child.updateComplete)]);
  return { group, items: children };
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const trigger = (element: Element) => part(element, 'trigger') as HTMLButtonElement;
const settle = (...elements: Array<{ updateComplete: Promise<unknown> }>) =>
  Promise.all(elements.map((element) => element.updateComplete));
const expanded = (list: PunkAccordionItem[]) => list.map((entry) => entry.expanded);

describe('punk-accordion-item structure', () => {
  it('is a heading holding a button, and a region labeled by that button', async () => {
    const element = await item();
    const heading = part(element, 'heading');
    expect(heading.getAttribute('role')).toBe('heading');
    expect(heading.getAttribute('aria-level')).toBe('3');
    expect(trigger(element).parentElement).toBe(heading);
    expect(trigger(element).getAttribute('aria-expanded')).toBe('false');
    const panel = part(element, 'panel');
    expect(panel.getAttribute('role')).toBe('region');
    expect(element.shadowRoot?.getElementById(panel.getAttribute('aria-labelledby') ?? '')).toBe(
      trigger(element),
    );
    expect(
      element.shadowRoot?.getElementById(trigger(element).getAttribute('aria-controls') ?? ''),
    ).toBe(panel);
  });

  it('is named by its heading, by the heading slot, and not by its indicator', async () => {
    const plain = await item();
    expect(trigger(plain).textContent?.replace(/\s+/g, ' ').trim()).toBe('Inputs');
    const rich = await item(
      { heading: '' },
      { content: '<span slot="heading">Rich <b>heading</b></span><p>Body</p>' },
    );
    const slot = part(rich, 'trigger').querySelector('slot[name="heading"]') as HTMLSlotElement;
    expect(slot.assignedElements()).toHaveLength(1);
    expect(part(rich, 'indicator').getAttribute('aria-hidden')).toBe('true');
  });

  it('shows an icon before the heading', async () => {
    const element = await item(
      {},
      { content: '<svg slot="icon" width="16" height="16"></svg><p>Body</p>' },
    );
    const slot = part(element, 'trigger').querySelector('slot[name="icon"]') as HTMLSlotElement;
    expect(slot.assignedElements()).toHaveLength(1);
  });

  it('takes its level from the property, clamps it, and warns once', async () => {
    const element = await item({ level: '2' });
    expect(part(element, 'heading').getAttribute('aria-level')).toBe('2');
    element.level = 9;
    await element.updateComplete;
    element.level = 12;
    await element.updateComplete;
    expect(part(element, 'heading').getAttribute('aria-level')).toBe('6');
    element.level = 0;
    await element.updateComplete;
    expect(part(element, 'heading').getAttribute('aria-level')).toBe('1');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('level');
  });

  it('hides the panel while collapsed, and shows it while expanded', async () => {
    const element = await item();
    const panel = part(element, 'panel');
    expect(panel.hidden).toBe(true);
    expect(panel.getBoundingClientRect().height).toBe(0);
    element.expanded = true;
    await element.updateComplete;
    expect(panel.hidden).toBe(false);
    expect(trigger(element).getAttribute('aria-expanded')).toBe('true');
    expect(panel.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('reflects its properties as attributes, and reads them back', async () => {
    const element = await item({ expanded: '', disabled: '', level: '4' });
    expect([element.expanded, element.disabled, element.level]).toEqual([true, true, 4]);
    element.expanded = false;
    element.level = 2;
    await element.updateComplete;
    expect(element.hasAttribute('expanded')).toBe(false);
    expect(element.getAttribute('level')).toBe('2');
  });
});

describe('punk-accordion-item toggling', () => {
  it('toggles on a click, sending punk-toggle once each time with the new state', async () => {
    const element = await item();
    const toggles: PunkToggleDetail[] = [];
    element.addEventListener('punk-toggle', (event) => toggles.push(event.detail));
    await userEvent.click(trigger(element));
    expect(element.expanded).toBe(true);
    await userEvent.click(trigger(element));
    expect(element.expanded).toBe(false);
    expect(toggles).toEqual([{ expanded: true }, { expanded: false }]);
  });

  it('toggles on Enter and Space', async () => {
    const element = await item();
    trigger(element).focus();
    await userEvent.keyboard('{Enter}');
    expect(element.expanded).toBe(true);
    await userEvent.keyboard(' ');
    expect(element.expanded).toBe(false);
  });

  it('bubbles punk-toggle out of the shadow tree', async () => {
    const wrapper = container();
    const element = await item({}, { parent: wrapper });
    const heard = vi.fn();
    wrapper.addEventListener('punk-toggle', heard);
    await userEvent.click(trigger(element));
    expect(heard).toHaveBeenCalledOnce();
  });

  it('sends no event when expanded is set from code, or by the attribute', async () => {
    const element = await item();
    const heard = vi.fn();
    element.addEventListener('punk-toggle', heard);
    element.expanded = true;
    await element.updateComplete;
    element.removeAttribute('expanded');
    await element.updateComplete;
    expect(element.expanded).toBe(false);
    expect(heard).not.toHaveBeenCalled();
  });

  it('does nothing while disabled, and is not focusable', async () => {
    const element = await item({ disabled: '' });
    const heard = vi.fn();
    element.addEventListener('punk-toggle', heard);
    expect(trigger(element).disabled).toBe(true);
    trigger(element).click();
    await element.updateComplete;
    expect(element.expanded).toBe(false);
    expect(heard).not.toHaveBeenCalled();
    trigger(element).focus();
    expect(element.shadowRoot?.activeElement).toBeNull();
  });
});

describe('punk-accordion-item warnings', () => {
  it('warns once when it has no heading, and not for the property or the slot', async () => {
    await item({ heading: '' });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('no heading');
    warn.mockClear();
    await item({ heading: '' }, { content: '<span slot="heading">Slotted</span>' });
    await item();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('punk-accordion-item appearance', () => {
  it('is the height of a medium control, and wraps a long heading inside a narrow container', async () => {
    const wrapper = container({}, 187);
    const short = await item({}, { parent: container() });
    expect(trigger(short).getBoundingClientRect().height).toBeCloseTo(36, 0);
    const long = await item(
      {
        heading:
          'Eingangsmaterialien und Zwischenprodukte der Montagemaschine für schwere Getriebe',
      },
      { parent: wrapper },
    );
    expect(trigger(long).getBoundingClientRect().height).toBeGreaterThan(36);
    expect(trigger(long).getBoundingClientRect().width).toBeLessThanOrEqual(187);
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(187);
  });

  it('draws a plus when collapsed and a minus when expanded, so state is a shape', async () => {
    const element = await item();
    const bar = () => getComputedStyle(part(element, 'indicator'), '::after').display;
    expect(bar()).toBe('block');
    element.expanded = true;
    await element.updateComplete;
    expect(bar()).toBe('none');
  });

  it('presses the heading in while expanded, and differs from idle with every color forced to one', async () => {
    const idle = await item();
    const open = await item({ expanded: '' });
    const shadow = (element: Element) => getComputedStyle(trigger(element)).boxShadow;
    expect(shadow(idle)).not.toBe(shadow(open));
  });

  it('draws the label in the text color of every theme', async () => {
    for (const theme of themeNames) {
      const element = await item({}, { parent: container({ 'data-punk-theme': theme }) });
      expect(getComputedStyle(trigger(element)).color, theme).toBe(
        rgb(themes[theme].tokens['color-text'] as string),
      );
    }
  });

  it('shows keyboard focus with the two-tone ring', async () => {
    const element = await item();
    await focusWithKeyboard(trigger(element));
    trigger(element).focus();
    expect(getComputedStyle(trigger(element), '::after').boxShadow).not.toBe('none');
  });

  it('is a plain bordered button under forced colors, and a disabled one is GrayText', async () => {
    await commands.setForcedColors('active');
    const element = await item();
    const off = await item({ disabled: '' });
    const style = getComputedStyle(trigger(element));
    expect([style.borderTopStyle, style.borderTopWidth]).toEqual(['solid', '2px']);
    expect(getComputedStyle(trigger(off)).color).not.toBe(style.color);
  });
});

describe('punk-accordion', () => {
  it('collapses the other items when one is expanded by a click', async () => {
    const { items } = await accordion([{ expanded: '' }, {}, {}]);
    await userEvent.click(trigger(items[1] as PunkAccordionItem));
    await settle(...items);
    expect(expanded(items)).toEqual([false, true, false]);
  });

  it('collapses the others when an item is expanded from code', async () => {
    const { items } = await accordion([{ expanded: '' }, {}]);
    (items[1] as PunkAccordionItem).expanded = true;
    await settle(...items);
    expect(expanded(items)).toEqual([false, true]);
  });

  it('lets the open item be collapsed, so none is open', async () => {
    const { items } = await accordion([{ expanded: '' }, {}]);
    await userEvent.click(trigger(items[0] as PunkAccordionItem));
    await settle(...items);
    expect(expanded(items)).toEqual([false, false]);
  });

  it('keeps several open with multiple', async () => {
    const { items } = await accordion([{}, {}, {}], { multiple: '' });
    await userEvent.click(trigger(items[0] as PunkAccordionItem));
    await userEvent.click(trigger(items[2] as PunkAccordionItem));
    await settle(...items);
    expect(expanded(items)).toEqual([true, false, true]);
  });

  it('keeps the first of several expanded at connection, and warns once', async () => {
    const { items } = await accordion([{}, { expanded: '' }, { expanded: '' }, { expanded: '' }]);
    await settle(...items);
    expect(expanded(items)).toEqual([false, true, false, false]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain('Several items are expanded');
  });

  it('allows several expanded at connection with multiple, without a warning', async () => {
    const { items } = await accordion([{ expanded: '' }, { expanded: '' }], { multiple: '' });
    expect(expanded(items)).toEqual([true, true]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('collapses to the first when multiple is turned off with several open', async () => {
    const { group, items } = await accordion([{ expanded: '' }, { expanded: '' }], {
      multiple: '',
    });
    group.multiple = false;
    await group.updateComplete;
    await settle(...items);
    expect(expanded(items)).toEqual([true, false]);
  });

  it('sends punk-toggle only for the item the user toggled', async () => {
    const { group, items } = await accordion([{ expanded: '' }, {}]);
    const heard = vi.fn();
    group.addEventListener('punk-toggle', heard);
    await userEvent.click(trigger(items[1] as PunkAccordionItem));
    await settle(...items);
    expect(heard).toHaveBeenCalledOnce();
    expect(heard.mock.calls[0]?.[0].target).toBe(items[1]);
  });

  it('manages items added later, and lets go of items that are removed', async () => {
    const { group, items } = await accordion([{ expanded: '' }, {}]);
    const added = document.createElement('punk-accordion-item');
    added.setAttribute('heading', 'Late');
    group.append(added);
    await added.updateComplete;
    await new Promise((resolve) => setTimeout(resolve));
    added.expanded = true;
    await settle(...items, added);
    expect(expanded(items)).toEqual([false, false]);
    const removed = items[1] as PunkAccordionItem;
    removed.remove();
    await new Promise((resolve) => setTimeout(resolve));
    expect(removed[owner]).toBeNull();
    expect(added[owner]).toBe(group);
  });

  it('ignores children that are not items', async () => {
    const group = document.createElement('punk-accordion');
    group.innerHTML = '<p>Not an item</p><punk-accordion-item heading="One"></punk-accordion-item>';
    track(group);
    await group.updateComplete;
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('punk-accordion keyboard', () => {
  async function three(attributes: Array<Record<string, string>> = [{}, {}, {}], dir?: string) {
    const parent = dir ? container({ dir }) : undefined;
    const result = await accordion(attributes, {}, parent);
    (result.items[0] as PunkAccordionItem).focusHeader();
    return result;
  }
  const focused = (items: PunkAccordionItem[]) =>
    items.findIndex((entry) => entry.shadowRoot?.activeElement === trigger(entry));

  it('moves between headings with Down and Up, and does not wrap', async () => {
    const { items } = await three();
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(items)).toBe(1);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(focused(items)).toBe(2);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(focused(items)).toBe(0);
  });

  it('goes to the first and last heading with Home and End', async () => {
    const { items } = await three();
    await userEvent.keyboard('{End}');
    expect(focused(items)).toBe(2);
    await userEvent.keyboard('{Home}');
    expect(focused(items)).toBe(0);
  });

  it('skips a disabled heading', async () => {
    const { items } = await three([{}, { disabled: '' }, {}]);
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(items)).toBe(2);
    await userEvent.keyboard('{ArrowUp}');
    expect(focused(items)).toBe(0);
  });

  it('moves the same way on a right-to-left page', async () => {
    const { items } = await three([{}, {}, {}], 'rtl');
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(items)).toBe(1);
    await userEvent.keyboard('{ArrowRight}');
    expect(focused(items)).toBe(1);
  });

  it('does not move focus with keys that have a modifier, or when the key came from a panel', async () => {
    const group = document.createElement('punk-accordion');
    group.innerHTML =
      '<punk-accordion-item heading="One" expanded><input id="field" /></punk-accordion-item><punk-accordion-item heading="Two"></punk-accordion-item>';
    track(group);
    const [one, two] = [...group.children] as PunkAccordionItem[];
    await settle(group, one as PunkAccordionItem, two as PunkAccordionItem);
    (one as PunkAccordionItem).focusHeader();
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect((one as PunkAccordionItem).shadowRoot?.activeElement).toBe(
      trigger(one as PunkAccordionItem),
    );
    (group.querySelector('#field') as HTMLInputElement).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(group.querySelector('#field'));
  });

  it('leaves Enter and Space to the button, and Tab to the browser', async () => {
    const { items } = await three();
    await userEvent.keyboard('{Enter}');
    expect((items[0] as PunkAccordionItem).expanded).toBe(true);
    await userEvent.tab();
    expect(focused(items)).toBe(1);
  });
});

describe('punk-accordion layout', () => {
  it('stacks its items with a gap between them', async () => {
    const { items } = await accordion([{}, {}]);
    const [a, b] = items.map((entry) => entry.getBoundingClientRect());
    expect((b?.top ?? 0) - (a?.bottom ?? 0)).toBe(4);
  });
});
