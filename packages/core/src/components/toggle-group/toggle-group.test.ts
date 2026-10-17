import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkToggleGroup } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const buttons = `
  <button value="grid">Grid</button>
  <button value="list">List</button>
  <button value="table" disabled>Table</button>
  <button value="map">Map</button>
`;

async function mount(attributes = 'aria-label="View"', inner = buttons, dir = 'ltr') {
  const holder = track(document.createElement('div'));
  holder.dir = dir;
  holder.innerHTML = `<punk-toggle-group ${attributes}>${inner}</punk-toggle-group>`;
  const group = holder.firstElementChild as PunkToggleGroup;
  await group.updateComplete;
  const items = [...group.querySelectorAll('button')];
  return { group, items };
}

const attrs = (items: HTMLButtonElement[], name: string) =>
  items.map((item) => item.getAttribute(name));

describe('single', () => {
  it('is a radiogroup of radio buttons with one tab stop', async () => {
    const { group, items } = await mount();
    group.values = ['list'];
    expect(page.getByRole('radiogroup', { name: 'View' }).element()).toBeTruthy();
    expect(attrs(items, 'role')).toEqual(['radio', 'radio', 'radio', 'radio']);
    expect(attrs(items, 'aria-checked')).toEqual(['false', 'true', 'false', 'false']);
    expect(attrs(items, 'tabindex')).toEqual(['-1', '0', '-1', '-1']);
  });

  for (const dir of ['ltr', 'rtl']) {
    it(`moves and chooses with the arrows, skipping disabled buttons, in ${dir}`, async () => {
      const { group, items } = await mount('aria-label="View"', buttons, dir);
      const changes: string[][] = [];
      group.addEventListener('punk-selection-change', (event) => changes.push(event.detail.values));
      items[0]?.focus();
      await userEvent.keyboard(dir === 'rtl' ? '{ArrowLeft}' : '{ArrowRight}');
      expect(group.values).toEqual(['list']);
      await userEvent.keyboard('{ArrowDown}');
      expect(group.values).toEqual(['map']);
      expect(document.activeElement).toBe(items[3]);
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Home}');
      expect(group.values).toEqual(['grid']);
      expect(changes).toEqual([['list'], ['map'], ['grid']]);
    });
  }

  it('chooses on click and keeps one pressed, sending once per change', async () => {
    const { group, items } = await mount();
    const change = vi.fn();
    group.addEventListener('punk-selection-change', change);
    await userEvent.click(items[1] as HTMLButtonElement);
    await userEvent.click(items[1] as HTMLButtonElement);
    expect(group.values).toEqual(['list']);
    expect(change).toHaveBeenCalledTimes(1);
    expect(change.mock.calls[0]?.[0].detail.items).toEqual([items[1]]);
  });

  it('starts from the buttons the markup marked, and sends nothing for values set from code', async () => {
    const { group, items } = await mount(
      'aria-label="View"',
      '<button value="a">A</button><button value="b" aria-checked="true">B</button>',
    );
    expect(group.values).toEqual(['b']);
    const change = vi.fn();
    group.addEventListener('punk-selection-change', change);
    group.values = ['a'];
    expect(attrs(items, 'aria-checked')).toEqual(['true', 'false']);
    expect(change).not.toHaveBeenCalled();
  });
});

describe('multiple', () => {
  it('is a group of toggle buttons, pressed and released by click, Enter, and Space', async () => {
    const { group, items } = await mount('aria-label="Filters" selection="multiple"');
    expect(page.getByRole('group', { name: 'Filters' }).element()).toBeTruthy();
    expect(attrs(items, 'role')).toEqual([null, null, null, null]);
    expect(attrs(items, 'aria-pressed')).toEqual(['false', 'false', 'false', 'false']);
    await userEvent.click(items[0] as HTMLButtonElement);
    await userEvent.keyboard('{ArrowRight}');
    expect(group.values).toEqual(['grid']);
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    expect(group.values).toEqual(['grid', 'list', 'map']);
    await userEvent.click(items[0] as HTMLButtonElement);
    expect(group.values).toEqual(['list', 'map']);
    expect(attrs(items, 'tabindex')).toEqual(['0', '-1', '-1', '-1']);
  });
});

describe('ownership', () => {
  it('gives back what the author had when a button leaves or the group disconnects', async () => {
    const { group, items } = await mount(
      'aria-label="View"',
      '<button value="a" tabindex="3" role="switch">A</button><button value="b">B</button>',
    );
    const [first, second] = items as [HTMLButtonElement, HTMLButtonElement];
    expect(first.getAttribute('role')).toBe('radio');
    first.remove();
    track(first);
    await new Promise((resolve) => setTimeout(resolve));
    expect([first.getAttribute('tabindex'), first.getAttribute('role')]).toEqual(['3', 'switch']);
    expect(first.hasAttribute('aria-checked')).toBe(false);
    group.remove();
    expect(second.hasAttribute('tabindex')).toBe(false);
    expect(second.hasAttribute('role')).toBe(false);
  });

  it('disables the buttons that were enabled, and only those again', async () => {
    const { group, items } = await mount();
    group.disabled = true;
    await group.updateComplete;
    expect(items.every((item) => item.disabled)).toBe(true);
    group.disabled = false;
    await group.updateComplete;
    expect(items.map((item) => item.disabled)).toEqual([false, false, true, false]);
  });

  it('warns about a missing name and a child that is not a button', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await mount('', '<button value="a">A</button><span>B</span>');
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '<punk-toggle-group> It contains elements that are not `<button>`, so they are ignored.',
      '<punk-toggle-group> It has no accessible name. Set `aria-label`.',
    ]);
  });
});

describe('look', () => {
  it('sets a pressed button in, with a different shape from a raised one, also under forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const { group, items } = await mount();
      group.values = ['grid'];
      const look = (item: HTMLButtonElement) => {
        const style = getComputedStyle(item);
        return [
          style.boxShadow.replace(/rgba?\([^)]*\)/g, 'C'),
          style.borderTopStyle,
          style.borderTopWidth,
        ].join();
      };
      expect(look(items[0] as HTMLButtonElement)).not.toBe(look(items[1] as HTMLButtonElement));
    }
  });
});
