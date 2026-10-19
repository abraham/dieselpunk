import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { owner } from '../../internal/owner.ts';
import type { MockInstance } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PunkTab, PunkTabChangeDetail, PunkTabs } from './index.ts';

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

const flush = () => new Promise((resolve) => setTimeout(resolve));

interface Options {
  attributes?: string;
  /** One entry per tab: extra attributes for it. */
  tabs?: string[];
  /** Where the panels go. */
  panels?: 'inside' | 'beside';
  width?: number;
  dir?: string;
  panelContent?: (index: number) => string;
}

interface Fixture {
  wrapper: HTMLElement;
  tabs: PunkTabs;
  tab: PunkTab[];
  panel: HTMLElement[];
}

async function mount(options: Options = {}): Promise<Fixture> {
  const count = options.tabs ?? ['', '', ''];
  const content = options.panelContent ?? ((index) => `<p>Panel ${index + 1}</p>`);
  const tabMarkup = count
    .map(
      (extra, index) =>
        `<punk-tab slot="tab" panel="p${index + 1}" ${extra}>Tab ${index + 1}</punk-tab>`,
    )
    .join('');
  const panelMarkup = count
    .map((_, index) => `<div id="p${index + 1}">${content(index)}</div>`)
    .join('');
  const wrapper = track(document.createElement('div'));
  if (options.width) wrapper.style.inlineSize = `${options.width}px`;
  if (options.dir) wrapper.dir = options.dir;
  const inside = options.panels !== 'beside';
  wrapper.innerHTML = `<punk-tabs aria-label="Machine" ${options.attributes ?? ''}>${tabMarkup}${inside ? panelMarkup : ''}</punk-tabs>${inside ? '' : panelMarkup}`;
  const tabs = wrapper.querySelector('punk-tabs') as PunkTabs;
  await settle(tabs);
  return {
    wrapper,
    tabs,
    tab: [...wrapper.querySelectorAll<PunkTab>('punk-tab')],
    panel: [...wrapper.querySelectorAll<HTMLElement>('div[id^="p"]')],
  };
}

async function settle(tabs: PunkTabs): Promise<void> {
  await tabs.updateComplete;
  await flush();
  await Promise.all([
    tabs.updateComplete,
    ...[...tabs.querySelectorAll('punk-tab')].map((tab) => (tab as PunkTab).updateComplete),
  ]);
}

const selected = (tab: PunkTab[]) => tab.map((entry) => entry.selected);
const shown = (panel: HTMLElement[]) => panel.map((entry) => !entry.hidden);
const tabindexes = (tab: PunkTab[]) => tab.map((entry) => entry.getAttribute('tabindex'));
const focused = (tab: PunkTab[]) => tab.findIndex((entry) => entry === document.activeElement);

describe('structure', () => {
  it.each(['inside', 'beside'] as const)(
    'is a tab list of tabs and a tab panel for each, with the panels %s the tabs',
    async (panels) => {
      const { tabs, tab, panel } = await mount({ panels });
      const list = tabs.shadowRoot?.querySelector('[part="tablist"]');
      expect(list?.getAttribute('role')).toBe('tablist');
      expect(list?.getAttribute('aria-label')).toBe('Machine');
      expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
      tab.forEach((entry, index) => {
        expect(entry.getAttribute('role')).toBe('tab');
        expect(entry.id).not.toBe('');
        expect(entry.getAttribute('aria-controls')).toBe(`p${index + 1}`);
        const current = panel[index] as HTMLElement;
        expect(current.getAttribute('role')).toBe('tabpanel');
        expect(current.getAttribute('aria-labelledby')).toBe(entry.id);
      });
      expect(tab.map((entry) => entry.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false',
      ]);
      expect(shown(panel)).toEqual([true, false, false]);
    },
  );

  it('keeps an id the author gave a tab', async () => {
    const { tab, panel } = await mount({ tabs: ['id="mine"', '', ''] });
    expect(tab[0]?.id).toBe('mine');
    expect(panel[0]?.getAttribute('aria-labelledby')).toBe('mine');
  });

  it('is named by the text of each tab', async () => {
    const { tab } = await mount();
    expect(tab[1]?.textContent).toBe('Tab 2');
    expect(tab[1]?.shadowRoot?.querySelector('[part="label"]')).not.toBeNull();
  });

  it('finds a panel in the same shadow tree as the tabs', async () => {
    const host = track(document.createElement('div'));
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<punk-tabs aria-label="Inside"><punk-tab slot="tab" panel="x">One</punk-tab></punk-tabs><div id="x">Panel</div>';
    const tabs = root.querySelector('punk-tabs') as PunkTabs;
    await settle(tabs);
    const inner = root.getElementById('x') as HTMLElement;
    expect(inner.getAttribute('role')).toBe('tabpanel');
    expect(inner.hidden).toBe(false);
  });

  it('reflects orientation and activation, and ignores unknown values', async () => {
    const { tabs } = await mount({ attributes: 'orientation="vertical" activation="manual"' });
    expect([tabs.orientation, tabs.activation]).toEqual(['vertical', 'manual']);
    tabs.setAttribute('orientation', 'diagonal');
    tabs.setAttribute('activation', 'whenever');
    await tabs.updateComplete;
    const list = tabs.shadowRoot?.querySelector('[part="tablist"]');
    expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
  });
});

describe('selection', () => {
  it('selects the first enabled tab by default', async () => {
    const { tab, panel } = await mount({ tabs: ['disabled', '', ''] });
    expect(selected(tab)).toEqual([false, true, false]);
    expect(shown(panel)).toEqual([false, true, false]);
  });

  it('selects the tab that has `selected`, and only one of several', async () => {
    const { tab } = await mount({ tabs: ['', 'selected', 'selected'] });
    expect(selected(tab)).toEqual([false, true, false]);
  });

  it('reads and writes `value`, which is the selected tab panel', async () => {
    const { tabs, tab, panel } = await mount();
    expect(tabs.value).toBe('p1');
    const heard = vi.fn();
    tabs.addEventListener('punk-tab-change', heard);
    tabs.value = 'p3';
    await settle(tabs);
    expect(tabs.value).toBe('p3');
    expect(selected(tab)).toEqual([false, false, true]);
    expect(shown(panel)).toEqual([false, false, true]);
    tabs.value = 'nothing';
    await settle(tabs);
    expect(tabs.value).toBe('p3');
    expect(heard).not.toHaveBeenCalled();
  });

  it('selects when a tab is selected from code, without an event', async () => {
    const { tabs, tab, panel } = await mount();
    const heard = vi.fn();
    tabs.addEventListener('punk-tab-change', heard);
    (tab[2] as PunkTab).selected = true;
    await settle(tabs);
    expect(selected(tab)).toEqual([false, false, true]);
    expect(shown(panel)).toEqual([false, false, true]);
    expect(heard).not.toHaveBeenCalled();
  });

  it('keeps one selected when the selected tab is deselected from code', async () => {
    const { tabs, tab } = await mount();
    (tab[0] as PunkTab).selected = false;
    await settle(tabs);
    expect(selected(tab)).toEqual([true, false, false]);
  });

  it('selects on a click and reports it once with the tab and panel', async () => {
    const { tabs, tab, panel } = await mount();
    const details: PunkTabChangeDetail[] = [];
    tabs.addEventListener('punk-tab-change', (event) => details.push(event.detail));
    await userEvent.click(tab[1] as PunkTab);
    await settle(tabs);
    expect(selected(tab)).toEqual([false, true, false]);
    expect(details).toHaveLength(1);
    expect(details[0]).toEqual({ value: 'p2', tab: tab[1], panel: panel[1] });
  });

  it('does nothing for a click on a disabled tab or the selected one', async () => {
    const { tabs, tab } = await mount({ tabs: ['', 'disabled', ''] });
    const heard = vi.fn();
    tabs.addEventListener('punk-tab-change', heard);
    await userEvent.click(tab[1] as PunkTab, { force: true });
    await userEvent.click(tab[0] as PunkTab);
    await settle(tabs);
    expect(selected(tab)).toEqual([true, false, false]);
    expect(heard).not.toHaveBeenCalled();
  });

  it('reports a panel that is not found as null', async () => {
    const { tabs, tab } = await mount({ tabs: ['', ''] });
    (tab[1] as PunkTab).panel = 'gone';
    await settle(tabs);
    const details: PunkTabChangeDetail[] = [];
    tabs.addEventListener('punk-tab-change', (event) => details.push(event.detail));
    await userEvent.click(tab[1] as PunkTab);
    expect(details[0]?.panel).toBeNull();
  });
});

describe('keyboard, automatic activation', () => {
  async function start(options: Options = {}) {
    const fixture = await mount(options);
    fixture.tab[0]?.focus();
    return fixture;
  }

  it('moves and selects with the arrows, Home, and End, and does not wrap', async () => {
    const { tabs, tab, panel } = await start();
    const heard = vi.fn();
    tabs.addEventListener('punk-tab-change', heard);
    await userEvent.keyboard('{ArrowRight}');
    expect([focused(tab), selected(tab)]).toEqual([1, [false, true, false]]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect([focused(tab), selected(tab)]).toEqual([2, [false, false, true]]);
    expect(shown(panel)).toEqual([false, false, true]);
    await userEvent.keyboard('{Home}');
    expect(focused(tab)).toBe(0);
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused(tab)).toBe(0);
    await userEvent.keyboard('{End}');
    expect(focused(tab)).toBe(2);
    expect(heard).toHaveBeenCalledTimes(4);
  });

  it('skips a disabled tab', async () => {
    const { tab } = await start({ tabs: ['', 'disabled', ''] });
    await userEvent.keyboard('{ArrowRight}');
    expect(focused(tab)).toBe(2);
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused(tab)).toBe(0);
  });

  it('swaps the horizontal arrows on a right-to-left page', async () => {
    const { tab } = await start({ dir: 'rtl' });
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused(tab)).toBe(1);
    await userEvent.keyboard('{ArrowRight}');
    expect(focused(tab)).toBe(0);
  });

  it('uses Up and Down for vertical tabs, and ignores Left and Right', async () => {
    const { tab } = await start({ attributes: 'orientation="vertical"' });
    await userEvent.keyboard('{ArrowRight}');
    expect(focused(tab)).toBe(0);
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(tab)).toBe(1);
    await userEvent.keyboard('{ArrowUp}');
    expect(focused(tab)).toBe(0);
  });

  it('ignores a key that has Ctrl, Alt, or Meta, and keys from inside a panel', async () => {
    const { tab, panel } = await start({ panelContent: () => '<input id="field" />' });
    await userEvent.keyboard('{Control>}{ArrowRight}{/Control}');
    expect(focused(tab)).toBe(0);
    (panel[0]?.querySelector('input') as HTMLInputElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(selected(tab)).toEqual([true, false, false]);
  });
});

describe('keyboard, manual activation', () => {
  it('moves focus with the arrows, and selects with Enter and Space', async () => {
    const { tabs, tab, panel } = await mount({ attributes: 'activation="manual"' });
    tab[0]?.focus();
    const heard = vi.fn();
    tabs.addEventListener('punk-tab-change', heard);
    await userEvent.keyboard('{ArrowRight}');
    expect([focused(tab), selected(tab)]).toEqual([1, [true, false, false]]);
    expect(heard).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(selected(tab)).toEqual([false, true, false]);
    expect(shown(panel)).toEqual([false, true, false]);
    await userEvent.keyboard('{ArrowRight}{ }');
    expect(selected(tab)).toEqual([false, false, true]);
    expect(heard).toHaveBeenCalledTimes(2);
  });
});

describe('tab stops and panels', () => {
  it('has one tab stop, the selected tab, and none for a disabled tab', async () => {
    const { tab } = await mount({ tabs: ['', '', 'disabled'] });
    expect(tabindexes(tab)).toEqual(['0', '-1', null]);
  });

  it('moves the tab stop to the tab that has focus, and back to the selected on selection', async () => {
    const { tabs, tab } = await mount({ attributes: 'activation="manual"' });
    tab[0]?.focus();
    await userEvent.keyboard('{ArrowRight}');
    await settle(tabs);
    expect(tabindexes(tab)).toEqual(['-1', '0', '-1']);
    await userEvent.keyboard('{Enter}');
    await settle(tabs);
    expect(tabindexes(tab)).toEqual(['-1', '0', '-1']);
    tabs.value = 'p1';
    await settle(tabs);
    expect(tabindexes(tab)).toEqual(['0', '-1', '-1']);
  });

  it('gives a panel with nothing to Tab to tabindex 0, and not one that has content', async () => {
    const { panel } = await mount({
      panelContent: (index) => (index === 0 ? '<p>Text only</p>' : '<button>Go</button>'),
    });
    expect(panel[0]?.getAttribute('tabindex')).toBe('0');
    expect(panel[1]?.hasAttribute('tabindex')).toBe(false);
  });

  it('leaves a tabindex the author set on a panel alone', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<punk-tabs aria-label="x"><punk-tab slot="tab" panel="a">A</punk-tab></punk-tabs><div id="a" tabindex="-1">A</div>';
    await settle(wrapper.querySelector('punk-tabs') as PunkTabs);
    expect(wrapper.querySelector('#a')?.getAttribute('tabindex')).toBe('-1');
  });

  it('Tab from the selected tab goes to its panel when it has nothing else to Tab to', async () => {
    const { tab, panel } = await mount();
    await focusWithKeyboard(tab[0] as PunkTab);
    tab[0]?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(panel[0]);
  });

  it('Tab from the selected tab goes into the panel content', async () => {
    const { tab, panel } = await mount({ panelContent: () => '<button>Go</button>' });
    tab[0]?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(panel[0]?.querySelector('button'));
  });

  it('gives back what it wrote to the panels when a tab is removed', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<punk-tabs aria-label="x"><punk-tab slot="tab" panel="a">A</punk-tab><punk-tab slot="tab" panel="b">B</punk-tab></punk-tabs><div id="a" role="note" hidden>A</div><div id="b" aria-labelledby="other">B</div>';
    const tabs = wrapper.querySelector('punk-tabs') as PunkTabs;
    await settle(tabs);
    const [a, b] = [wrapper.querySelector('#a'), wrapper.querySelector('#b')] as HTMLElement[];
    expect(a?.getAttribute('role')).toBe('tabpanel');
    wrapper.querySelectorAll('punk-tab')[0]?.remove();
    await settle(tabs);
    expect([a?.getAttribute('role'), a?.hidden, a?.hasAttribute('tabindex')]).toEqual([
      'note',
      true,
      false,
    ]);
    expect(b?.getAttribute('role')).toBe('tabpanel');
    tabs.remove();
    expect([
      b?.getAttribute('role'),
      b?.getAttribute('aria-labelledby'),
      b?.hidden,
      b?.hasAttribute('tabindex'),
    ]).toEqual([null, 'other', false, false]);
  });

  it('restores the panels and takes them again when the tabs are moved', async () => {
    const { wrapper, tabs, panel } = await mount({ panels: 'beside' });
    tabs.remove();
    expect(panel[0]?.hasAttribute('role')).toBe(false);
    wrapper.prepend(tabs);
    await settle(tabs);
    expect(panel[0]?.getAttribute('role')).toBe('tabpanel');
  });
});

describe('changing the tabs', () => {
  it('selects the nearest tab when the selected one is removed', async () => {
    const { tabs, tab, panel } = await mount({
      tabs: ['', 'selected', '', ''],
    });
    expect(selected(tab)).toEqual([false, true, false, false]);
    tab[1]?.remove();
    await settle(tabs);
    expect(selected([tab[0], tab[2], tab[3]] as PunkTab[])).toEqual([false, true, false]);
    expect(panel[1]?.hidden).toBe(false);
    expect(panel[1]?.hasAttribute('role')).toBe(false);
    expect(panel[2]?.hidden).toBe(false);
    expect(panel[0]?.hidden).toBe(true);
  });

  it('selects another tab when the selected one is disabled, and keeps one tab stop', async () => {
    const { tabs, tab } = await mount();
    (tab[0] as PunkTab).disabled = true;
    await settle(tabs);
    expect(selected(tab)).toEqual([false, true, false]);
    expect(tabindexes(tab)).toEqual([null, '0', '-1']);
  });

  it('has no selected tab when every tab is disabled', async () => {
    const { tabs, tab } = await mount({ tabs: ['disabled', 'disabled'] });
    expect(selected(tab)).toEqual([false, false]);
    expect(tabs.value).toBe('');
  });

  it('manages a tab that is added later', async () => {
    const { wrapper, tabs, tab } = await mount();
    const added = document.createElement('punk-tab');
    added.slot = 'tab';
    added.setAttribute('panel', 'late');
    added.textContent = 'Late';
    const latePanel = document.createElement('div');
    latePanel.id = 'late';
    tabs.append(added);
    wrapper.append(latePanel);
    await settle(tabs);
    expect(added[owner]).toBe(tabs);
    expect(latePanel.hidden).toBe(true);
    added.selected = true;
    await settle(tabs);
    expect(latePanel.hidden).toBe(false);
    expect(selected(tab)).toEqual([false, false, false]);
  });

  it('lets go of a tab that is removed', async () => {
    const { tabs, tab } = await mount();
    const removed = tab[1] as PunkTab;
    removed.remove();
    await settle(tabs);
    expect(removed[owner]).toBeNull();
    expect(removed.hasAttribute('aria-controls')).toBe(false);
  });

  it('shows the panel of a tab whose `panel` is changed', async () => {
    const { tabs, tab, panel } = await mount();
    (tab[0] as PunkTab).panel = 'p3';
    await settle(tabs);
    expect(tab[0]?.getAttribute('aria-controls')).toBe('p3');
    expect(panel[2]?.getAttribute('aria-labelledby')).toBe(tab[0]?.id);
    expect(panel[0]?.hasAttribute('role')).toBe(false);
  });
});

describe('warnings', () => {
  it('warns once for a tab with no panel, a missing panel, and two tabs with one panel', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = `<punk-tabs aria-label="x">
      <punk-tab slot="tab">None</punk-tab>
      <punk-tab slot="tab" panel="nowhere">Missing</punk-tab>
      <punk-tab slot="tab" panel="a">First</punk-tab>
      <punk-tab slot="tab" panel="a">Second</punk-tab>
    </punk-tabs><div id="a">A</div>`;
    const tabs = wrapper.querySelector('punk-tabs') as PunkTabs;
    await settle(tabs);
    tabs.value = 'a';
    await settle(tabs);
    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages).toHaveLength(3);
    expect(messages.some((message) => message.includes('no `panel`'))).toBe(true);
    expect(messages.some((message) => message.includes('"nowhere"'))).toBe(true);
    expect(messages.some((message) => message.includes('Two tabs name'))).toBe(true);
  });

  it('warns once when there is no accessible name, and not for aria-label', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<punk-tabs><punk-tab slot="tab" panel="a">A</punk-tab></punk-tabs><div id="a">A</div>';
    await settle(wrapper.querySelector('punk-tabs') as PunkTabs);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toContain('aria-label');
    warn.mockClear();
    await mount();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('appearance', () => {
  const face = (tab: PunkTab) => tab.shadowRoot?.querySelector('.tab') as Element;
  const bar = (tab: PunkTab) => getComputedStyle(face(tab), '::before').display;
  const panels = (tabs: PunkTabs) =>
    tabs.shadowRoot?.querySelector('[part="panels"]') as HTMLElement;

  it('joins the selected tab to the surface of panels inside the tabs', async () => {
    const { tabs, tab } = await mount();
    const surface = getComputedStyle(panels(tabs));
    expect(panels(tabs).hidden).toBe(false);
    expect(getComputedStyle(face(tab[0] as PunkTab)).backgroundColor).toBe(surface.backgroundColor);
    expect(getComputedStyle(face(tab[0] as PunkTab)).boxShadow).toMatch(
      /^rgb\([^)]*\) 0px 2px 0px/,
    );
    expect(getComputedStyle(face(tab[1] as PunkTab)).backgroundColor).not.toBe(
      surface.backgroundColor,
    );
    expect(tab.map(bar)).toEqual(['none', 'none', 'none']);
    tabs.value = 'p2';
    await settle(tabs);
    expect(getComputedStyle(face(tab[1] as PunkTab)).backgroundColor).toBe(surface.backgroundColor);
  });

  it('joins a vertical tab at the inline end, in both directions', async () => {
    const ltr = await mount({ attributes: 'orientation="vertical"' });
    expect(getComputedStyle(face(ltr.tab[0] as PunkTab)).boxShadow).toMatch(
      /^rgb\([^)]*\) 2px 0px 0px/,
    );
    const rtl = await mount({ attributes: 'orientation="vertical"', dir: 'rtl' });
    expect(getComputedStyle(face(rtl.tab[0] as PunkTab)).boxShadow).toMatch(
      /^rgb\([^)]*\) -2px 0px 0px/,
    );
  });

  it('marks the selected tab with a bar the others do not have when the panels are elsewhere', async () => {
    const { tabs, tab } = await mount({ panels: 'beside' });
    expect(panels(tabs).hidden).toBe(true);
    expect(tab.map(bar)).toEqual(['block', 'none', 'none']);
    tabs.value = 'p2';
    await settle(tabs);
    expect(tab.map(bar)).toEqual(['none', 'block', 'none']);
  });

  it('puts the bar on the edge that faces the panel', async () => {
    const { tab } = await mount({ panels: 'beside' });
    const horizontal = getComputedStyle(face(tab[0] as PunkTab), '::before');
    expect(parseFloat(horizontal.blockSize)).toBe(3);
    const vertical = await mount({ attributes: 'orientation="vertical"', panels: 'beside' });
    const side = getComputedStyle(face(vertical.tab[0] as PunkTab), '::before');
    expect(parseFloat(side.inlineSize)).toBe(3);
  });

  it('is a plain bordered box under forced colors, and the selected one has the Highlight border', async () => {
    await commands.setForcedColors('active');
    const { tab } = await mount({ tabs: ['', '', 'disabled'] });
    const border = (entry: PunkTab) =>
      getComputedStyle(entry.shadowRoot?.querySelector('.tab') as Element).borderTopColor;
    expect(
      getComputedStyle(tab[0]?.shadowRoot?.querySelector('.tab') as Element).borderTopStyle,
    ).toBe('solid');
    expect(border(tab[0] as PunkTab)).not.toBe(border(tab[1] as PunkTab));
    expect(border(tab[2] as PunkTab)).not.toBe(border(tab[1] as PunkTab));
  });

  it('shows keyboard focus with the ring', async () => {
    const { tab } = await mount();
    await focusWithKeyboard(tab[0] as PunkTab);
    tab[0]?.focus();
    expect(
      getComputedStyle(tab[0]?.shadowRoot?.querySelector('.tab') as Element, '::after').boxShadow,
    ).not.toBe('none');
  });
});

describe('layout', () => {
  it('wraps onto more rows and never scrolls sideways at 187px', async () => {
    const { wrapper, tabs, tab } = await mount({
      width: 187,
      tabs: ['', '', '', ''],
      attributes: '',
    });
    for (const entry of tab) entry.textContent = 'Eingangsmaterialien und Zwischenprodukte';
    await settle(tabs);
    const list = tabs.shadowRoot?.querySelector('.tablist') as HTMLElement;
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(187);
    expect(tab[1]?.getBoundingClientRect().top).toBeGreaterThan(
      tab[0]?.getBoundingClientRect().top ?? 0,
    );
  });

  it('puts vertical tabs beside the panel, at the inline start', async () => {
    const ltr = await mount({ attributes: 'orientation="vertical"' });
    const first = ltr.tab[0]?.getBoundingClientRect() as DOMRect;
    expect(first.right).toBeLessThanOrEqual((ltr.panel[0]?.getBoundingClientRect().left ?? 0) + 1);
    const rtl = await mount({ attributes: 'orientation="vertical"', dir: 'rtl' });
    const flipped = rtl.tab[0]?.getBoundingClientRect() as DOMRect;
    expect(flipped.left).toBeGreaterThanOrEqual(
      (rtl.panel[0]?.getBoundingClientRect().right ?? 0) - 1,
    );
  });
});
