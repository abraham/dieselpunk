import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkSplitter } from './index.ts';

afterEach(async () => {
  cleanup();
  await setLocale('en');
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const panes = '<div slot="start">Map</div><div slot="end">Details</div>';

async function mount(
  attributes = '',
  options: { dir?: string; height?: number } = {},
): Promise<PunkSplitter> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '408px';
  if (options.dir) wrapper.dir = options.dir;
  wrapper.innerHTML = `<punk-splitter ${attributes} style="block-size: ${options.height ?? 200}px">${panes}</punk-splitter>`;
  const element = wrapper.firstElementChild as PunkSplitter;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const separator = (element: Element) => part(element, 'separator');
const rect = (element: Element) => element.getBoundingClientRect();

function listen(element: PunkSplitter): number[] {
  const values: number[] = [];
  element.addEventListener('punk-split-change', (event) => values.push(event.detail.value));
  return values;
}

async function press(element: PunkSplitter, key: string): Promise<void> {
  separator(element).focus();
  await userEvent.keyboard(key);
  await element.updateComplete;
}

describe('semantics', () => {
  it('is a focusable separator with its value, range, and orientation', async () => {
    const element = await mount('value="30" min="10" max="90"');
    const bar = separator(element);
    expect(bar.getAttribute('role')).toBe('separator');
    expect(bar.tabIndex).toBe(0);
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.getAttribute('aria-valuemin')).toBe('10');
    expect(bar.getAttribute('aria-valuemax')).toBe('90');
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
    expect(bar.getAttribute('aria-controls')).toBe('start');
    expect(element.shadowRoot?.getElementById('start')).toBe(part(element, 'start'));
    const stacked = await mount('orientation="vertical"');
    expect(separator(stacked).getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('is named Resize in the page locale, or by label', async () => {
    const element = await mount();
    expect(page.getByRole('separator', { name: 'Resize' }).element()).toBe(separator(element));
    await setLocale('de');
    await vi.waitFor(() =>
      expect(separator(element).getAttribute('aria-label')).toBe('Größe ändern'),
    );
    const named = await mount('label="Map width"');
    expect(separator(named).getAttribute('aria-label')).toBe('Map width');
  });
});

describe('layout', () => {
  it('gives the start pane its share of the space beside the divider', async () => {
    const element = await mount('value="25"');
    expect(rect(part(element, 'start')).width).toBeCloseTo(100, 0);
    expect(rect(separator(element)).width).toBeCloseTo(8, 0);
    expect(rect(part(element, 'end')).width).toBeCloseTo(300, 0);
    element.value = 75;
    await element.updateComplete;
    expect(rect(part(element, 'start')).width).toBeCloseTo(300, 0);
  });

  it('puts the start pane on the right in right-to-left text', async () => {
    const element = await mount('value="25"', { dir: 'rtl' });
    expect(rect(part(element, 'start')).left).toBeGreaterThan(rect(part(element, 'end')).left);
  });

  it('stacks the panes when vertical', async () => {
    const element = await mount('orientation="vertical" value="25"', { height: 408 });
    expect(rect(part(element, 'start')).height).toBeCloseTo(100, 0);
    expect(rect(part(element, 'end')).top).toBeGreaterThan(rect(part(element, 'start')).bottom);
  });

  it('clamps a value outside the range, and repairs an inverted range with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('value="95" min="10" max="80"');
    expect(separator(element).getAttribute('aria-valuenow')).toBe('80');
    const inverted = await mount('min="80" max="10"');
    expect(separator(inverted).getAttribute('aria-valuemax')).toBe('100');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '<punk-splitter> Its `min` is above its `max`',
    );
  });
});

describe('keyboard', () => {
  it('moves by step with Left and Right, and to the ends with Home and End', async () => {
    const element = await mount('value="50" step="10"');
    const values = listen(element);
    await press(element, '{ArrowRight}');
    await press(element, '{ArrowLeft}{ArrowLeft}');
    await press(element, '{End}');
    await press(element, '{Home}');
    expect(values).toEqual([60, 50, 40, 100, 0]);
    expect(element.value).toBe(0);
  });

  it('leaves Up and Down to the page when side by side, and Left and Right when stacked', async () => {
    const element = await mount('value="50"');
    separator(element).focus();
    const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    separator(element).dispatchEvent(up);
    expect(up.defaultPrevented).toBe(false);
    const stacked = await mount('orientation="vertical" value="50"');
    const values = listen(stacked);
    await press(stacked, '{ArrowDown}');
    await press(stacked, '{ArrowUp}{ArrowUp}');
    const left = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    separator(stacked).dispatchEvent(left);
    expect(left.defaultPrevented).toBe(false);
    expect(values).toEqual([55, 50, 45]);
  });

  it('swaps Left and Right in right-to-left text', async () => {
    const element = await mount('value="50"', { dir: 'rtl' });
    await press(element, '{ArrowLeft}');
    expect(element.value).toBe(55);
  });

  it('collapses the start pane with Enter, and restores it', async () => {
    const element = await mount('value="40" min="10"');
    const values = listen(element);
    await press(element, '{Enter}');
    expect(element.value).toBe(10);
    await press(element, '{Enter}');
    expect(element.value).toBe(40);
    expect(values).toEqual([10, 40]);
  });

  it('sends nothing at an end, or for a change from script', async () => {
    const element = await mount('value="100"');
    const values = listen(element);
    await press(element, '{ArrowRight}{End}');
    element.value = 30;
    await element.updateComplete;
    expect(values).toEqual([]);
  });
});

describe('pointer', () => {
  it('follows a drag, sending each change, and reads the layout once', async () => {
    const element = await mount('value="50"');
    const values = listen(element);
    const box = rect(element);
    const read = vi.spyOn(
      part(element, 'start').parentElement as HTMLElement,
      'getBoundingClientRect',
    );
    await userEvent.dragAndDrop(separator(element), element, {
      targetPosition: { x: 4 + 100, y: box.height / 2 },
    });
    expect(element.value).toBeCloseTo(25, 0);
    expect(values.length).toBeGreaterThanOrEqual(1);
    expect(values.at(-1)).toBe(element.value);
    expect(read).toHaveBeenCalledTimes(1);
    expect(element.shadowRoot?.activeElement).toBe(separator(element));
  });

  it('follows a drag down a stacked splitter', async () => {
    const element = await mount('orientation="vertical" value="50"', { height: 408 });
    const box = rect(element);
    await userEvent.dragAndDrop(separator(element), element, {
      targetPosition: { x: box.width / 2, y: 4 + 300 },
    });
    expect(element.value).toBeCloseTo(75, 0);
  });

  it('keeps the divider inside the range when the pointer goes past it', async () => {
    const element = await mount('value="50" max="80"');
    const box = rect(element);
    await userEvent.dragAndDrop(separator(element), element, {
      targetPosition: { x: box.width - 1, y: box.height / 2 },
    });
    expect(element.value).toBe(80);
  });
});

describe('forced colors', () => {
  it('keeps the divider and its grip visible', async () => {
    await commands.setForcedColors('active');
    const element = await mount();
    expect(getComputedStyle(separator(element)).borderTopStyle).toBe('solid');
    const grip = separator(element).querySelector('.grip') as HTMLElement;
    expect(getComputedStyle(grip).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
