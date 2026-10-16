import { commands, server } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderThemesCss, renderTokensCss } from '../../../scripts/render-css.ts';
import { baseTokens } from '../../tokens/base.ts';
import { density } from '../../tokens/density.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import type { PanelDensity, PanelVariant, PunkPanel } from './index.ts';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

function track<T extends Element>(element: T, parent: Element = document.body): T {
  parent.append(element);
  cleanups.push(() => element.remove());
  return element;
}

function addStylesheets(): void {
  for (const css of [renderTokensCss(), renderThemesCss()]) {
    const style = document.createElement('style');
    style.textContent = css;
    track(style, document.head);
  }
}

interface PanelOptions {
  variant?: PanelVariant | string;
  density?: PanelDensity;
  header?: boolean;
  footer?: boolean;
  parent?: Element;
}

async function mount(options: PanelOptions = {}): Promise<PunkPanel> {
  const element = document.createElement('punk-panel');
  if (options.variant) element.variant = options.variant as PanelVariant;
  if (options.density) element.density = options.density;
  if (options.header) element.append(slotted('header'));
  if (options.footer) element.append(slotted('footer'));
  element.append(
    Object.assign(document.createElement('div'), { id: 'content', textContent: 'Content' }),
  );
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function slotted(name: string): HTMLElement {
  const child = document.createElement('div');
  child.slot = name;
  child.textContent = name;
  return child;
}

function part(panel: PunkPanel, name: string): HTMLElement {
  const found = panel.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!found) throw new Error(`Missing part "${name}"`);
  return found;
}

function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

const dark = themes.industrial.tokens;

describe('variants', () => {
  it('raised has a vertical gradient fill', async () => {
    const style = getComputedStyle(part(await mount({ variant: 'raised' }), 'surface'));
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(style.boxShadow).not.toBe('none');
  });

  it('inset is a solid inset fill', async () => {
    const style = getComputedStyle(part(await mount({ variant: 'inset' }), 'surface'));
    expect(style.backgroundImage).toBe('none');
    expect(style.backgroundColor).toBe(rgb(dark['color-panel-inset']));
    expect(style.boxShadow).not.toBe('none');
  });

  it('flat is a solid panel fill', async () => {
    const style = getComputedStyle(part(await mount({ variant: 'flat' }), 'surface'));
    expect(style.backgroundImage).toBe('none');
    expect(style.backgroundColor).toBe(rgb(dark['color-panel']));
    expect(style.boxShadow).not.toBe('none');
  });

  it('defaults to raised and reflects the variant', async () => {
    const panel = await mount();
    expect(panel.variant).toBe('raised');
    expect(panel.getAttribute('variant')).toBe('raised');
  });

  it('renders an unknown variant as raised', async () => {
    const panel = await mount({ variant: 'banana' });
    expect(getComputedStyle(part(panel, 'surface')).backgroundImage).toContain('linear-gradient');
  });

  it('follows each theme when stylesheets are loaded', async () => {
    addStylesheets();
    for (const name of themeNames) {
      const host = track(document.createElement('div'));
      host.setAttribute('data-punk-theme', name);
      const panel = await mount({ variant: 'inset', parent: host });
      expect(getComputedStyle(part(panel, 'surface')).backgroundColor, name).toBe(
        rgb(themes[name].tokens['color-panel-inset']),
      );
    }
  });
});

describe('unstyled page (12.1.3)', () => {
  it('renders the default dark, compact appearance with no stylesheet', async () => {
    const panel = await mount({ variant: 'flat' });
    expect(getComputedStyle(part(panel, 'surface')).backgroundColor).toBe(rgb(dark['color-panel']));
    expect(getComputedStyle(panel).color).toBe(rgb(dark['color-text']));
    expect(getComputedStyle(panel).fontFamily).toContain('Chakra Petch');
    expect(getComputedStyle(part(panel, 'body')).paddingTop).toBe(baseTokens['space-3']);
  });
});

describe('layout', () => {
  it('imposes no fixed width or height', async () => {
    const container = track(document.createElement('div'));
    container.style.width = '300px';
    const panel = await mount({ parent: container });
    const body = part(panel, 'body');
    const content = panel.querySelector<HTMLElement>('#content');
    if (!content) throw new Error('Missing content');
    content.style.height = '50px';

    expect(getComputedStyle(panel).display).toBe('block');
    expect(panel.style.width).toBe('');
    expect(panel.style.height).toBe('');
    expect(panel.getBoundingClientRect().width).toBe(300);
    // Content height plus the body's 12px of padding on each side.
    expect(body.getBoundingClientRect().height).toBe(50 + 24);

    container.style.width = '500px';
    expect(panel.getBoundingClientRect().width).toBe(500);
    content.style.height = '90px';
    expect(body.getBoundingClientRect().height).toBe(90 + 24);
  });

  it('honors --punk-panel-padding', async () => {
    const panel = await mount();
    panel.style.setProperty('--punk-panel-padding', '30px');
    expect(getComputedStyle(part(panel, 'body')).paddingTop).toBe('30px');
  });
});

describe('header and footer', () => {
  it('render no strip while their slots are empty', async () => {
    const panel = await mount();
    for (const name of ['header', 'footer']) {
      expect(part(panel, name).hidden, name).toBe(true);
      expect(part(panel, name).getBoundingClientRect().height, name).toBe(0);
    }
  });

  it('render a strip when content is present at connection', async () => {
    const panel = await mount({ header: true, footer: true });
    for (const name of ['header', 'footer']) {
      expect(part(panel, name).hidden, name).toBe(false);
      expect(part(panel, name).getBoundingClientRect().height, name).toBeGreaterThan(0);
    }
  });

  it('show a strip when content is added later, and hide it when removed', async () => {
    const panel = await mount();
    const header = slotted('header');
    panel.append(header);
    await vi.waitFor(() => expect(part(panel, 'header').hidden).toBe(false));
    expect(part(panel, 'header').getBoundingClientRect().height).toBeGreaterThan(0);
    expect(part(panel, 'footer').hidden).toBe(true);

    header.remove();
    await vi.waitFor(() => expect(part(panel, 'header').hidden).toBe(true));
  });

  it('react to a child gaining or losing its slot attribute', async () => {
    const panel = await mount();
    const child = track(document.createElement('div'), panel);
    child.textContent = 'later';
    expect(part(panel, 'footer').hidden).toBe(true);

    child.slot = 'footer';
    await vi.waitFor(() => expect(part(panel, 'footer').hidden).toBe(false));
    child.removeAttribute('slot');
    await vi.waitFor(() => expect(part(panel, 'footer').hidden).toBe(true));
  });

  it('style the strips as darker bands with an etched edge', async () => {
    const panel = await mount({ header: true, footer: true, variant: 'flat' });
    const header = getComputedStyle(part(panel, 'header'));
    expect(header.backgroundColor).toBe(rgb(dark['color-panel-inset']));
    expect(header.borderBottomWidth).toBe('1px');
    expect(getComputedStyle(part(panel, 'footer')).borderTopWidth).toBe('1px');
  });
});

describe('density', () => {
  // A light-DOM probe that reads the token the way any descendant component would.
  function addProbe(parent: Element): HTMLElement {
    const probe = track(document.createElement('div'), parent);
    probe.style.padding = 'var(--punk-space-3, 12px)';
    return probe;
  }

  it('low increases spacing for descendants and not for siblings', async () => {
    const container = track(document.createElement('div'));
    const panel = await mount({ density: 'low', parent: container });
    const inside = addProbe(panel);
    const outside = addProbe(container);

    expect(getComputedStyle(inside).paddingTop).toBe(density.low['space-3']);
    expect(getComputedStyle(part(panel, 'body')).paddingTop).toBe(density.low['space-3']);
    expect(getComputedStyle(outside).paddingTop).toBe(density.compact['space-3']);
  });

  it('works without any stylesheet and reflects to an attribute', async () => {
    const panel = await mount({ density: 'low' });
    expect(panel.getAttribute('density')).toBe('low');
    expect(getComputedStyle(addProbe(panel)).paddingTop).toBe(density.low['space-3']);
  });

  it('inherits from ancestors when unset, and an explicit value overrides them', async () => {
    addStylesheets();
    const container = track(document.createElement('div'));
    container.setAttribute('data-punk-density', 'low');

    const inherited = await mount({ parent: container });
    expect(getComputedStyle(part(inherited, 'body')).paddingTop).toBe(density.low['space-3']);

    const compact = await mount({ density: 'compact', parent: container });
    expect(getComputedStyle(part(compact, 'body')).paddingTop).toBe(density.compact['space-3']);
  });

  it('returns to the inherited density when the property is cleared', async () => {
    const panel = await mount({ density: 'low' });
    panel.density = undefined;
    await panel.updateComplete;
    expect(panel.hasAttribute('density')).toBe(false);
    expect(getComputedStyle(part(panel, 'body')).paddingTop).toBe(density.compact['space-3']);
  });
});

describe('texture', () => {
  const pseudo = (panel: PunkPanel) => getComputedStyle(part(panel, 'surface'), '::before');

  it('overlays noise on raised and flat without catching pointer events', async () => {
    for (const variant of ['raised', 'flat'] as const) {
      const style = pseudo(await mount({ variant }));
      expect(style.content, variant).toBe('""');
      expect(style.pointerEvents, variant).toBe('none');
      expect(style.opacity, variant).toBe(dark['texture-opacity']);
      expect(style.backgroundImage, variant).toContain('data:image/svg+xml');
    }
  });

  it('is absent on inset', async () => {
    expect(pseudo(await mount({ variant: 'inset' })).content).not.toBe('""');
  });

  it('is switched off by the reduced-texture theme', async () => {
    addStylesheets();
    const host = track(document.createElement('div'));
    host.setAttribute('data-punk-theme', 'reduced-texture');
    expect(pseudo(await mount({ parent: host })).opacity).toBe('0');
  });

  it('lets clicks reach slotted content', async () => {
    const panel = await mount({ variant: 'raised' });
    const content = panel.querySelector<HTMLElement>('#content');
    if (!content) throw new Error('Missing content');
    const rect = content.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + 2, rect.top + 2);
    expect(hit).toBe(content);
  });
});

describe('semantics', () => {
  it('has no ARIA role of its own and accepts one from the consumer', async () => {
    const panel = await mount();
    expect(panel.hasAttribute('role')).toBe(false);
    expect(part(panel, 'surface').hasAttribute('role')).toBe(false);
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Machine');
    expect(panel.getAttribute('role')).toBe('region');
  });
});

describe('forced colors', () => {
  it.skipIf(server.browser !== 'chromium')('uses a plain system-color border', async () => {
    const panel = await mount({ variant: 'raised' });
    const surface = part(panel, 'surface');
    expect(getComputedStyle(surface).borderTopWidth).toBe('0px');

    await commands.setForcedColors('active');
    try {
      const style = getComputedStyle(surface);
      expect(style.borderTopWidth).toBe('2px');
      expect(style.boxShadow).toBe('none');
      expect(getComputedStyle(surface, '::before').display).toBe('none');
    } finally {
      await commands.setForcedColors(null);
    }
  });
});
