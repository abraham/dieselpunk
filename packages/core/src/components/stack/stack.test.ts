import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import { baseTokens } from '../../tokens/base.ts';
import { density } from '../../tokens/density.ts';
import './register.ts';
import type { PunkStack, StackAlign, StackGap } from './index.ts';

beforeEach(addStylesheets);
afterEach(cleanup);

function container(attributes: Record<string, string> = {}, width?: number): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width !== undefined) element.style.inlineSize = `${width}px`;
  return track(element);
}

async function mount(
  attributes: Record<string, string> = {},
  options: { parent?: Element; children?: string } = {},
): Promise<PunkStack> {
  const element = document.createElement('punk-stack');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.innerHTML =
    options.children ??
    '<div style="block-size: 20px">One</div><div style="block-size: 20px">Two</div><div style="block-size: 20px">Three</div>';
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

const gapOf = (element: Element) => parseFloat(getComputedStyle(element).rowGap);

describe('defaults', () => {
  it('is a column with a gap of 2, stretching its children, and reflects both', async () => {
    const stack = await mount();
    expect(stack.gap).toBe('2');
    expect(stack.align).toBe('stretch');
    expect(stack.getAttribute('gap')).toBe('2');
    expect(stack.getAttribute('align')).toBe('stretch');
    const style = getComputedStyle(stack);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(gapOf(stack)).toBe(parseFloat(baseTokens['space-2']));
  });

  it('has no role and no parts', async () => {
    const stack = await mount();
    expect(stack.hasAttribute('role')).toBe(false);
    expect(stack.shadowRoot?.querySelectorAll('[part]')).toHaveLength(0);
  });
});

describe('gap', () => {
  it.each([
    ['0', 0],
    ['1', parseFloat(baseTokens['space-1'])],
    ['2', parseFloat(baseTokens['space-2'])],
    ['3', parseFloat(baseTokens['space-3'])],
    ['4', parseFloat(baseTokens['space-4'])],
    ['5', parseFloat(baseTokens['space-5'])],
  ] as Array<[StackGap, number]>)('maps %s to its spacing token', async (gap, expected) => {
    const stack = await mount({ gap });
    expect(gapOf(stack)).toBe(expected);
  });

  it('follows density', async () => {
    const stack = await mount({ gap: '3' }, { parent: container({ 'data-punk-density': 'low' }) });
    expect(gapOf(stack)).toBe(parseFloat(density.low['space-3']));
  });

  it('is overridden by --punk-stack-gap', async () => {
    const stack = await mount({ gap: '1' });
    stack.style.setProperty('--punk-stack-gap', '30px');
    expect(gapOf(stack)).toBe(30);
  });

  it('ignores an unknown value, in the property and in the attribute', async () => {
    const stack = await mount();
    stack.setAttribute('gap', '9');
    await stack.updateComplete;
    expect(gapOf(stack)).toBe(parseFloat(baseTokens['space-2']));
    stack.gap = 'wide' as StackGap;
    await stack.updateComplete;
    expect(gapOf(stack)).toBe(parseFloat(baseTokens['space-2']));
  });

  it('spaces the children by the gap', async () => {
    const stack = await mount({ gap: '4' });
    const [first, second] = [...stack.children] as HTMLElement[];
    expect(
      (second as HTMLElement).getBoundingClientRect().top -
        (first as HTMLElement).getBoundingClientRect().bottom,
    ).toBe(parseFloat(baseTokens['space-4']));
  });
});

describe('align', () => {
  const narrow = '<div style="inline-size: 40px; block-size: 20px">Narrow</div>';

  it('stretches children by default', async () => {
    const stack = await mount(
      {},
      { parent: container({}, 200), children: narrow.replace('inline-size: 40px;', '') },
    );
    expect((stack.firstElementChild as HTMLElement).getBoundingClientRect().width).toBe(200);
  });

  it.each([
    ['start', 0],
    ['center', 80],
    ['end', 160],
  ] as Array<[StackAlign, number]>)('puts children at the %s', async (align, offset) => {
    const wrapper = container({}, 200);
    const stack = await mount({ align }, { parent: wrapper, children: narrow });
    const left =
      (stack.firstElementChild as HTMLElement).getBoundingClientRect().left -
      wrapper.getBoundingClientRect().left;
    expect(left).toBe(offset);
  });

  it('puts start at the right on a right-to-left page', async () => {
    const wrapper = container({ dir: 'rtl' }, 200);
    const stack = await mount({ align: 'start' }, { parent: wrapper, children: narrow });
    const child = (stack.firstElementChild as HTMLElement).getBoundingClientRect();
    expect(child.right).toBe(wrapper.getBoundingClientRect().right);
  });

  it('ignores an unknown value', async () => {
    const stack = await mount(
      { align: 'sideways' },
      { parent: container({}, 200), children: narrow.replace('inline-size: 40px;', '') },
    );
    expect((stack.firstElementChild as HTMLElement).getBoundingClientRect().width).toBe(200);
  });
});

describe('layout', () => {
  it('never forces horizontal scrolling: a long word breaks, down to 187px', async () => {
    const wrapper = container({}, 187);
    const word = `<p style="margin: 0; overflow-wrap: break-word">${'Verarbeitungsanlagenbetriebsvorschrift'.repeat(2)}</p>`;
    for (const align of ['stretch', 'start', 'center', 'end']) {
      await mount({ align }, { parent: wrapper, children: word });
    }
    expect(wrapper.scrollWidth).toBeLessThanOrEqual(187);
  });

  it('can be nested in itself', async () => {
    const outer = await mount(
      {},
      { children: '<punk-stack id="inner"><div>A</div><div>B</div></punk-stack>' },
    );
    const inner = outer.querySelector('punk-stack') as PunkStack;
    await inner.updateComplete;
    expect(getComputedStyle(inner).display).toBe('flex');
  });
});
