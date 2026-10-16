import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { baseTokens } from '../../tokens/base.ts';
import { density } from '../../tokens/density.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import { addStylesheets, cleanup, rgb, track } from '../../../test/browser/helpers.ts';
import './register.ts';
import type { PunkDivider } from './index.ts';

interface DividerOptions {
  orientation?: string;
  decorative?: boolean;
  label?: string;
  parent?: Element;
}

const dark = themes.industrial.tokens;
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(options: DividerOptions = {}): Promise<PunkDivider> {
  const element = document.createElement('punk-divider');
  if (options.orientation) element.setAttribute('orientation', options.orientation);
  if (options.decorative) element.decorative = true;
  if (options.label) element.textContent = options.label;
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(styles: Record<string, string> = {}): HTMLElement {
  const element = track(document.createElement('div'));
  Object.assign(element.style, styles);
  return element;
}

function parts(divider: PunkDivider, name: string): HTMLElement[] {
  return Array.from(divider.shadowRoot?.querySelectorAll<HTMLElement>(`[part="${name}"]`) ?? []);
}

function first(divider: PunkDivider, name: string): HTMLElement {
  const found = parts(divider, name)[0];
  if (!found) throw new Error(`Missing part "${name}"`);
  return found;
}

/** Warnings this component logged, ignoring unrelated library output. */
function dividerWarnings(): unknown[][] {
  return warn.mock.calls.filter(([message]) => String(message).includes('<punk-divider>'));
}

describe('semantics', () => {
  it('is a horizontal separator by default', async () => {
    const divider = await mount();
    expect(divider.orientation).toBe('horizontal');
    expect(divider.getAttribute('orientation')).toBe('horizontal');
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('reports a vertical orientation', async () => {
    const divider = await mount({ orientation: 'vertical' });
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('treats an unknown orientation as horizontal', async () => {
    const divider = await mount({ orientation: 'diagonal' });
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(getComputedStyle(divider).display).toBe('flex');
  });

  it('follows orientation changes', async () => {
    const divider = await mount();
    divider.orientation = 'vertical';
    await divider.updateComplete;
    expect(divider.getAttribute('aria-orientation')).toBe('vertical');
    divider.orientation = 'horizontal';
    await divider.updateComplete;
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('removes the separator semantics when decorative', async () => {
    const divider = await mount({ decorative: true });
    expect(divider.getAttribute('role')).toBe('none');
    expect(divider.hasAttribute('aria-orientation')).toBe(false);
    expect(divider.hasAttribute('decorative')).toBe(true);

    divider.decorative = false;
    await divider.updateComplete;
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('drops the orientation when it becomes decorative after mount', async () => {
    const divider = await mount({ orientation: 'vertical' });
    expect(divider.getAttribute('aria-orientation')).toBe('vertical');

    divider.decorative = true;
    await divider.updateComplete;
    expect(divider.getAttribute('role')).toBe('none');
    expect(divider.hasAttribute('aria-orientation')).toBe(false);
  });

  it('stays decorative across orientation changes', async () => {
    const divider = await mount({ decorative: true });
    divider.orientation = 'vertical';
    await divider.updateComplete;
    expect(divider.getAttribute('role')).toBe('none');
    expect(divider.hasAttribute('aria-orientation')).toBe(false);
  });
});

describe('appearance, unstyled (12.1.3)', () => {
  it('draws an etched horizontal line with no stylesheet', async () => {
    const wrapper = container({ width: '300px' });
    const divider = await mount({ parent: wrapper });
    const line = getComputedStyle(first(divider, 'line'));

    expect(line.borderTopWidth).toBe('1px');
    expect(line.borderBottomWidth).toBe('1px');
    expect(line.borderTopColor).toBe(rgb(dark['color-edge-dark']));
    expect(line.borderBottomColor).toBe(rgb(dark['color-edge-light']));
    expect(divider.getBoundingClientRect().height).toBe(2);
    expect(divider.getBoundingClientRect().width).toBe(300);
    expect(first(divider, 'line').getBoundingClientRect().width).toBe(300);
  });

  it('draws an etched vertical line that stretches in a flex row', async () => {
    const row = container({ display: 'flex', height: '100px' });
    const divider = await mount({ orientation: 'vertical', parent: row });
    const line = getComputedStyle(first(divider, 'line'));

    expect(line.borderLeftWidth).toBe('1px');
    expect(line.borderRightWidth).toBe('1px');
    expect(line.borderLeftColor).toBe(rgb(dark['color-edge-dark']));
    expect(line.borderRightColor).toBe(rgb(dark['color-edge-light']));
    expect(divider.getBoundingClientRect().height).toBe(100);
    expect(divider.getBoundingClientRect().width).toBe(2);
  });

  it('stays visible outside a flex container', async () => {
    const divider = await mount({ orientation: 'vertical', parent: container() });
    expect(divider.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      parseFloat(getComputedStyle(divider).fontSize),
    );
  });

  it('follows each theme when stylesheets are loaded', async () => {
    addStylesheets();
    for (const name of themeNames) {
      const wrapper = container();
      wrapper.setAttribute('data-punk-theme', name);
      const line = getComputedStyle(first(await mount({ parent: wrapper }), 'line'));
      expect(line.borderTopColor, name).toBe(rgb(themes[name].tokens['color-edge-dark']));
      expect(line.borderBottomColor, name).toBe(rgb(themes[name].tokens['color-edge-light']));
    }
  });
});

describe('label', () => {
  it('renders no label or second line while empty', async () => {
    const divider = await mount();
    expect(first(divider, 'label').hidden).toBe(true);
    expect(parts(divider, 'line')[1]?.hidden).toBe(true);
    expect(parts(divider, 'line')[0]?.hidden).toBe(false);
  });

  it('centers the label between two lines', async () => {
    const divider = await mount({ label: 'Section', parent: container({ width: '400px' }) });
    const [left, right] = parts(divider, 'line').map((line) => line.getBoundingClientRect());
    const label = first(divider, 'label').getBoundingClientRect();
    const host = divider.getBoundingClientRect();

    if (!left || !right) throw new Error('Expected two lines');
    expect(first(divider, 'label').hidden).toBe(false);
    expect(Math.abs(left.width - right.width)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(label.left + label.width / 2 - (host.left + host.width / 2)),
    ).toBeLessThanOrEqual(1);
    expect(label.left - left.right).toBe(parseFloat(baseTokens['space-2']));
    expect(right.left - label.right).toBe(parseFloat(baseTokens['space-2']));
  });

  it('keeps the label centered in a right-to-left context', async () => {
    const wrapper = container({ width: '400px' });
    wrapper.dir = 'rtl';
    const divider = await mount({ label: 'Section', parent: wrapper });
    const label = first(divider, 'label').getBoundingClientRect();
    const host = divider.getBoundingClientRect();
    expect(
      Math.abs(label.left + label.width / 2 - (host.left + host.width / 2)),
    ).toBeLessThanOrEqual(1);
  });

  it('colors the label with the muted text token', async () => {
    const divider = await mount({ label: 'Section', parent: container() });
    expect(getComputedStyle(first(divider, 'label')).color).toBe(rgb(dark['color-text-muted']));
  });

  it('honors --punk-divider-gap', async () => {
    const divider = await mount({ label: 'Section', parent: container({ width: '400px' }) });
    divider.style.setProperty('--punk-divider-gap', '20px');
    const left = parts(divider, 'line')[0]?.getBoundingClientRect();
    const label = first(divider, 'label').getBoundingClientRect();
    if (!left) throw new Error('Expected a line');
    expect(label.left - left.right).toBe(20);
  });

  it('uses a larger gap in low density', async () => {
    addStylesheets();
    const wrapper = container({ width: '400px' });
    wrapper.setAttribute('data-punk-density', 'low');
    const divider = await mount({ label: 'Section', parent: wrapper });
    const left = parts(divider, 'line')[0]?.getBoundingClientRect();
    const label = first(divider, 'label').getBoundingClientRect();
    if (!left) throw new Error('Expected a line');
    expect(label.left - left.right).toBe(parseFloat(density.low['space-2']));
  });

  it('appears when content is added later and disappears when removed', async () => {
    const divider = await mount({ parent: container({ width: '400px' }) });
    const text = document.createTextNode('Later');
    divider.append(text);
    await vi.waitFor(() => expect(first(divider, 'label').hidden).toBe(false));
    expect(parts(divider, 'line')[1]?.hidden).toBe(false);

    text.remove();
    await vi.waitFor(() => expect(first(divider, 'label').hidden).toBe(true));
  });

  it('does not count whitespace-only text as a label', async () => {
    const divider = document.createElement('punk-divider');
    divider.textContent = '  \n  ';
    track(divider);
    await divider.updateComplete;
    expect(first(divider, 'label').hidden).toBe(true);
  });

  it('accepts an element as the label', async () => {
    const divider = document.createElement('punk-divider');
    divider.append(Object.assign(document.createElement('b'), { textContent: 'Bold' }));
    track(divider);
    await divider.updateComplete;
    expect(first(divider, 'label').hidden).toBe(false);
  });
});

describe('vertical dividers and labels', () => {
  it('ignores the label and warns once', async () => {
    const divider = await mount({ orientation: 'vertical', label: 'Ignored', parent: container() });
    expect(first(divider, 'label').hidden).toBe(true);
    expect(first(divider, 'label').getBoundingClientRect().width).toBe(0);
    expect(parts(divider, 'line')[1]?.hidden).toBe(true);
    expect(dividerWarnings()).toHaveLength(1);
    expect(String(dividerWarnings()[0]?.[0])).toContain('vertical divider');
  });

  it('does not warn for a labeled horizontal divider or an unlabeled vertical one', async () => {
    await mount({ label: 'Fine' });
    await mount({ orientation: 'vertical' });
    expect(dividerWarnings()).toHaveLength(0);
  });

  it('warns when a label is added to a vertical divider later', async () => {
    const divider = await mount({ orientation: 'vertical' });
    divider.append(document.createTextNode('Late'));
    await vi.waitFor(() => expect(dividerWarnings()).toHaveLength(1));
  });

  it('warns once per occurrence, not on every update', async () => {
    const divider = await mount({ orientation: 'vertical', label: 'Ignored' });
    divider.decorative = true;
    await divider.updateComplete;
    divider.decorative = false;
    await divider.updateComplete;
    expect(dividerWarnings()).toHaveLength(1);

    divider.orientation = 'horizontal';
    await divider.updateComplete;
    divider.orientation = 'vertical';
    await divider.updateComplete;
    expect(dividerWarnings()).toHaveLength(2);
  });

  it('shows the label again when it becomes horizontal', async () => {
    const divider = await mount({ orientation: 'vertical', label: 'Back' });
    divider.orientation = 'horizontal';
    await divider.updateComplete;
    expect(first(divider, 'label').hidden).toBe(false);
  });
});
