import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import { buildGallery, galleryCss } from './fixtures/gallery.ts';
import type { ComponentName } from './fixtures/gallery.ts';
import type { PunkDialog } from '../../src/components/dialog/index.ts';
import type { PunkPopover } from '../../src/components/popover/index.ts';
import type { PunkSlider } from '../../src/components/slider/index.ts';
import type { PunkToast, PunkToastStack } from '../../src/components/toast/index.ts';
import type { PunkWindow } from '../../src/components/window/index.ts';

// What keeps the shell cheap, counted and not timed (SPEC-PHASE-3 §10.7): listeners on the page,
// observers, layout reads, and timers. The grid of item stacks has its own file, perf.test.ts.

beforeEach(() => {
  addStylesheets();
  track(Object.assign(document.createElement('style'), { textContent: galleryCss }), document.head);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('overflow');
});

type Listener = { target: 'document' | 'window'; type: string; fn: unknown };

/** Records the listeners added to the page and to the window, and which are still there. */
function watchListeners() {
  const added: Listener[] = [];
  const removed: Listener[] = [];
  const hook = (name: 'document' | 'window', target: Document | Window) => {
    const add = target.addEventListener.bind(target) as (...args: unknown[]) => void;
    const remove = target.removeEventListener.bind(target) as (...args: unknown[]) => void;
    // The one listener that all components share for locale changes (SPEC-PHASE-4.md §7.1) is
    // ignored by name. locale-watch.test.ts holds it to one, and to none once components have gone.
    vi.spyOn(target, 'addEventListener').mockImplementation((type, fn, options) => {
      if (type !== 'lit-localize-status') added.push({ target: name, type, fn });
      add(type, fn, options);
    });
    vi.spyOn(target, 'removeEventListener').mockImplementation((type, fn, options) => {
      if (type !== 'lit-localize-status') removed.push({ target: name, type, fn });
      remove(type, fn, options);
    });
  };
  hook('document', document);
  hook('window', window);
  return {
    added,
    /** Added and not removed since. */
    live: () =>
      added.filter(
        (a) => !removed.some((r) => r.target === a.target && r.type === a.type && r.fn === a.fn),
      ),
  };
}

/** Counts the observers made, and those let go. */
function watchObservers() {
  const count = { made: 0, disconnected: 0, kinds: [] as string[] };
  for (const name of ['ResizeObserver', 'MutationObserver', 'IntersectionObserver'] as const) {
    const Original = window[name] as typeof ResizeObserver;
    vi.stubGlobal(
      name,
      class extends Original {
        constructor(callback: never) {
          super(callback);
          count.made++;
          count.kinds.push(name);
        }
        override disconnect() {
          count.disconnected++;
          super.disconnect();
        }
      },
    );
  }
  return count;
}

async function settle(root: ParentNode): Promise<void> {
  const elements = [...root.querySelectorAll('*')].filter((e) => e.localName.startsWith('punk-'));
  await Promise.all(
    elements.map((e) => (e as Element & { updateComplete?: Promise<boolean> }).updateComplete),
  );
}

// The shell with every overlay closed. A toolbar, a select, and a tooltip hold an observer by
// design, and the gallery's window is open, so they are measured on their own below.
const closedShell: ComponentName[] = [
  'panel',
  'divider',
  'stack',
  'cluster',
  'button',
  'icon-button',
  'progress-bar',
  'meter',
  'status-light',
  'slot',
  'item-stack',
  'slot-grid',
  'recipe',
  'accordion',
  'tabs',
  'dialog',
  'popover',
  'toast-stack',
  'checkbox',
  'switch',
  'slider',
  'text-field',
  'number-field',
];

const closedWindow = '<punk-window heading="W" movable dismissible><p>Body</p></punk-window>';

describe('the shell with every overlay closed', () => {
  it('adds no listener to the page or the window, and makes no observer', async () => {
    const listeners = watchListeners();
    const observers = watchObservers();
    const gallery = track(buildGallery('short', closedShell));
    gallery.insertAdjacentHTML('beforeend', closedWindow);
    await settle(gallery);
    expect(listeners.added.map((l) => `${l.target}:${l.type}`)).toEqual([]);
    expect(observers.kinds).toEqual([]);
  });
});

describe('a closed tooltip', () => {
  it('adds no listener to the page, and one observer that keeps its anchor described', async () => {
    const listeners = watchListeners();
    const observers = watchObservers();
    const holder = track(document.createElement('div'));
    holder.innerHTML =
      '<punk-button>Start</punk-button><punk-tooltip>Starts the line</punk-tooltip>';
    await settle(holder);
    expect(listeners.added.filter((l) => l.type === 'keydown')).toEqual([]);
    expect(observers.kinds).toEqual(['MutationObserver']);
  });
});

describe('an open overlay', () => {
  async function open() {
    const holder = track(document.createElement('div'));
    holder.innerHTML = `
      ${closedWindow}
      <punk-dialog heading="D"><p>Body</p></punk-dialog>
      <punk-button>Menu</punk-button>
      <punk-popover><button>Item</button></punk-popover>
    `;
    await settle(holder);
    return {
      window: holder.querySelector('punk-window') as PunkWindow,
      dialog: holder.querySelector('punk-dialog') as PunkDialog,
      popover: holder.querySelector('punk-popover') as PunkPopover,
    };
  }

  it('adds the Escape listener once for any number of them, and takes it away on the last close', async () => {
    const { window: win, dialog, popover } = await open();
    const listeners = watchListeners();
    win.show();
    dialog.show();
    popover.show();
    await Promise.all([win.updateComplete, dialog.updateComplete, popover.updateComplete]);
    expect(
      listeners.added.filter((l) => l.target === 'document' && l.type === 'keydown'),
    ).toHaveLength(1);
    popover.hide();
    dialog.close();
    expect(listeners.live().some((l) => l.type === 'keydown')).toBe(true);
    win.close();
    await Promise.all([win.updateComplete, dialog.updateComplete, popover.updateComplete]);
    expect(listeners.live().filter((l) => l.type === 'keydown')).toEqual([]);
  });

  it('keeps nothing on the page or the window once everything has closed', async () => {
    const { window: win, dialog, popover } = await open();
    const listeners = watchListeners();
    const observers = watchObservers();
    win.show();
    dialog.show();
    popover.show();
    await Promise.all([win.updateComplete, dialog.updateComplete, popover.updateComplete]);
    popover.hide();
    dialog.close();
    win.close();
    await Promise.all([win.updateComplete, dialog.updateComplete, popover.updateComplete]);
    expect(listeners.live().map((l) => `${l.target}:${l.type}`)).toEqual([]);
    expect(observers.disconnected).toBe(observers.made);
  });

  it('gives a popover its observer and its scroll and resize listeners only while it is open', async () => {
    const { popover } = await open();
    const listeners = watchListeners();
    const observers = watchObservers();
    popover.show();
    await popover.updateComplete;
    const types = listeners.live().map((l) => l.type);
    expect(types).toContain('resize');
    expect(observers.made).toBeGreaterThan(0);
    popover.hide();
    await popover.updateComplete;
    expect(listeners.live()).toEqual([]);
    expect(observers.disconnected).toBe(observers.made);
  });
});

describe('a toolbar', () => {
  const toolbar = async (attributes: string, count = 30) => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '300px';
    holder.innerHTML = `<punk-toolbar aria-label="Tools" ${attributes}>${Array.from(
      { length: count },
      (_, i) => `<punk-button>Tool ${i}</punk-button>`,
    ).join(
      '',
    )}<punk-icon-button slot="overflow" label="More"><svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="3"/></svg></punk-icon-button></punk-toolbar>`;
    await settle(holder);
    return holder.firstElementChild as HTMLElement;
  };

  it('makes one ResizeObserver however many items it has, and none with wrap', async () => {
    const observers = watchObservers();
    await toolbar('', 30);
    expect(observers.made).toBe(1);
    observers.made = 0;
    await toolbar('wrap', 30);
    expect(observers.made).toBe(0);
  });

  it('reads no layout for an arrow key', async () => {
    const element = await toolbar('wrap', 12);
    const first = element.querySelector('punk-button') as HTMLElement;
    first.focus();
    const reads = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const clientRects = vi.spyOn(Element.prototype, 'getClientRects');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(reads).not.toHaveBeenCalled();
    expect(clientRects).not.toHaveBeenCalled();
  });
});

describe('a slider drag', () => {
  it('reads the track once, at the press, and not on each move', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '300px';
    holder.innerHTML = '<punk-slider label="Speed" value="20"></punk-slider>';
    const slider = holder.firstElementChild as PunkSlider;
    await slider.updateComplete;
    const area = slider.shadowRoot?.querySelector('.area') as HTMLElement;
    const box = area.getBoundingClientRect();
    const read = vi.spyOn(area, 'getBoundingClientRect');
    await userEvent.dragAndDrop(
      slider.shadowRoot?.querySelector('[part="thumb"]') as HTMLElement,
      area,
      {
        targetPosition: { x: box.width * 0.9, y: box.height / 2 },
      },
    );
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe('a toast stack of ten toasts', () => {
  // A countdown has a delay no other timer on the page shares.
  const DURATION = 7777;

  function watchTimers() {
    const live = new Map<unknown, number>();
    const set = window.setTimeout.bind(window);
    const clear = window.clearTimeout.bind(window);
    vi.spyOn(window, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      const id = set(fn, ms);
      live.set(id, ms ?? 0);
      return id;
    }) as typeof window.setTimeout);
    vi.spyOn(window, 'clearTimeout').mockImplementation(((id?: number) => {
      live.delete(id);
      clear(id);
    }) as typeof window.clearTimeout);
    return () =>
      [...live.values()].filter((ms) => ms > 0 && ms <= DURATION && ms > DURATION - 500).length;
  }

  async function stackOfTen() {
    const holder = track(document.createElement('div'));
    holder.innerHTML = '<punk-toast-stack label="Notices" limit="10"></punk-toast-stack>';
    const stack = holder.firstElementChild as PunkToastStack;
    await stack.updateComplete;
    const toasts: PunkToast[] = [];
    for (let i = 0; i < 10; i++) {
      toasts.push(stack.show({ message: `Notice ${i}`, variant: 'info', duration: DURATION }));
    }
    await settle(holder);
    return toasts;
  }

  it('holds at most ten timers, and none while they are paused', async () => {
    const timers = watchTimers();
    const toasts = await stackOfTen();
    expect(timers()).toBe(10);
    for (const toast of toasts) {
      toast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    }
    expect(timers()).toBe(0);
    for (const toast of toasts)
      toast.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(timers()).toBe(10);
  });
});

describe('a form of fifty controls', () => {
  it('renders, and says how long it took', async () => {
    const kinds = [
      '<punk-checkbox>Option</punk-checkbox>',
      '<punk-switch>Option</punk-switch>',
      '<punk-slider label="Level" value="30"></punk-slider>',
      '<punk-text-field label="Name"></punk-text-field>',
      '<punk-number-field label="Count" value="3"></punk-number-field>',
    ];
    const start = performance.now();
    const form = track(document.createElement('form'));
    form.innerHTML = Array.from({ length: 50 }, (_, i) => kinds[i % kinds.length]).join('');
    await settle(form);
    console.info(`a form of 50 controls rendered in ${(performance.now() - start).toFixed(0)} ms`);
    expect(form.elements.length).toBe(50);
  });
});
