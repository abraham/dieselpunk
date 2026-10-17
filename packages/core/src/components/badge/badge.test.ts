import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { BadgeVariant, PunkBadge } from './index.ts';

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const variants: BadgeVariant[] = ['neutral', 'info', 'success', 'warning', 'danger'];

async function mount(attributes = '', content = '3', parent?: Element): Promise<PunkBadge> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-badge ${attributes}>${content}</punk-badge>`);
  const element = wrapper.lastElementChild as PunkBadge;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const shape = (element: Element) => element.shadowRoot?.querySelector('.shape') as HTMLElement;

/** The shape with every color gone, or `none` when no shape is drawn. */
function silhouette(element: Element): string {
  const style = getComputedStyle(shape(element));
  if (style.display === 'none') return 'none';
  return JSON.stringify([
    style.clipPath,
    style.borderTopLeftRadius,
    style.borderTopWidth,
    style.backgroundColor === 'rgba(0, 0, 0, 0)',
  ]);
}

describe('variants', () => {
  it('draws no shape for neutral and its own shape for every other variant', async () => {
    const found = new Set<string>();
    for (const variant of variants) found.add(silhouette(await mount(`variant="${variant}"`)));
    expect(found.size).toBe(variants.length);
    expect(silhouette(await mount())).toBe('none');
  });

  it('keeps the variants apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const found = new Set<string>();
    for (const variant of variants) found.add(silhouette(await mount(`variant="${variant}"`)));
    expect(found.size).toBe(variants.length);
    expect(getComputedStyle(part(await mount(), 'badge')).borderTopStyle).toBe('solid');
  });

  it('renders an unknown variant as neutral, and follows the attribute both ways', async () => {
    const element = await mount('variant="broken"');
    expect(silhouette(element)).toBe('none');
    element.setAttribute('variant', 'danger');
    await element.updateComplete;
    expect(silhouette(element)).not.toBe('none');
    element.removeAttribute('variant');
    await element.updateComplete;
    expect(element.variant).toBeNull();
    expect(silhouette(element)).toBe('none');
  });

  it('draws text and shapes that meet their contrast on the plate in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      for (const variant of variants) {
        const element = await mount(`variant="${variant}"`, '12', holder);
        const plate = toHex(getComputedStyle(part(element, 'badge')).backgroundColor);
        const text = ratio(toHex(getComputedStyle(part(element, 'label')).color), plate);
        if (text < 4.5) problems.push(`${theme} ${variant} text: ${text.toFixed(2)}`);
        if (variant === 'neutral') continue;
        const mark = ratio(toHex(getComputedStyle(shape(element)).color), plate);
        if (mark < 3) problems.push(`${theme} ${variant} shape: ${mark.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('text and semantics', () => {
  it('has no role, hides its shape, and adds its text to the name of what holds it', async () => {
    const holder = track(document.createElement('div'));
    holder.innerHTML = '<button>Inbox <punk-badge variant="info">3</punk-badge></button>';
    const element = holder.querySelector('punk-badge') as PunkBadge;
    await element.updateComplete;
    expect(element.hasAttribute('role')).toBe(false);
    expect(shape(element).getAttribute('aria-hidden')).toBe('true');
    expect(page.getByRole('button', { name: 'Inbox 3' }).element()).toBeTruthy();
  });

  it('wraps a long text inside a narrow container', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '120px';
    const element = await mount(
      'variant="warning"',
      'Zwischenproduktverarbeitungsanlage überlastet',
      holder,
    );
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(120.5);
    expect(holder.scrollWidth).toBeLessThanOrEqual(121);
  });
});

describe('warnings', () => {
  it('warns once when there is no text, and again if the text goes away', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bare = await mount('', '');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-badge> It has no text');
    bare.requestUpdate();
    await bare.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    const element = await mount('', '7');
    expect(warn).toHaveBeenCalledTimes(1);
    element.textContent = '';
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
