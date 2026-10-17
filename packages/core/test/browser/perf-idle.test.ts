import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import type * as GalleryModule_ from './fixtures/gallery.ts';
import type { ComponentName } from './fixtures/gallery.ts';

type GalleryModule = typeof GalleryModule_;

// SPEC-PHASE-4 §11.2, the idle library: with every component mounted at once and no input for a
// second, nothing of the library is running. Counted, not timed.

// The gallery imports every component, so loading it is what defines every element. It is loaded
// here and not at the top, so the time it takes can be printed.
let lib: GalleryModule;
let loadTime = 0;

beforeAll(async () => {
  const start = performance.now();
  lib = await import('./fixtures/gallery.ts');
  loadTime = performance.now() - start;
});

const realSetTimeout = window.setTimeout.bind(window);
const wait = (ms: number) => new Promise<void>((resolve) => realSetTimeout(resolve, ms));

beforeEach(() => {
  addStylesheets();
  track(
    Object.assign(document.createElement('style'), { textContent: lib.galleryCss }),
    document.head,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface Pending {
  frames: Set<number>;
  timeouts: Set<number>;
  intervals: Set<number>;
}

/** Records the frame callbacks and timers that are asked for and have not run or been cancelled. */
function watchScheduling(): Pending {
  const pending: Pending = { frames: new Set(), timeouts: new Set(), intervals: new Set() };
  const raf = window.requestAnimationFrame.bind(window);
  const caf = window.cancelAnimationFrame.bind(window);
  const timeout = window.setTimeout.bind(window);
  const clearTimeoutReal = window.clearTimeout.bind(window);
  const interval = window.setInterval.bind(window);
  const clearIntervalReal = window.clearInterval.bind(window);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id: number = raf((time) => {
      pending.frames.delete(id);
      callback(time);
    });
    pending.frames.add(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.frames.delete(id);
    caf(id);
  });
  vi.stubGlobal('setTimeout', (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
    const id: number = timeout(
      (...inner: unknown[]) => {
        pending.timeouts.delete(id);
        if (typeof callback === 'function') callback(...inner);
      },
      delay,
      ...args,
    );
    pending.timeouts.add(id);
    return id;
  });
  vi.stubGlobal('clearTimeout', (id: number) => {
    pending.timeouts.delete(id);
    clearTimeoutReal(id);
  });
  vi.stubGlobal('setInterval', (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
    const id: number = interval(callback as () => void, delay, ...args);
    pending.intervals.add(id);
    return id;
  });
  vi.stubGlobal('clearInterval', (id: number) => {
    pending.intervals.delete(id);
    clearIntervalReal(id);
  });
  return pending;
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

async function settle(root: ParentNode): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((element) =>
    element.localName.startsWith('punk-'),
  ) as Array<Element & { updateComplete?: Promise<boolean> }>;
  await Promise.all(elements.map((element) => element.updateComplete));
  lib.openTooltips(root as HTMLElement);
  await Promise.all(elements.map((element) => element.updateComplete));
}

describe('the idle library', () => {
  it('defines every element, and says how long loading them took', () => {
    const defined = lib.componentNames.filter(
      (name) => !name.includes('-item') && customElements.get(`punk-${name}`) !== undefined,
    );
    console.info(
      `defining: ${defined.length} tags were defined, and loading every module took ${loadTime.toFixed(0)} ms`,
    );
    expect(defined.length).toBeGreaterThan(30);
  });

  async function idle(names: readonly ComponentName[]) {
    const pending = watchScheduling();
    const observers = watchObservers();
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const gallery = track(lib.buildGallery('short', names));
    await settle(gallery);
    // The first frame settles, and whatever the mount asked for runs.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await wait(1000);
    const onPage = add.mock.calls
      .map(([type], index) => ({ type, target: add.mock.contexts[index] }))
      .filter(({ target }) => target === document || target === window)
      .map(({ type }) => type)
      // The one that every component shares for locale changes, which §7.1 allows and
      // locale-watch.listener.test.ts holds to one.
      .filter((type) => type !== 'lit-localize-status');
    return { pending, observers, onPage, gallery };
  }

  it('has nothing pending a second after the first frame, and holds only the observers it needs', async () => {
    const { pending, observers, gallery } = await idle(lib.componentNames);

    // Nothing that the library asked for is waiting: no frame callback, no timer, no interval.
    expect([...pending.frames]).toEqual([]);
    expect([...pending.timeouts]).toEqual([]);
    expect([...pending.intervals]).toEqual([]);
    expect(document.getAnimations()).toEqual([]);

    // By design, and nothing else: a toolbar that does not wrap watches its own size, a select
    // copies its options when they change, and an open tooltip keeps its position and the
    // description of its anchor current. A closed tooltip and every other component hold none.
    const count = (selector: string) => gallery.querySelectorAll(selector).length;
    const expected = {
      ResizeObserver: count('punk-toolbar:not([wrap])') + count('punk-tooltip[data-open]'),
      MutationObserver: count('punk-select') + count('punk-tooltip[data-open]'),
    };
    const made = (kind: string) => observers.filter((name) => name === kind).length;
    expect({
      ResizeObserver: made('ResizeObserver'),
      MutationObserver: made('MutationObserver'),
    }).toEqual(expected);
    expect(expected.ResizeObserver).toBeGreaterThan(0);
    expect(made('IntersectionObserver')).toBe(0);
  }, 20_000);

  it('holds one listener for the open overlays and none for anything closed', async () => {
    const withWindow = await idle(lib.componentNames);
    expect(withWindow.onPage).toEqual(['keydown']);
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    addStylesheets();
    // The gallery opens its tooltips, and an open tooltip listens for Escape, as an open window does.
    const closed = lib.componentNames.filter((name) => name !== 'window' && name !== 'tooltip');
    const without = await idle(closed);
    expect(without.onPage).toEqual([]);
  }, 30_000);
});
