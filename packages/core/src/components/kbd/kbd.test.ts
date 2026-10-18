import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkKbd } from './index.ts';

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(content = 'Ctrl', parent?: Element): Promise<PunkKbd> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-kbd>${content}</punk-kbd>`);
  const element = wrapper.lastElementChild as PunkKbd;
  await element.updateComplete;
  return element;
}

const key = (element: Element) => element.shadowRoot?.querySelector('[part="key"]') as HTMLElement;

describe('semantics', () => {
  it('wraps its text in a native kbd, with no role of its own', async () => {
    const element = await mount();
    expect(key(element).localName).toBe('kbd');
    expect(key(element).querySelector('slot')).toBeTruthy();
    expect(element.hasAttribute('role')).toBe(false);
    expect(element.textContent).toBe('Ctrl');
  });

  it('adds a shortcut to the name of what holds it, in order', async () => {
    const holder = track(document.createElement('div'));
    holder.innerHTML = '<button>Save <punk-kbd>Ctrl</punk-kbd> + <punk-kbd>S</punk-kbd></button>';
    await Promise.all(
      [...holder.querySelectorAll('punk-kbd')].map((element) => element.updateComplete),
    );
    expect(page.getByRole('button', { name: 'Save Ctrl + S' }).element()).toBeTruthy();
  });
});

describe('appearance', () => {
  it('draws its text in the mono face, on a cap with a deeper bottom edge', async () => {
    const style = getComputedStyle(key(await mount()));
    expect(style.fontFamily).toMatch(/mono/i);
    expect(parseFloat(style.borderBottomWidth)).toBeGreaterThan(parseFloat(style.borderTopWidth));
  });

  it('meets text contrast against the cap in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      const element = await mount('Enter', holder);
      const probe = holder.appendChild(document.createElement('div'));
      probe.style.background = 'var(--punk-color-panel)';
      const plate = toHex(getComputedStyle(probe).backgroundColor);
      const text = ratio(toHex(getComputedStyle(key(element)).color), plate);
      if (text < 4.5) problems.push(`${theme}: ${text.toFixed(2)}`);
    }
    expect(problems).toEqual([]);
  });

  it('keeps an outline and the deeper edge under forced colors', async () => {
    await commands.setForcedColors('active');
    const style = getComputedStyle(key(await mount()));
    expect(style.borderTopStyle).toBe('solid');
    expect(parseFloat(style.borderBottomWidth)).toBeGreaterThan(parseFloat(style.borderTopWidth));
  });

  it('wraps a long key name inside a narrow container', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '80px';
    const element = await mount('Rücktaste-Umschalttaste', holder);
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(80.5);
    expect(holder.scrollWidth).toBeLessThanOrEqual(81);
  });
});

describe('warnings', () => {
  it('warns once when there is no text, and again if the text goes away', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bare = await mount('');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-kbd> It has no text');
    bare.requestUpdate();
    await bare.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    const element = await mount('Esc');
    expect(warn).toHaveBeenCalledTimes(1);
    element.textContent = '';
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
