import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { setLocale } from './locale.ts';
import '../../src/components/panel/register.ts';
import '../../src/components/production-stat/register.ts';
import '../../src/components/connection-row/register.ts';
import type { PunkConnectionRow } from '../../src/components/connection-row/index.ts';
import type { PunkProductionStat } from '../../src/components/production-stat/index.ts';

// specs/performance.md §3 and §4: what keeps a dashboard of stats and rows cheap, counted and not timed. A
// runner is too noisy to assert frame times, so these count listeners, observers, elements, style
// sheets, renders, and layout reads. The times are printed and not asserted.

const COUNT = 200;
// The most elements that one instance holds in its shadow root, in any state. These are the
// measured numbers, and they are held (specs/performance.md §3).
const STAT_ELEMENTS = 16;
const ROW_ELEMENTS = 18;

beforeEach(addStylesheets);

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await setLocale('en');
});

const trends = ['up', 'down', 'flat'];
const directions = ['forward', 'backward', 'both'];
const statuses = ['neutral', 'info', 'success', 'warning', 'danger'];

const statMarkup = (index: number) =>
  `<punk-production-stat label="Output ${index}" value="${index * 37}" unit="/min" trend="${trends[index % 3]}" delta="${(index % 7) - 3}"></punk-production-stat>`;

const rowMarkup = (index: number) =>
  `<punk-connection-row direction="${directions[index % 3]}" status="${statuses[index % 5]}" value="r${index}"${index % 2 ? ' removable' : ''}>
     <span slot="source">Node ${index}</span><span slot="destination">Node ${index + 1}</span>
     <span>${index % 9} per second</span><span slot="status">Running</span>
   </punk-connection-row>`;

type Updating = HTMLElement & { updateComplete: Promise<boolean> };

async function settle(root: ParentNode): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Updating[];
  await Promise.all(elements.map((element) => element.updateComplete));
  for (let round = 0; round < 2; round++) {
    await new Promise((resolve) => setTimeout(resolve));
    await Promise.all(elements.map((element) => element.updateComplete));
  }
}

/** The dashboard: `COUNT` stats and `COUNT` connection rows. */
async function mountDashboard() {
  const root = track(document.createElement('div'));
  root.style.inlineSize = '800px';
  const indexes = Array.from({ length: COUNT }, (_, index) => index);
  root.innerHTML = [...indexes.map(statMarkup), ...indexes.map(rowMarkup)].join('');
  await settle(root);
  return {
    root,
    stats: [...root.querySelectorAll('punk-production-stat')] as PunkProductionStat[],
    rows: [...root.querySelectorAll('punk-connection-row')] as PunkConnectionRow[],
  };
}

function watchObservers() {
  const created: string[] = [];
  for (const name of ['ResizeObserver', 'IntersectionObserver', 'MutationObserver'] as const) {
    const Original = globalThis[name] as new (...args: never[]) => object;
    vi.stubGlobal(
      name,
      class extends Original {
        constructor(...args: never[]) {
          super(...args);
          created.push(name);
        }
      },
    );
  }
  return created;
}

const elementsIn = (host: Element) => host.shadowRoot?.querySelectorAll('*').length ?? 0;

describe('a dashboard of 200 stats and 200 connection rows', () => {
  it('renders, and says how long it took, and how long a locale change takes', async () => {
    const start = performance.now();
    await mountDashboard();
    const rendered = performance.now() - start;
    const before = performance.now();
    await setLocale('de');
    await settle(document.body);
    const changed = performance.now() - before;
    console.info(
      `dashboard: ${COUNT} stats and ${COUNT} rows rendered in ${rendered.toFixed(0)} ms, and one setLocale over them took ${changed.toFixed(0)} ms`,
    );
    expect(rendered).toBeGreaterThan(0);
  });

  it('adds no listener to the page or the window beyond the locale one, and no observer', async () => {
    // The two are spied on themselves, since a call on `window` may not pass the prototype's.
    const onDocument = vi.spyOn(document, 'addEventListener');
    const onWindow = vi.spyOn(window, 'addEventListener');
    const observers = watchObservers();
    await mountDashboard();
    const types = (calls: Array<[string, ...unknown[]]>) =>
      calls.map(([type]) => type).filter((type) => type !== 'lit-localize-status');
    expect(types(onDocument.mock.calls as Array<[string, ...unknown[]]>)).toEqual([]);
    expect(types(onWindow.mock.calls as Array<[string, ...unknown[]]>)).toEqual([]);
    expect(observers).toEqual([]);
  });

  it('adds one listener to the page for the locale, however many components arrive, and keeps it', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const first = await mountDashboard();
    const second = await mountDashboard();
    cleanup();
    const status = (calls: Array<[string, ...unknown[]]>) =>
      calls.filter(([type]) => type === 'lit-localize-status').length;
    // A page that has already had a component holds it, so the first mount may add none.
    expect(status(add.mock.calls as Array<[string, ...unknown[]]>)).toBeLessThanOrEqual(1);
    expect(status(remove.mock.calls as Array<[string, ...unknown[]]>)).toBe(0);
    expect(first.stats.length + second.stats.length).toBe(COUNT * 2);
  });

  it('adds no listener to a stat, and one to the remove button of a row that can be removed', async () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const { stats, rows } = await mountDashboard();
    const on = (target: unknown) =>
      add.mock.calls
        .filter((_call, index) => add.mock.contexts[index] === target)
        .map(([type]) => type);
    for (const stat of stats) expect(on(stat)).toEqual([]);
    for (const row of rows) {
      expect(on(row)).toEqual([]);
      const button = row.shadowRoot?.querySelector('[part="remove-button"]');
      expect(on(button), row.value).toEqual(row.removable ? ['click'] : []);
      expect(Boolean(button)).toBe(row.removable);
    }
  });
});

describe('the size of one instance', () => {
  it('holds a fixed number of elements, whatever the value, the label, or the status', async () => {
    const counts = async (attributes: Array<Record<string, string>>) => {
      const found: number[] = [];
      for (const set of attributes) {
        const stat = track(document.createElement('punk-production-stat'));
        for (const [name, value] of Object.entries(set)) stat.setAttribute(name, value);
        await stat.updateComplete;
        found.push(elementsIn(stat));
      }
      return found;
    };
    const base = { value: '5', unit: '/min', trend: 'up', delta: '1' };
    const sizes = await counts([
      { ...base, label: 'A' },
      {
        ...base,
        label: 'A label that is very long and runs over several lines of a narrow column',
      },
      { ...base, label: 'Ünï', value: '1' },
      { ...base, label: 'A', value: '123456789012.123456' },
      { ...base, label: 'A', value: '-0.000001' },
      { ...base, label: 'A', trend: 'down' },
      { ...base, label: 'A', trend: 'flat' },
    ]);
    expect(new Set(sizes).size, String(sizes)).toBe(1);

    const rowCounts: number[] = [];
    for (const status of statuses) {
      for (const direction of directions) {
        const row = track(document.createElement('punk-connection-row'));
        row.setAttribute('status', status);
        row.setAttribute('direction', direction);
        row.setAttribute('removable', '');
        row.innerHTML =
          '<span slot="source">A</span><span slot="destination">B</span><span slot="status">S</span>';
        await row.updateComplete;
        rowCounts.push(elementsIn(row));
      }
    }
    expect(new Set(rowCounts), String(rowCounts)).toEqual(new Set([rowCounts[0]]));
  });

  it(`holds at most ${STAT_ELEMENTS} elements for a stat and ${ROW_ELEMENTS} for a row, in any state`, async () => {
    const most = { stat: 0, row: 0 };
    const { stats, rows } = await mountDashboard();
    for (const stat of stats) most.stat = Math.max(most.stat, elementsIn(stat));
    for (const row of rows) most.row = Math.max(most.row, elementsIn(row));
    // The states a dashboard does not use: compact, no value, announcing, a sparkline, an icon.
    const fuller = track(document.createElement('punk-production-stat'));
    fuller.setAttribute('label', 'Output');
    fuller.setAttribute('value', '1234567');
    fuller.setAttribute('compact', '');
    fuller.setAttribute('unit', '/min');
    fuller.setAttribute('trend', 'up');
    fuller.setAttribute('delta', '2');
    fuller.setAttribute('announce', '');
    fuller.innerHTML =
      '<svg slot="icon" aria-hidden="true"></svg><svg slot="sparkline" aria-hidden="true"></svg>';
    await fuller.updateComplete;
    const empty = track(document.createElement('punk-production-stat'));
    empty.setAttribute('label', 'Output');
    await empty.updateComplete;
    most.stat = Math.max(most.stat, elementsIn(fuller), elementsIn(empty));
    const full = track(document.createElement('punk-connection-row'));
    full.setAttribute('removable', '');
    full.setAttribute('status', 'danger');
    full.setAttribute('direction', 'both');
    full.innerHTML =
      '<span slot="source">A</span><span slot="destination">B</span><span>x</span><span slot="status">S</span>';
    await full.updateComplete;
    most.row = Math.max(most.row, elementsIn(full));
    console.info(`most elements in a shadow root: a stat ${most.stat}, a row ${most.row}`);
    expect(most.stat).toBeLessThanOrEqual(STAT_ELEMENTS);
    expect(most.row).toBeLessThanOrEqual(ROW_ELEMENTS);
  });

  it('adopts the same style sheets in every instance of a class', async () => {
    const { stats, rows } = await mountDashboard();
    for (const group of [stats, rows]) {
      const first = group[0]?.shadowRoot?.adoptedStyleSheets ?? [];
      expect(first.length).toBeGreaterThan(0);
      const sheets = new Set<CSSStyleSheet>();
      for (const host of group) {
        const own = host.shadowRoot?.adoptedStyleSheets ?? [];
        expect(own.length).toBe(first.length);
        own.forEach((sheet, index) => expect(sheet).toBe(first[index]));
        own.forEach((sheet) => sheets.add(sheet));
        expect(host.shadowRoot?.querySelector('style')).toBeNull();
      }
      expect(sheets.size).toBe(first.length);
    }
  });
});

// Sets a property to the value that it has.
function same<T extends object, K extends keyof T>(host: T, name: K): void {
  const current = host[name];
  host[name] = current;
}

describe('renders', () => {
  const renders = (name: 'stat' | 'row') => {
    const proto = (
      name === 'stat'
        ? customElements.get('punk-production-stat')
        : customElements.get('punk-connection-row')
    )!.prototype as { render: () => unknown };
    return vi.spyOn(proto, 'render');
  };

  it('renders only the stat whose value was set, and once', async () => {
    const { stats } = await mountDashboard();
    const spy = renders('stat');
    const target = stats[17] as PunkProductionStat;
    target.value = 999;
    await Promise.all(stats.map((stat) => stat.updateComplete));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.contexts[0]).toBe(target);
  });

  it('renders each stat once for 200 values set in one task, and reads no layout', async () => {
    const { stats } = await mountDashboard();
    const spy = renders('stat');
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const style = vi.spyOn(window, 'getComputedStyle');
    const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get');
    stats.forEach((stat, index) => {
      stat.value = index * 1000 + 1;
    });
    await Promise.all(stats.map((stat) => stat.updateComplete));
    expect(spy).toHaveBeenCalledTimes(COUNT);
    expect(new Set(spy.mock.contexts).size).toBe(COUNT);
    expect(rect).not.toHaveBeenCalled();
    expect(style).not.toHaveBeenCalled();
    expect(width).not.toHaveBeenCalled();
  });

  it('renders nothing when a property is set to the value it has', async () => {
    const { stats, rows } = await mountDashboard();
    const statSpy = renders('stat');
    const rowSpy = renders('row');
    for (const stat of stats) {
      same(stat, 'value');
      same(stat, 'label');
      same(stat, 'trend');
      same(stat, 'compact');
    }
    for (const row of rows) {
      same(row, 'direction');
      same(row, 'status');
      same(row, 'disabled');
    }
    await Promise.all([...stats, ...rows].map((host) => host.updateComplete));
    expect(statSpy).not.toHaveBeenCalled();
    expect(rowSpy).not.toHaveBeenCalled();
  });

  it('reads the text of its slots on slotchange and not on render', async () => {
    const { rows } = await mountDashboard();
    const row = rows[1] as PunkConnectionRow;
    const text = vi.spyOn(Node.prototype, 'textContent', 'get');
    row.disabled = !row.disabled;
    row.direction = 'both';
    row.status = 'success';
    await row.updateComplete;
    const readFromRow = text.mock.contexts.filter((node) => (node as Node).parentNode === row);
    expect(readFromRow).toEqual([]);
    // A slotchange reads it again, and the name follows.
    const next = document.createElement('span');
    next.slot = 'destination';
    next.textContent = 'Chest';
    row.querySelector('[slot="destination"]')?.replaceWith(next);
    await vi.waitFor(() =>
      expect(
        row.shadowRoot?.querySelector('[part="remove-button"]')?.getAttribute('aria-label'),
      ).toBe('Remove connection: Node 1, Chest'),
    );
  });
});

describe('a locale change', () => {
  const renderCount = (tag: string) =>
    vi.spyOn(
      (customElements.get(tag) as CustomElementConstructor).prototype as { render: () => unknown },
      'render',
    );

  it('renders each connected stat and row once, in one task, and nothing that renders no message', async () => {
    const { stats, rows, root } = await mountDashboard();
    const panels = Array.from({ length: 20 }, () =>
      root.appendChild(document.createElement('punk-panel')),
    );
    await settle(root);
    const detached = document.createElement('punk-production-stat');
    detached.setAttribute('label', 'Away');
    track(detached);
    await detached.updateComplete;
    detached.remove();

    const statSpy = renderCount('punk-production-stat');
    const rowSpy = renderCount('punk-connection-row');
    const panelSpy = renderCount('punk-panel');
    // A timer set when the status arrives runs after the renders, which are microtasks of the
    // same task, so everything has been drawn by then.
    let atNextTask: { stats: number; rows: number } | undefined;
    const onStatus = (event: Event) => {
      if ((event as CustomEvent<{ status: string }>).detail.status !== 'ready') return;
      setTimeout(() => {
        atNextTask = { stats: statSpy.mock.calls.length, rows: rowSpy.mock.calls.length };
      });
    };
    window.addEventListener('lit-localize-status', onStatus);
    await setLocale('de');
    await settle(root);
    window.removeEventListener('lit-localize-status', onStatus);

    expect(statSpy).toHaveBeenCalledTimes(COUNT);
    expect(rowSpy).toHaveBeenCalledTimes(COUNT);
    expect(new Set(statSpy.mock.contexts)).toEqual(new Set(stats));
    expect(new Set(rowSpy.mock.contexts)).toEqual(new Set(rows));
    expect(statSpy.mock.contexts).not.toContain(detached);
    expect(panelSpy).not.toHaveBeenCalled();
    expect(atNextTask).toEqual({ stats: COUNT, rows: COUNT });
    expect(panels).toHaveLength(20);
  });
});

describe('a list of a thousand rows', () => {
  // `content-visibility` needs no change in the library: the application sets it on the host, and
  // the Performance guide says what was tested. This prints the layout time with and without it.
  it('says how long layout takes, with and without content-visibility set by the application', async () => {
    const timeLayout = async (rule: string) => {
      const style = track(
        Object.assign(document.createElement('style'), { textContent: rule }),
        document.head,
      );
      const root = track(document.createElement('div'));
      root.style.inlineSize = '600px';
      root.innerHTML = Array.from({ length: 1000 }, (_, index) => rowMarkup(index)).join('');
      await settle(root);
      const start = performance.now();
      root.style.inlineSize = '601px';
      void root.offsetHeight;
      const elapsed = performance.now() - start;
      root.remove();
      style.remove();
      return elapsed;
    };
    const plain = await timeLayout('');
    const skipped = await timeLayout(
      'punk-connection-row { content-visibility: auto; contain-intrinsic-size: auto 60px; }',
    );
    console.info(
      `list: layout of 1000 rows took ${plain.toFixed(0)} ms, and ${skipped.toFixed(0)} ms with content-visibility: auto`,
    );
    expect(plain).toBeGreaterThanOrEqual(0);
  });
});
