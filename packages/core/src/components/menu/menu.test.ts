import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkMenu, PunkMenuItem } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const items = `
  <punk-menu-item value="new">New</punk-menu-item>
  <punk-menu-item value="open" disabled>Open</punk-menu-item>
  <punk-menu-item value="save">Save<span slot="shortcut">Ctrl+S</span></punk-menu-item>
  <hr>
  <punk-menu-item value="export">Export</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="png">PNG</punk-menu-item>
    <punk-menu-item value="svg">SVG</punk-menu-item>
  </punk-menu>
  <hr>
  <punk-menu-item type="checkbox" value="grid" checked>Show grid</punk-menu-item>
  <punk-menu-item type="radio" value="small" checked>Small</punk-menu-item>
  <punk-menu-item type="radio" value="large">Large</punk-menu-item>
`;

async function mount(inner = items, dir = 'ltr') {
  const holder = track(document.createElement('div'));
  holder.dir = dir;
  holder.innerHTML = `<button id="trigger">File</button><punk-menu>${inner}</punk-menu><button id="after">After</button>`;
  const menu = holder.querySelector('punk-menu') as PunkMenu;
  const trigger = holder.querySelector('#trigger') as HTMLButtonElement;
  await menu.updateComplete;
  const submenu = menu.querySelector('punk-menu') as PunkMenu;
  await submenu?.updateComplete;
  return { holder, menu, trigger, submenu };
}

const item = (menu: Element, value: string) =>
  menu.querySelector(`punk-menu-item[value="${value}"]`) as PunkMenuItem;
const settle = async (...menus: PunkMenu[]) => {
  for (const menu of menus) await menu.updateComplete;
};

describe('opening and closing', () => {
  it('wires the trigger, opens on a click with focus on the first item, and closes on Escape', async () => {
    const { menu, trigger } = await mount();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(menu.hasAttribute('role')).toBe(false);
    const closes: string[] = [];
    menu.addEventListener('punk-close', (event) => closes.push(event.detail.reason));
    await userEvent.click(trigger);
    await settle(menu);
    expect(menu.open).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(page.getByRole('menu').element()).toBe(menu);
    expect(document.activeElement).toBe(item(menu, 'new'));
    await userEvent.keyboard('{Escape}');
    await settle(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(closes).toEqual(['escape']);
  });

  it('opens on Down at the first item and on Up at the last', async () => {
    const { menu, trigger } = await mount();
    trigger.focus();
    await userEvent.keyboard('{ArrowUp}');
    await settle(menu);
    expect(document.activeElement).toBe(item(menu, 'large'));
    menu.hide();
    await settle(menu);
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await settle(menu);
    expect(document.activeElement).toBe(item(menu, 'new'));
  });

  it('closes on a press outside, and on Tab with focus moving on from the trigger', async () => {
    const { menu, trigger, holder } = await mount();
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.click(holder.querySelector('#after') as HTMLElement);
    await settle(menu);
    expect(menu.open).toBe(false);
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.keyboard('{Tab}');
    await settle(menu);
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(holder.querySelector('#after'));
  });

  it('holds no listener while closed', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { menu, trigger } = await mount();
    expect(add).not.toHaveBeenCalled();
    await userEvent.click(trigger);
    await settle(menu);
    expect(add.mock.calls.map((call) => call[0]).sort()).toEqual(['keydown', 'pointerdown']);
    menu.hide();
    await settle(menu);
    expect(remove.mock.calls.map((call) => call[0]).sort()).toEqual(['keydown', 'pointerdown']);
  });
});

describe('keyboard', () => {
  it('moves without wrapping, skipping disabled items, and by first letter', async () => {
    const { menu, trigger } = await mount();
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item(menu, 'new'));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item(menu, 'save'));
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(item(menu, 'large'));
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item(menu, 'large'));
    await userEvent.keyboard('e');
    expect(document.activeElement).toBe(item(menu, 'export'));
    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(item(menu, 'new'));
  });

  it('activates a plain item with Enter, which closes the menu', async () => {
    const { menu, trigger } = await mount();
    const activated: string[] = [];
    menu.addEventListener('punk-activate', (event) => activated.push(event.detail.value));
    const closes: string[] = [];
    menu.addEventListener('punk-close', (event) => closes.push(event.detail.reason));
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await settle(menu);
    expect(activated).toEqual(['save']);
    expect(closes).toEqual(['action']);
    expect(document.activeElement).toBe(trigger);
  });

  it('toggles a checkbox item and chooses a radio item, and stays open', async () => {
    const { menu, trigger } = await mount();
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.click(item(menu, 'grid'));
    await userEvent.click(item(menu, 'large'));
    await settle(menu);
    expect(menu.open).toBe(true);
    expect(item(menu, 'grid').getAttribute('aria-checked')).toBe('false');
    await item(menu, 'small').updateComplete;
    expect(item(menu, 'small').getAttribute('aria-checked')).toBe('false');
    expect(item(menu, 'large').getAttribute('aria-checked')).toBe('true');
    expect(page.getByRole('menuitemradio', { name: 'Large' }).element()).toBe(item(menu, 'large'));
  });

  it('does not activate a disabled item', async () => {
    const { menu, trigger } = await mount();
    const listener = vi.fn();
    item(menu, 'open').addEventListener('click', listener);
    await userEvent.click(trigger);
    await settle(menu);
    item(menu, 'open').click();
    expect(listener).not.toHaveBeenCalled();
    expect(menu.open).toBe(true);
  });

  for (const dir of ['ltr', 'rtl']) {
    it(`opens a submenu with the arrow toward the end, and closes it the other way, in ${dir}`, async () => {
      const { menu, trigger, submenu } = await mount(items, dir);
      const [into, back] =
        dir === 'rtl' ? ['{ArrowLeft}', '{ArrowRight}'] : ['{ArrowRight}', '{ArrowLeft}'];
      await userEvent.click(trigger);
      await settle(menu);
      const exportItem = item(menu, 'export');
      expect(exportItem.getAttribute('aria-haspopup')).toBe('menu');
      exportItem.focus();
      await userEvent.keyboard(into);
      await settle(submenu);
      expect(submenu.open).toBe(true);
      expect(exportItem.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(item(submenu, 'png'));
      await userEvent.keyboard(back);
      await settle(submenu);
      expect(submenu.open).toBe(false);
      expect(document.activeElement).toBe(exportItem);
      expect(menu.open).toBe(true);
    });
  }

  it('closes only the submenu on Escape, and every menu on an activation inside it', async () => {
    const { menu, trigger, submenu } = await mount();
    const activated = vi.fn();
    menu.addEventListener('punk-activate', activated);
    await userEvent.click(trigger);
    await settle(menu);
    await userEvent.click(item(menu, 'export'));
    await settle(submenu);
    expect(submenu.open).toBe(true);
    await userEvent.keyboard('{Escape}');
    await settle(submenu);
    expect([menu.open, submenu.open]).toEqual([true, false]);
    expect(document.activeElement).toBe(item(menu, 'export'));
    await userEvent.keyboard('{Enter}');
    await settle(submenu);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await settle(menu, submenu);
    expect([menu.open, submenu.open]).toEqual([false, false]);
    expect(activated.mock.calls[0]?.[0].detail.value).toBe('svg');
    expect(document.activeElement).toBe(trigger);
  });
});

describe('context menu', () => {
  it('opens at the pointer on a right click in its area', async () => {
    const holder = track(document.createElement('div'));
    holder.innerHTML = `<div id="area" tabindex="0" style="margin: 40px; inline-size: 300px; block-size: 200px">Area</div><punk-menu for="area" context>${items}</punk-menu>`;
    const menu = holder.querySelector('punk-menu') as PunkMenu;
    await menu.updateComplete;
    const area = holder.querySelector('#area') as HTMLElement;
    expect(area.hasAttribute('aria-haspopup')).toBe(false);
    const box = area.getBoundingClientRect();
    area.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: box.left + 100,
        clientY: box.top + 50,
      }),
    );
    await settle(menu);
    expect(menu.open).toBe(true);
    const surface = menu.shadowRoot?.querySelector('[part="surface"]') as HTMLElement;
    expect(Math.abs(surface.getBoundingClientRect().left - (box.left + 100))).toBeLessThan(2);
    expect(document.activeElement).toBe(item(menu, 'new'));
    await userEvent.click(area, { position: { x: 290, y: 10 } });
    await settle(menu);
    expect(menu.open).toBe(false);
  });
});

describe('warnings', () => {
  it('warns when there is no trigger, and when there is nothing to focus', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    const holder = track(document.createElement('div'));
    holder.innerHTML = '<punk-menu><punk-menu-item>Lonely</punk-menu-item></punk-menu>';
    await (holder.firstElementChild as PunkMenu).updateComplete;
    expect(warn).toHaveBeenCalledWith(
      '<punk-menu> No trigger found. Set `for` to an element id or place it after its trigger.',
    );
    warn.mockClear();
    const { menu } = await mount('<punk-menu-item disabled>Off</punk-menu-item>');
    menu.show();
    await settle(menu);
    expect(warn).toHaveBeenCalledWith('<punk-menu> It has no enabled `punk-menu-item` to focus.');
  });
});
