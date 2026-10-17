import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../test/browser/helpers.ts';
import { setLocale } from '../../test/browser/locale.ts';
import '../components/button/register.ts';
import '../components/slot/register.ts';
import '../components/item-stack/register.ts';
import '../components/meter/register.ts';
import '../components/recipe/register.ts';
import '../components/toast/register.ts';
import '../components/window/register.ts';
import '../components/number-field/register.ts';
import '../components/panel/register.ts';
import '../components/production-stat/register.ts';
import '../components/connection-row/register.ts';
import type { PunkButton } from '../components/button/index.ts';
import { localeEpoch, watchLocale } from './locale-watch.ts';

const EVENT = 'lit-localize-status';

beforeEach(addStylesheets);

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await setLocale('en');
});

const status = (detail: { status: string }) =>
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));

/** The status listeners that are on the window now: added, and not removed since. */
function watchStatusListeners() {
  let live = 0;
  let added = 0;
  let removed = 0;
  const add = window.addEventListener.bind(window) as (...args: unknown[]) => void;
  const remove = window.removeEventListener.bind(window) as (...args: unknown[]) => void;
  vi.spyOn(window, 'addEventListener').mockImplementation((type, fn, options) => {
    if (type === EVENT) {
      live++;
      added++;
    }
    add(type, fn, options);
  });
  vi.spyOn(window, 'removeEventListener').mockImplementation((type, fn, options) => {
    if (type === EVENT) {
      live--;
      removed++;
    }
    remove(type, fn, options);
  });
  return { live: () => live, added: () => added, removed: () => removed };
}

describe('watchLocale', () => {
  it('updates every host once when the locale is ready, and not for loading or an error', () => {
    const hosts = [{ requestUpdate: vi.fn() }, { requestUpdate: vi.fn() }];
    const stops = hosts.map(watchLocale);
    status({ status: 'loading' });
    status({ status: 'error' });
    for (const host of hosts) expect(host.requestUpdate).not.toHaveBeenCalled();
    status({ status: 'ready' });
    for (const host of hosts) expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    for (const stop of stops) stop();
  });

  it('stops updating a host that has let go', () => {
    const kept = { requestUpdate: vi.fn() };
    const dropped = { requestUpdate: vi.fn() };
    const stopKept = watchLocale(kept);
    watchLocale(dropped)();
    status({ status: 'ready' });
    expect(kept.requestUpdate).toHaveBeenCalledTimes(1);
    expect(dropped.requestUpdate).not.toHaveBeenCalled();
    stopKept();
  });

  it('lets go once, however often a host calls its remover', () => {
    const first = { requestUpdate: vi.fn() };
    const second = { requestUpdate: vi.fn() };
    const stopFirst = watchLocale(first);
    const stopSecond = watchLocale(second);
    stopFirst();
    stopFirst();
    status({ status: 'ready' });
    expect(first.requestUpdate).not.toHaveBeenCalled();
    expect(second.requestUpdate).toHaveBeenCalledTimes(1);
    stopSecond();
  });

  it('updates a host that arrives after all the others have gone', () => {
    watchLocale({ requestUpdate: vi.fn() })();
    const host = { requestUpdate: vi.fn() };
    const stop = watchLocale(host);
    status({ status: 'ready' });
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    stop();
  });

  it('counts each ready locale, and nothing else', () => {
    const stop = watchLocale({ requestUpdate: vi.fn() });
    const before = localeEpoch();
    status({ status: 'loading' });
    status({ status: 'error' });
    expect(localeEpoch()).toBe(before);
    status({ status: 'ready' });
    expect(localeEpoch()).toBe(before + 1);
    stop();
  });
});

describe('a component and the locale', () => {
  async function mount(loading = true): Promise<PunkButton> {
    const button = track(document.createElement('punk-button')) as PunkButton;
    button.loading = loading;
    await button.updateComplete;
    return button;
  }

  const status = (button: PunkButton) =>
    button.shadowRoot?.querySelector('[role="status"]')?.textContent;

  it('renders again once when the locale becomes ready, and in the new language', async () => {
    const render = vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(document.createElement('punk-button'))),
      'render',
    );
    const buttons = await Promise.all([mount(), mount(), mount()]);
    const rendered = () => buttons.map((b) => render.mock.contexts.filter((c) => c === b).length);
    const before = rendered();

    await setLocale('de');
    await Promise.all(buttons.map((b) => b.updateComplete));

    expect(rendered()).toEqual(before.map((count) => count + 1));
    for (const button of buttons) expect(status(button)).toBe('Laden');
  });

  it('does not render one that is not connected, and renders it once in the active locale on return', async () => {
    const button = await mount();
    const holder = button.parentElement as HTMLElement;
    button.remove();
    await setLocale('de');
    await button.updateComplete;
    expect(status(button)).toBe('Loading');
    holder.append(button);
    await button.updateComplete;
    expect(status(button)).toBe('Laden');
  });

  it('renders a component that connects afterward in the active locale', async () => {
    await setLocale('de');
    expect(status(await mount())).toBe('Laden');
  });

  it('adds at most one status listener for all its components, and never takes it away', async () => {
    const listeners = watchStatusListeners();
    const buttons = await Promise.all(Array.from({ length: 20 }, () => mount(false)));
    expect(listeners.added()).toBeLessThanOrEqual(1);
    buttons.forEach((button) => button.remove());
    expect(listeners.live()).toBeGreaterThanOrEqual(0);
    expect(listeners.removed()).toBe(0);
  });

  it('creates no observer', async () => {
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
    await mount();
    await setLocale('de');
    expect(created).toEqual([]);
    vi.unstubAllGlobals();
  });
});

/** The words a component shows or names itself with: its text, and its ARIA labels. */
function words(element: Element): string {
  const root = element.shadowRoot as ShadowRoot;
  const labels = [...root.querySelectorAll('[aria-label], [aria-valuetext], [title]')].map(
    (node) =>
      `${node.getAttribute('aria-label') ?? ''} ${node.getAttribute('aria-valuetext') ?? ''} ${node.getAttribute('title') ?? ''}`,
  );
  return `${root.textContent} ${labels.join(' ')}`;
}

// Every component whose render calls msg() must watch the locale, or it stays in the old language.
const messageRenderers: Array<[string, Record<string, string>, string, string]> = [
  ['punk-button', { loading: '' }, 'Loading', 'Laden'],
  ['punk-slot', { label: 'Slot', invalid: '' }, 'invalid', 'ungültig'],
  ['punk-item-stack', { name: 'Coil', count: '3', capacity: '9' }, '3 of 9', '9 max, 3 da'],
  [
    'punk-meter',
    { label: 'Power', value: '15', low: '30', high: '70', optimum: '50' },
    'warning',
    'Warnung',
  ],
  ['punk-recipe', { name: 'Gear' }, 'unavailable', 'nicht verfügbar'],
  ['punk-toast', {}, 'Dismiss', 'Schließen'],
  ['punk-toast-stack', {}, 'Notifications', 'Benachrichtigungen'],
  ['punk-window', { heading: 'W', open: '', dismissible: '' }, 'Close', 'Schließen'],
  ['punk-number-field', { label: 'Count' }, 'Increase', 'Erhöhen'],
  ['punk-production-stat', { label: 'Output' }, 'no value', 'kein Wert'],
  ['punk-connection-row', { direction: 'both' }, 'to and from', 'hin und zurück'],
];

describe('every component that renders a message', () => {
  it.each(messageRenderers)(
    '%s follows the locale, both ways',
    async (tag, attributes, english, german) => {
      const element = track(document.createElement(tag)) as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
      await element.updateComplete;
      expect(words(element)).toContain(english);

      await setLocale('de');
      await element.updateComplete;
      expect(words(element)).toContain(german);
      expect(words(element)).not.toContain(english);

      await setLocale('en');
      await element.updateComplete;
      expect(words(element)).toContain(english);
    },
  );

  it('is not needed by a component that renders none: a panel is not drawn again', async () => {
    const render = vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(document.createElement('punk-panel'))),
      'render',
    );
    const panel = track(document.createElement('punk-panel')) as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await panel.updateComplete;
    const before = render.mock.contexts.filter((context) => context === panel).length;
    await setLocale('de');
    await panel.updateComplete;
    expect(render.mock.contexts.filter((context) => context === panel).length).toBe(before);
  });
});
