import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkMenu, PunkMenuItem } from '../menu/index.ts';
import type { PunkMenubar } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const bar = `
  <punk-menu-item>File</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="new">New</punk-menu-item>
    <punk-menu-item value="open">Open</punk-menu-item>
  </punk-menu>
  <punk-menu-item>Edit</punk-menu-item>
  <punk-menu>
    <punk-menu-item value="undo">Undo</punk-menu-item>
    <punk-menu-item value="export">Export</punk-menu-item>
    <punk-menu><punk-menu-item value="png">PNG</punk-menu-item></punk-menu>
  </punk-menu>
  <punk-menu-item disabled>View</punk-menu-item>
  <punk-menu><punk-menu-item value="zoom">Zoom</punk-menu-item></punk-menu>
  <punk-menu-item>Help</punk-menu-item>
  <punk-menu><punk-menu-item value="about">About</punk-menu-item></punk-menu>
`;

async function mount(attributes = 'aria-label="Application"', inner = bar, dir = 'ltr') {
  const holder = track(document.createElement('div'));
  holder.dir = dir;
  holder.innerHTML = `<punk-menubar ${attributes}>${inner}</punk-menubar><button id="after">After</button>`;
  const menubar = holder.querySelector('punk-menubar') as PunkMenubar;
  await settle(menubar);
  return menubar;
}

async function settle(menubar: PunkMenubar): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  const all = [
    menubar,
    ...menubar.querySelectorAll<PunkMenu | PunkMenuItem>('punk-menu, punk-menu-item'),
  ];
  await Promise.all(all.map((element) => element.updateComplete));
}

const top = (menubar: Element) =>
  [...menubar.children].filter((child) => child.localName === 'punk-menu-item') as PunkMenuItem[];
const named = (menubar: Element, text: string) =>
  top(menubar).find((item) => item.textContent?.trim() === text) as PunkMenuItem;
const menuOf = (item: Element) => item.nextElementSibling as PunkMenu;
const item = (menubar: Element, value: string) =>
  menubar.querySelector(`punk-menu-item[value="${value}"]`) as PunkMenuItem;

async function press(menubar: PunkMenubar, keys: string): Promise<void> {
  await userEvent.keyboard(keys);
  await settle(menubar);
}

describe('semantics', () => {
  it('is a horizontal menubar named by aria-label, of menu items that open menus', async () => {
    const menubar = await mount();
    const row = menubar.shadowRoot?.querySelector('[part="bar"]') as HTMLElement;
    expect(page.getByRole('menubar', { name: 'Application' }).element()).toBe(row);
    expect(row.getAttribute('aria-orientation')).toBe('horizontal');
    const file = named(menubar, 'File');
    expect(file.getAttribute('role')).toBe('menuitem');
    expect(file.getAttribute('aria-haspopup')).toBe('menu');
    expect(file.getAttribute('aria-expanded')).toBe('false');
    expect(warn).not.toHaveBeenCalled();
  });

  it('is one tab stop, and draws no submenu arrow on its items', async () => {
    const menubar = await mount();
    expect(top(menubar).map((entry) => entry.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
    ]);
    const arrow = named(menubar, 'File').shadowRoot?.querySelector('[part="arrow"]') as HTMLElement;
    expect(getComputedStyle(arrow).display).toBe('none');
    const nested = item(menubar, 'export').shadowRoot?.querySelector(
      '[part="arrow"]',
    ) as HTMLElement;
    expect(getComputedStyle(nested).display).not.toBe('none');
  });

  it('warns when it has no name, and when it has no items', async () => {
    await mount('');
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-menubar> It has no accessible name');
    await mount('aria-label="Empty"', '');
    expect(String(warn.mock.calls[1]?.[0])).toContain('It has no `punk-menu-item` children.');
  });
});

describe('the row', () => {
  it('moves with Left and Right past a disabled item, without wrapping, and to the ends', async () => {
    const menubar = await mount();
    named(menubar, 'File').focus();
    await press(menubar, '{ArrowLeft}');
    expect(document.activeElement).toBe(named(menubar, 'File'));
    await press(menubar, '{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(named(menubar, 'Help'));
    await press(menubar, '{Home}');
    expect(document.activeElement).toBe(named(menubar, 'File'));
    await press(menubar, '{End}');
    expect(document.activeElement).toBe(named(menubar, 'Help'));
    expect(named(menubar, 'Help').getAttribute('tabindex')).toBe('0');
  });

  it('swaps Left and Right in right-to-left text', async () => {
    const menubar = await mount('aria-label="Application"', bar, 'rtl');
    named(menubar, 'File').focus();
    await press(menubar, '{ArrowLeft}');
    expect(document.activeElement).toBe(named(menubar, 'Edit'));
  });

  it.each(['{Enter}', ' ', '{ArrowDown}'])(
    'opens the menu on its first item with %j',
    async (key) => {
      const menubar = await mount();
      named(menubar, 'File').focus();
      await press(menubar, key);
      expect(menuOf(named(menubar, 'File')).open).toBe(true);
      expect(named(menubar, 'File').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(item(menubar, 'new'));
    },
  );

  it('keeps the item of the open menu highlighted after focus moves into the menu', async () => {
    const menubar = await mount();
    const look = (entry: Element) =>
      getComputedStyle(entry.shadowRoot?.querySelector('[part="item"]') as Element).backgroundColor;
    const closed = look(named(menubar, 'Help'));
    named(menubar, 'File').focus();
    await press(menubar, '{Enter}');
    expect(document.activeElement).toBe(item(menubar, 'new'));
    expect(look(named(menubar, 'File'))).not.toBe(closed);
    expect(look(named(menubar, 'Edit'))).toBe(closed);
  });

  it('opens the menu on its last item with Up, and toggles it with a click', async () => {
    const menubar = await mount();
    named(menubar, 'Edit').focus();
    await press(menubar, '{ArrowUp}');
    expect(document.activeElement).toBe(item(menubar, 'export'));
    await press(menubar, '{Escape}');
    await userEvent.click(named(menubar, 'Help'));
    await settle(menubar);
    expect(menuOf(named(menubar, 'Help')).open).toBe(true);
    await userEvent.click(named(menubar, 'Help'));
    await settle(menubar);
    expect(menuOf(named(menubar, 'Help')).open).toBe(false);
  });
});

describe('an open menu', () => {
  it('goes to the next and previous item menus with Right and Left', async () => {
    const menubar = await mount();
    named(menubar, 'File').focus();
    await press(menubar, '{Enter}');
    await press(menubar, '{ArrowRight}');
    expect(menuOf(named(menubar, 'File')).open).toBe(false);
    expect(menuOf(named(menubar, 'Edit')).open).toBe(true);
    expect(document.activeElement).toBe(item(menubar, 'undo'));
    await press(menubar, '{ArrowRight}');
    expect(menuOf(named(menubar, 'Help')).open).toBe(true);
    expect(document.activeElement).toBe(item(menubar, 'about'));
    await press(menubar, '{ArrowRight}');
    expect(document.activeElement).toBe(item(menubar, 'about'));
    await press(menubar, '{ArrowLeft}');
    expect(document.activeElement).toBe(item(menubar, 'undo'));
    expect(named(menubar, 'Edit').getAttribute('tabindex')).toBe('0');
  });

  it('leaves Right and Left to a submenu', async () => {
    const menubar = await mount();
    named(menubar, 'Edit').focus();
    await press(menubar, '{ArrowUp}');
    await press(menubar, '{ArrowRight}');
    expect(document.activeElement).toBe(item(menubar, 'png'));
    await press(menubar, '{ArrowLeft}');
    expect(document.activeElement).toBe(item(menubar, 'export'));
    expect(menuOf(named(menubar, 'Edit')).open).toBe(true);
  });

  it('returns to its item on Escape and after an action, and leaves the row on Tab', async () => {
    const menubar = await mount();
    named(menubar, 'Help').focus();
    await press(menubar, '{Enter}');
    await press(menubar, '{Escape}');
    expect(document.activeElement).toBe(named(menubar, 'Help'));
    const activated: string[] = [];
    menubar.addEventListener('punk-activate', (event) => activated.push(event.detail.value));
    await press(menubar, '{Enter}');
    await press(menubar, '{Enter}');
    expect(activated).toEqual(['about']);
    expect(menuOf(named(menubar, 'Help')).open).toBe(false);
    expect(document.activeElement).toBe(named(menubar, 'Help'));
    await press(menubar, '{Enter}');
    await press(menubar, '{Tab}');
    expect(menuOf(named(menubar, 'Help')).open).toBe(false);
    expect(document.activeElement?.id).toBe('after');
  });
});
