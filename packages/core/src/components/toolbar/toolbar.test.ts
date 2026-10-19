import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import '../button/register.ts';
import './register.ts';
import type { PunkOverflowDetail, PunkToolbar } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const frames = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve))),
  );

interface Options {
  width?: number;
  count?: number;
  attributes?: string;
  trigger?: boolean;
  dir?: string;
  /** Replaces the generated items. */
  items?: string;
}

const item = (index: number) =>
  `<button style="inline-size: 60px; flex: none">Item ${index}</button>`;

async function mount(options: Options = {}) {
  const { count = 3, trigger = false } = options;
  const wrapper = track(document.createElement('div'));
  if (options.width) wrapper.style.inlineSize = `${options.width}px`;
  if (options.dir) wrapper.dir = options.dir;
  const items =
    options.items ?? Array.from({ length: count }, (_, index) => item(index + 1)).join('');
  wrapper.innerHTML = `<punk-toolbar aria-label="Tools" ${options.attributes ?? ''}>${items}${
    trigger ? '<button slot="overflow" id="more" style="inline-size: 60px">More</button>' : ''
  }</punk-toolbar>`;
  const toolbar = wrapper.querySelector('punk-toolbar') as PunkToolbar;
  await toolbar.updateComplete;
  await frames();
  const strip = toolbar.shadowRoot?.querySelector('.toolbar') as HTMLElement;
  return {
    wrapper,
    toolbar,
    strip,
    items: [...toolbar.querySelectorAll<HTMLElement>(':scope > button:not([slot])')],
  };
}

const tabindexes = (items: HTMLElement[]) => items.map((entry) => entry.getAttribute('tabindex'));
const hiddenOf = (items: HTMLElement[]) =>
  items.map((entry) => entry.hasAttribute('data-punk-overflow'));

describe('structure', () => {
  it('is a labeled horizontal toolbar', async () => {
    const { strip } = await mount();
    expect(strip.getAttribute('role')).toBe('toolbar');
    expect(strip.getAttribute('aria-label')).toBe('Tools');
    expect(strip.getAttribute('aria-orientation')).toBe('horizontal');
    expect(strip.getAttribute('part')).toBe('toolbar');
  });

  it('warns once when it has no accessible name, and not with aria-label', async () => {
    const bare = track(document.createElement('punk-toolbar'));
    await bare.updateComplete;
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain('aria-label');
    warn.mockClear();
    await mount();
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps the strip a fixed minimum height with its items centered', async () => {
    const { strip, items } = await mount();
    const bar = strip.getBoundingClientRect();
    const first = (items[0] as HTMLElement).getBoundingClientRect();
    expect(bar.height).toBeGreaterThanOrEqual(36);
    expect(Math.abs(first.top + first.height / 2 - (bar.top + bar.height / 2))).toBeLessThanOrEqual(
      1,
    );
  });
});

describe('keyboard', () => {
  it('has one tab stop, the first item, and gives tabindex back when removed', async () => {
    const { wrapper, toolbar, items } = await mount();
    expect(tabindexes(items)).toEqual(['0', '-1', '-1']);
    toolbar.remove();
    expect(tabindexes(items)).toEqual([null, null, null]);
    wrapper.append(toolbar);
    await toolbar.updateComplete;
    expect(tabindexes(items)).toEqual(['0', '-1', '-1']);
  });

  it('moves with Left and Right, Home, and End, and does not wrap', async () => {
    const { items } = await mount();
    (items[0] as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(items[2]);
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(document.activeElement).toBe(items[0]);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(items[2]);
  });

  it('swaps the arrows on a right-to-left page', async () => {
    const { items } = await mount({ dir: 'rtl' });
    (items[0] as HTMLElement).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(items[1]);
  });

  it('skips separators and disabled items', async () => {
    const { items } = await mount({
      items: `${item(1)}<hr /><button disabled>Off</button><punk-divider orientation="vertical"></punk-divider>${item(2)}`,
    });
    const buttons = [...document.querySelectorAll<HTMLElement>('punk-toolbar > button')];
    (buttons[0] as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[2]);
    expect(items).toHaveLength(3);
  });

  it('works with punk-button and links, and leaves other controls their own tab stop', async () => {
    const { wrapper } = await mount({
      items: `<punk-button>One</punk-button><a href="#x">Two</a><select><option>A</option></select><input aria-label="Name" /><punk-button>Four</punk-button>`,
    });
    const [one, link, select, input, four] = [
      ...(wrapper.querySelector('punk-toolbar')?.children ?? []),
    ] as HTMLElement[];
    expect(link?.getAttribute('tabindex')).toBe('-1');
    expect(select?.hasAttribute('tabindex')).toBe(false);
    expect(input?.hasAttribute('tabindex')).toBe(false);
    (one as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(link);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(four);
  });

  it('Tab enters at the item that last had focus', async () => {
    const { items } = await mount();
    (items[1] as HTMLElement).focus();
    (items[1] as HTMLElement).blur();
    expect(tabindexes(items)).toEqual(['-1', '0', '-1']);
  });

  it('reads no layout when an arrow key is pressed', async () => {
    const { items } = await mount();
    (items[0] as HTMLElement).focus();
    const read = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Home}');
    expect(read).not.toHaveBeenCalled();
  });
});

describe('overflow', () => {
  it('hides the trailing items that do not fit, shows the trigger, and reports them', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.style.inlineSize = '260px';
    wrapper.innerHTML = `<punk-toolbar aria-label="Tools">${[1, 2, 3, 4, 5, 6].map(item).join('')}<button slot="overflow" id="more" style="inline-size: 60px">More</button></punk-toolbar>`;
    const toolbar = wrapper.querySelector('punk-toolbar') as PunkToolbar;
    const details: PunkOverflowDetail[] = [];
    toolbar.addEventListener('punk-overflow-change', (event) => details.push(event.detail));
    await toolbar.updateComplete;
    await frames();
    const items = [...toolbar.querySelectorAll<HTMLElement>(':scope > button:not([slot])')];
    const flags = hiddenOf(items);
    const visible = flags.filter((flag) => !flag).length;
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(6);
    expect(flags).toEqual(items.map((_, index) => index >= visible));
    expect(details).toHaveLength(1);
    expect(details[0]?.hidden).toEqual(items.slice(visible));
    const strip = toolbar.shadowRoot?.querySelector('.toolbar') as HTMLElement;
    const more = wrapper.querySelector('#more') as HTMLElement;
    expect(more.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
    for (const entry of items.slice(0, visible)) {
      expect(entry.getBoundingClientRect().right).toBeLessThanOrEqual(
        more.getBoundingClientRect().left + 1,
      );
    }
    expect(getComputedStyle(items[5] as HTMLElement).display).toBe('none');
  });

  it('shows everything again, hides the trigger, and reports an empty set when it fits', async () => {
    const { wrapper, toolbar, items } = await mount({ count: 6, width: 260, trigger: true });
    const details: PunkOverflowDetail[] = [];
    toolbar.addEventListener('punk-overflow-change', (event) => details.push(event.detail));
    expect(hiddenOf(items).some(Boolean)).toBe(true);
    wrapper.style.inlineSize = '800px';
    await frames();
    expect(hiddenOf(items).some(Boolean)).toBe(false);
    expect(details.at(-1)?.hidden).toEqual([]);
    expect((wrapper.querySelector('#more') as HTMLElement).getBoundingClientRect().width).toBe(0);
  });

  it('does not end the visible items with a separator', async () => {
    const { toolbar } = await mount({
      width: 260,
      trigger: true,
      items: `${item(1)}${item(2)}<hr style="inline-size: 1px; margin: 0" />${item(3)}${item(4)}${item(5)}`,
    });
    const children = [...toolbar.children].filter(
      (child) => !child.hasAttribute('slot'),
    ) as HTMLElement[];
    const visible = children.filter((child) => !child.hasAttribute('data-punk-overflow'));
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.at(-1)?.localName).not.toBe('hr');
  });

  it('never lists a separator among the hidden items', async () => {
    const { toolbar } = await mount({
      width: 200,
      trigger: true,
      items: `${item(1)}<hr />${item(2)}${item(3)}`,
    });
    const details: PunkOverflowDetail[] = [];
    toolbar.addEventListener('punk-overflow-change', (event) => details.push(event.detail));
    toolbar.style.inlineSize = '150px';
    await frames();
    for (const detail of details)
      expect(detail.hidden.some((entry) => entry.localName === 'hr')).toBe(false);
  });

  it('leaves hidden items out of the arrow keys', async () => {
    const { items } = await mount({ count: 6, width: 260, trigger: true });
    const visible = hiddenOf(items).filter((flag) => !flag).length;
    (items[0] as HTMLElement).focus();
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(items[visible - 1]);
  });

  it('moves focus to the overflow trigger when the focused item stops fitting', async () => {
    const { wrapper, items } = await mount({ count: 6, width: 800, trigger: true });
    (items[5] as HTMLElement).focus();
    wrapper.style.inlineSize = '260px';
    await frames();
    expect(items[5]?.hasAttribute('data-punk-overflow')).toBe(true);
    expect(document.activeElement).toBe(wrapper.querySelector('#more'));
  });

  it('hides nothing and scrolls inside itself with no overflow content, and warns once', async () => {
    const { toolbar, strip, items } = await mount({ count: 6, width: 200 });
    expect(hiddenOf(items).some(Boolean)).toBe(false);
    expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth);
    expect(getComputedStyle(strip).overflowX).toBe('auto');
    toolbar.style.inlineSize = '180px';
    await frames();
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('overflow'))).toHaveLength(1);
  });

  it('creates one ResizeObserver however many items it has, and none with wrap', async () => {
    const Original = window.ResizeObserver;
    let created = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class extends Original {
        constructor(callback: ResizeObserverCallback) {
          super(callback);
          created++;
        }
      },
    );
    await mount({ count: 12, width: 300, trigger: true });
    expect(created).toBe(1);
    created = 0;
    await mount({ count: 12, width: 300, trigger: true, attributes: 'wrap' });
    expect(created).toBe(0);
  });

  it('starts and stops observing when wrap changes', async () => {
    const { toolbar, items } = await mount({ count: 6, width: 260, trigger: true });
    expect(hiddenOf(items).some(Boolean)).toBe(true);
    toolbar.wrap = true;
    await toolbar.updateComplete;
    expect(hiddenOf(items).some(Boolean)).toBe(false);
    toolbar.wrap = false;
    await toolbar.updateComplete;
    await frames();
    expect(hiddenOf(items).some(Boolean)).toBe(true);
  });

  it('disconnects the observer when removed', async () => {
    const Original = window.ResizeObserver;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class extends Original {
        override disconnect() {
          disconnect();
          super.disconnect();
        }
      },
    );
    const { toolbar } = await mount({ trigger: true });
    toolbar.remove();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe('vertical', () => {
  const tall = (index: number) =>
    `<button style="inline-size: 36px; block-size: 36px">${index}</button>`;

  it('is a column with Up and Down, Home, and End, and ignores Left and Right', async () => {
    const { toolbar, strip, items } = await mount({
      attributes: 'orientation="vertical"',
      items: [1, 2, 3].map(tall).join(''),
    });
    expect(strip.getAttribute('aria-orientation')).toBe('vertical');
    const [a, b, c] = items.map((entry) => entry.getBoundingClientRect());
    expect(b!.top).toBeGreaterThan(a!.bottom - 1);
    expect(Math.abs(b!.left - a!.left)).toBeLessThanOrEqual(1);
    expect(toolbar.getBoundingClientRect().width).toBeLessThan(80);
    (items[0] as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(items[0]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{End}{ArrowDown}');
    expect(document.activeElement).toBe(items[2]);
    await userEvent.keyboard('{ArrowUp}{Home}');
    expect(document.activeElement).toBe(items[0]);
    expect(c!.top).toBeGreaterThan(b!.top);
  });

  it('hides the trailing items that do not fit the height of its container', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.style.blockSize = '170px';
    wrapper.innerHTML = `<punk-toolbar aria-label="Map" orientation="vertical">${[1, 2, 3, 4, 5, 6].map(tall).join('')}<button slot="overflow" id="more" style="inline-size: 36px; block-size: 36px">+</button></punk-toolbar>`;
    const toolbar = wrapper.querySelector('punk-toolbar') as PunkToolbar;
    await toolbar.updateComplete;
    await frames();
    const items = [...toolbar.querySelectorAll<HTMLElement>(':scope > button:not([slot])')];
    const flags = hiddenOf(items);
    const visible = flags.filter((flag) => !flag).length;
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(6);
    expect(flags).toEqual(items.map((_, index) => index >= visible));
    const more = wrapper.querySelector('#more') as HTMLElement;
    for (const entry of items.slice(0, visible)) {
      expect(entry.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        more.getBoundingClientRect().top + 1,
      );
    }
    wrapper.style.blockSize = '600px';
    await frames();
    expect(hiddenOf(items).some(Boolean)).toBe(false);
  });
});

describe('wrap', () => {
  it('lets the strip grow taller, with every item showing', async () => {
    const { strip, items } = await mount({
      count: 6,
      width: 200,
      attributes: 'wrap',
      trigger: true,
    });
    expect(hiddenOf(items).some(Boolean)).toBe(false);
    expect((items[5] as HTMLElement).getBoundingClientRect().top).toBeGreaterThan(
      (items[0] as HTMLElement).getBoundingClientRect().top,
    );
    expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
    expect(getComputedStyle(strip).flexWrap).toBe('wrap');
  });
});

describe('wrap with a long item', () => {
  it('lets an item shrink and wrap its text instead of overflowing', async () => {
    const { wrapper, strip } = await mount({
      width: 120,
      attributes: 'wrap',
      items:
        '<button type="button" style="font: inherit">Stop everything and start the whole run over again</button>',
    });
    expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth);
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(120);
  });
});

describe('appearance', () => {
  it('is a bordered box under forced colors', async () => {
    await commands.setForcedColors('active');
    const { strip } = await mount();
    const style = getComputedStyle(strip);
    expect([style.borderTopStyle, style.borderTopWidth]).toEqual(['solid', '2px']);
  });
});
