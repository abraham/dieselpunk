import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import { baseTokens } from '../../tokens/base.ts';
import { density } from '../../tokens/density.ts';
import './register.ts';
import type { ClusterAlign, ClusterGap, ClusterJustify, PunkCluster } from './index.ts';

beforeEach(addStylesheets);
afterEach(cleanup);

function container(attributes: Record<string, string> = {}, width?: number): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width !== undefined) element.style.inlineSize = `${width}px`;
  return track(element);
}

const box = (width: number, height = 20) =>
  `<div style="inline-size: ${width}px; block-size: ${height}px"></div>`;

async function mount(
  attributes: Record<string, string> = {},
  options: { parent?: Element; children?: string } = {},
): Promise<PunkCluster> {
  const element = document.createElement('punk-cluster');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.innerHTML = options.children ?? box(40) + box(40) + box(40);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

const rect = (element: Element | null | undefined) =>
  (element as HTMLElement).getBoundingClientRect();
const gapOf = (element: Element) => parseFloat(getComputedStyle(element).columnGap);

describe('defaults', () => {
  it('is a wrapping row with a gap of 2, starting its children, centered across, and reflects them', async () => {
    const cluster = await mount();
    expect(cluster.gap).toBe('2');
    expect(cluster.justify).toBe('start');
    expect(cluster.align).toBe('center');
    expect(cluster.getAttribute('justify')).toBe('start');
    const style = getComputedStyle(cluster);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('row');
    expect(style.flexWrap).toBe('wrap');
    expect(style.alignItems).toBe('center');
    expect(gapOf(cluster)).toBe(parseFloat(baseTokens['space-2']));
  });

  it('has no role and no parts', async () => {
    const cluster = await mount();
    expect(cluster.hasAttribute('role')).toBe(false);
    expect(cluster.shadowRoot?.querySelectorAll('[part]')).toHaveLength(0);
  });
});

describe('gap', () => {
  it.each([
    ['0', 0],
    ['1', parseFloat(baseTokens['space-1'])],
    ['3', parseFloat(baseTokens['space-3'])],
    ['4', parseFloat(baseTokens['space-4'])],
    ['5', parseFloat(baseTokens['space-5'])],
  ] as Array<[ClusterGap, number]>)('maps %s to its spacing token', async (gap, expected) => {
    const cluster = await mount({ gap });
    expect(gapOf(cluster)).toBe(expected);
    expect(parseFloat(getComputedStyle(cluster).rowGap)).toBe(expected);
  });

  it('follows density, and is overridden by --punk-cluster-gap', async () => {
    const cluster = await mount(
      { gap: '5' },
      { parent: container({ 'data-punk-density': 'low' }) },
    );
    expect(gapOf(cluster)).toBe(parseFloat(density.low['space-5']));
    cluster.style.setProperty('--punk-cluster-gap', '3px');
    expect(gapOf(cluster)).toBe(3);
  });

  it('ignores an unknown value', async () => {
    const cluster = await mount({ gap: '9' });
    expect(gapOf(cluster)).toBe(parseFloat(baseTokens['space-2']));
  });
});

describe('wrapping', () => {
  it('moves children onto the next line when they do not fit, with the gap between lines', async () => {
    const wrapper = container({}, 200);
    const cluster = await mount(
      { gap: '3' },
      { parent: wrapper, children: box(80) + box(80) + box(80) },
    );
    const [first, second, third] = [...cluster.children];
    expect(rect(second).top).toBe(rect(first).top);
    expect(rect(third).top).toBe(rect(first).bottom + parseFloat(baseTokens['space-3']));
  });

  it('never forces horizontal scrolling: a long word breaks, down to 187px', async () => {
    const wrapper = container({}, 187);
    const word = `<p style="margin: 0; overflow-wrap: break-word">${'Verarbeitungsanlagenbetriebsvorschrift'.repeat(2)}</p>`;
    await mount({}, { parent: wrapper, children: word + word });
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(187);
  });
});

describe('justify', () => {
  async function positions(justify: ClusterJustify, dir = 'ltr') {
    const wrapper = container({ dir }, 200);
    const cluster = await mount({ justify }, { parent: wrapper, children: box(40) + box(40) });
    const bounds = rect(wrapper);
    const edges = [...cluster.children].map((child) => rect(child));
    const left = Math.min(...edges.map((edge) => edge.left)) - bounds.left;
    const right = bounds.right - Math.max(...edges.map((edge) => edge.right));
    const [first, second] = [...edges].sort((a, b) => a.left - b.left);
    return { left, right, between: (second?.left ?? 0) - (first?.right ?? 0) };
  }

  it('starts at the inline start, which is the right in rtl', async () => {
    expect((await positions('start')).left).toBe(0);
    expect((await positions('start', 'rtl')).right).toBe(0);
  });

  it('centers', async () => {
    const { left, right } = await positions('center');
    expect(Math.abs(left - right)).toBeLessThanOrEqual(0.5);
    expect(left).toBeGreaterThan(0);
  });

  it('ends at the inline end', async () => {
    expect((await positions('end')).right).toBe(0);
    expect((await positions('end', 'rtl')).left).toBe(0);
  });

  it('spreads with space between', async () => {
    const { left, right, between } = await positions('between');
    expect(left).toBe(0);
    expect(right).toBe(0);
    expect(between).toBe(120);
  });

  it('ignores an unknown value', async () => {
    expect((await positions('around' as ClusterJustify)).left).toBe(0);
  });
});

describe('align', () => {
  const children = '<div>Short</div><div style="block-size: 60px">Tall</div>';

  async function tops(align: ClusterAlign) {
    const cluster = await mount({ align }, { children });
    const [short, tall] = [...cluster.children];
    return {
      top: rect(short).top - rect(cluster).top,
      height: rect(short).height,
      tall: rect(tall).height,
    };
  }

  it('centers across the line by default', async () => {
    const { top, height } = await tops('center');
    expect(top).toBeCloseTo((60 - height) / 2, 1);
  });

  it.each([
    ['start', () => 0],
    ['end', (height: number) => 60 - height],
  ] as Array<[ClusterAlign, (height: number) => number]>)(
    'puts items at the %s',
    async (align, top) => {
      const result = await tops(align);
      expect(result.top).toBeCloseTo(top(result.height), 1);
    },
  );

  it('stretches items to the tallest', async () => {
    const result = await tops('stretch');
    expect(result.height).toBe(60);
  });

  it('lines items up by their text with baseline', async () => {
    const cluster = await mount(
      { align: 'baseline' },
      {
        children:
          '<div style="font-size: 12px">Small</div><div style="font-size: 32px">Large</div>',
      },
    );
    const [small, large] = [...cluster.children] as HTMLElement[];
    const baseline = (element: HTMLElement) => {
      const marker = document.createElement('span');
      marker.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0';
      element.append(marker);
      const bottom = marker.getBoundingClientRect().bottom;
      marker.remove();
      return bottom;
    };
    expect(
      Math.abs(baseline(small as HTMLElement) - baseline(large as HTMLElement)),
    ).toBeLessThanOrEqual(0.5);
  });

  it('ignores an unknown value', async () => {
    expect((await tops('middle' as ClusterAlign)).top).toBeCloseTo(
      (60 - (await tops('middle' as ClusterAlign)).height) / 2,
      1,
    );
  });
});
