import { commands } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { renderThemesCss, renderTokensCss } from '../../scripts/render-css.ts';
import { baseTokens } from '../../src/tokens/base.ts';
import { density, densityModes } from '../../src/tokens/density.ts';
import type { DensityMode } from '../../src/tokens/density.ts';
import { themeNames, themes } from '../../src/tokens/themes.ts';
import type { ThemeName } from '../../src/tokens/themes.ts';
import './commands.ts';
import './fixtures/probe.ts';
import type { PunkProbe } from './fixtures/probe.ts';

const cleanups: Array<() => void> = [];

afterEach(async () => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.documentElement.removeAttribute('data-punk-theme');
  document.documentElement.removeAttribute('data-punk-density');
  await commands.setColorScheme(null);
});

function track<T extends Element>(element: T, parent: Element = document.body): T {
  parent.append(element);
  cleanups.push(() => element.remove());
  return element;
}

function addStylesheets(order: Array<'tokens' | 'themes'> = ['tokens', 'themes']): void {
  for (const name of order) {
    const style = document.createElement('style');
    style.textContent = name === 'tokens' ? renderTokensCss() : renderThemesCss();
    track(style, document.head);
  }
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return track(element);
}

async function mount(parent: Element = document.body): Promise<PunkProbe> {
  const probe = track(document.createElement('punk-probe') as PunkProbe, parent);
  await probe.updateComplete;
  return probe;
}

/** What every token should resolve to for a theme and density. */
function expectedTokens(theme: ThemeName, mode: DensityMode = 'compact'): Record<string, string> {
  return { ...baseTokens, ...density[mode], ...themes[theme].tokens };
}

/** What the probe's components actually resolved each token to. */
function resolvedTokens(probe: PunkProbe): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const marker of probe.shadowRoot?.querySelectorAll<HTMLElement>('i[data-token]') ?? []) {
    const name = marker.dataset.token ?? '';
    resolved[name] = getComputedStyle(marker).getPropertyValue('--probe').trim();
  }
  return resolved;
}

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

function expectAppearance(probe: PunkProbe, theme: ThemeName, mode: DensityMode, label: string) {
  const style = getComputedStyle(probe);
  const tokens = expectedTokens(theme, mode);
  expect(style.backgroundColor, `${label} background`).toBe(rgb(tokens['color-panel'] ?? ''));
  expect(style.color, `${label} text`).toBe(rgb(tokens['color-text'] ?? ''));
  expect(style.paddingTop, `${label} padding`).toBe(tokens['space-3']);
  expect(style.height, `${label} height`).toBe(tokens['control-height-md']);
}

describe('12.1.3 unstyled page', () => {
  it('has no punk stylesheet or custom properties to lean on', () => {
    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue('--punk-color-panel')).toBe('');
    expect(root.getPropertyValue('--punk-space-3')).toBe('');
  });

  it('resolves every token to its default dark, compact value', async () => {
    const probe = await mount();
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial', 'compact'));
  });

  it('renders the default dark, compact appearance', async () => {
    const probe = await mount();
    expectAppearance(probe, 'industrial', 'compact', 'unstyled');
    expect(getComputedStyle(probe).fontFamily).toContain('Chakra Petch');
    expect(getComputedStyle(probe).boxSizing).toBe('border-box');
  });

  it('applies the shared base styles without the component declaring them', async () => {
    const probe = await mount();
    probe.hidden = true;
    expect(getComputedStyle(probe).display).toBe('none');
  });
});

describe('12.1.4 theme and density attributes', () => {
  const combinations = themeNames.flatMap((theme) =>
    densityModes.map((mode) => [theme, mode] as const),
  );

  it('restyles one element across all eight theme and density combinations', async () => {
    addStylesheets();
    const host = container();
    const probe = await mount(host);
    const firstMarker = probe.shadowRoot?.querySelector('i');

    expect(combinations).toHaveLength(8);
    for (const [theme, mode] of combinations) {
      const label = `${theme}/${mode}`;
      host.setAttribute('data-punk-theme', theme);
      host.setAttribute('data-punk-density', mode);

      expect(resolvedTokens(probe), label).toEqual(expectedTokens(theme, mode));
      expectAppearance(probe, theme, mode, label);
      expect(getComputedStyle(host).colorScheme, `${label} color-scheme`).toBe(
        themes[theme].colorScheme,
      );
    }

    // Same element, same rendered DOM: restyled, not re-created.
    expect(host.firstElementChild).toBe(probe);
    expect(probe.connections).toBe(1);
    expect(probe.shadowRoot?.querySelector('i')).toBe(firstMarker);
  });

  it('uses the compact defaults when density is unset, even with stylesheets loaded', async () => {
    addStylesheets();
    const probe = await mount(container({ 'data-punk-theme': 'industrial-light' }));
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial-light', 'compact'));
  });

  it('applies to an ancestor that is <html>, in either stylesheet order', async () => {
    for (const order of [
      ['tokens', 'themes'],
      ['themes', 'tokens'],
    ] as const) {
      addStylesheets([...order]);
      document.documentElement.setAttribute('data-punk-theme', 'high-contrast');
      document.documentElement.setAttribute('data-punk-density', 'low');
      const probe = await mount();
      expect(resolvedTokens(probe), order.join(' then ')).toEqual(
        expectedTokens('high-contrast', 'low'),
      );
      probe.remove();
      while (cleanups.length > 0) cleanups.pop()?.();
    }
  });

  it('lets a compact subtree sit inside a low-density one', async () => {
    addStylesheets();
    const outer = container({ 'data-punk-density': 'low' });
    const inner = track(document.createElement('div'), outer);
    inner.setAttribute('data-punk-density', 'compact');

    expect(resolvedTokens(await mount(outer))['space-3']).toBe(density.low['space-3']);
    expect(resolvedTokens(await mount(inner))['space-3']).toBe(density.compact['space-3']);
  });

  it('lets a nested theme override an outer one', async () => {
    addStylesheets();
    const outer = container({ 'data-punk-theme': 'industrial-light' });
    const inner = track(document.createElement('div'), outer);
    inner.setAttribute('data-punk-theme', 'industrial');

    expect(resolvedTokens(await mount(outer))['color-panel']).toBe(
      themes['industrial-light'].tokens['color-panel'],
    );
    expect(resolvedTokens(await mount(inner))['color-panel']).toBe(
      themes.industrial.tokens['color-panel'],
    );
  });

  it('honors a plain custom-property override on a subtree', async () => {
    addStylesheets();
    const host = container({ 'data-punk-theme': 'industrial-light' });
    host.style.setProperty('--punk-color-panel', '#123456');
    host.style.setProperty('--punk-space-3', '30px');
    const probe = await mount(host);

    expect(getComputedStyle(probe).backgroundColor).toBe(rgb('#123456'));
    expect(getComputedStyle(probe).paddingTop).toBe('30px');
  });
});

describe('12.1.5 auto theme', () => {
  async function expectEmulated(scheme: 'light' | 'dark'): Promise<void> {
    await commands.setColorScheme(scheme);
    expect(matchMedia('(prefers-color-scheme: light)').matches).toBe(scheme === 'light');
  }

  it('follows a light preference', async () => {
    addStylesheets();
    await expectEmulated('light');
    const probe = await mount(container({ 'data-punk-theme': 'auto' }));
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial-light'));
    expectAppearance(probe, 'industrial-light', 'compact', 'auto/light');
  });

  it('follows a dark preference', async () => {
    addStylesheets();
    await expectEmulated('dark');
    const probe = await mount(container({ 'data-punk-theme': 'auto' }));
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial'));
    expectAppearance(probe, 'industrial', 'compact', 'auto/dark');
  });

  it('updates a mounted element when the preference changes', async () => {
    addStylesheets();
    const host = container({ 'data-punk-theme': 'auto' });
    const probe = await mount(host);

    await expectEmulated('light');
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial-light'));
    await expectEmulated('dark');
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial'));

    expect(host.firstElementChild).toBe(probe);
    expect(probe.connections).toBe(1);
  });

  it('stays dark when nested in an explicit light theme under a dark preference', async () => {
    addStylesheets();
    await expectEmulated('dark');
    const outer = container({ 'data-punk-theme': 'industrial-light' });
    const inner = track(document.createElement('div'), outer);
    inner.setAttribute('data-punk-theme', 'auto');
    expect(resolvedTokens(await mount(inner))).toEqual(expectedTokens('industrial'));
  });

  it('does not follow the preference for explicit themes', async () => {
    addStylesheets();
    await expectEmulated('light');
    const probe = await mount(container({ 'data-punk-theme': 'industrial' }));
    expect(resolvedTokens(probe)).toEqual(expectedTokens('industrial'));
  });
});
