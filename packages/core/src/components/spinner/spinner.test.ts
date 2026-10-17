import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkSpinner } from './index.ts';

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await setLocale('en');
});

async function mount(attributes = '', content = ''): Promise<PunkSpinner> {
  const wrapper = track(document.createElement('div'));
  wrapper.innerHTML = `<punk-spinner ${attributes}>${content}</punk-spinner>`;
  const element = wrapper.firstElementChild as PunkSpinner;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;

describe('status', () => {
  it('says "Loading" in a hidden status, and hides the ring', async () => {
    const element = await mount();
    const status = page.getByRole('status').element() as HTMLElement;
    expect(status).toBe(part(element, 'label'));
    expect(status.textContent?.trim()).toBe('Loading');
    expect(part(element, 'spinner').getAttribute('aria-hidden')).toBe('true');
    expect(status.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it('shows slotted text instead, inside the status', async () => {
    const element = await mount('', 'Fetching recipes');
    const label = part(element, 'label');
    expect(label.querySelector('.visually-hidden')?.hasAttribute('hidden')).toBe(true);
    const slot = label.querySelector('slot') as HTMLSlotElement;
    expect(slot.assignedNodes().map((node) => node.textContent)).toEqual(['Fetching recipes']);
    expect(label.getBoundingClientRect().width).toBeGreaterThan(20);
    element.textContent = '';
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(label.querySelector('.visually-hidden')?.hasAttribute('hidden')).toBe(false);
  });

  it('follows the locale', async () => {
    const element = await mount();
    await setLocale('de');
    await element.updateComplete;
    expect(part(element, 'label').textContent?.trim()).toBe('Laden');
  });
});

describe('ring', () => {
  it('turns, and is sized from the icon sizes, with unknown sizes as md', async () => {
    const sizes: Record<string, number> = {};
    for (const size of ['sm', 'md', 'lg', 'broken']) {
      const spinner = part(await mount(`size="${size}"`), 'spinner');
      sizes[size] = spinner.getBoundingClientRect().width;
      expect(getComputedStyle(spinner).animationName).toBe('punk-spin');
    }
    expect(sizes['sm']).toBeLessThan(sizes['md'] as number);
    expect(sizes['md']).toBeLessThan(sizes['lg'] as number);
    expect(sizes['broken']).toBe(sizes['md']);
  });

  it('follows the size attribute both ways', async () => {
    const element = await mount('size="lg"');
    const lg = part(element, 'spinner').getBoundingClientRect().width;
    element.removeAttribute('size');
    await element.updateComplete;
    expect(part(element, 'spinner').getBoundingClientRect().width).toBeLessThan(lg);
    element.size = 'lg';
    await element.updateComplete;
    expect(element.getAttribute('size')).toBe('lg');
  });
});
