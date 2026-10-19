import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkTag } from './index.ts';

afterEach(async () => {
  cleanup();
  await setLocale('en');
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(attributes = '', content = 'Copper', parent?: Element): Promise<PunkTag> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-tag ${attributes}>${content}</punk-tag>`);
  const element = wrapper.lastElementChild as PunkTag;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const button = (element: Element) => part(element, 'remove-button') as HTMLButtonElement;

function listen() {
  const events: CustomEvent[] = [];
  const handler = (event: Event) => events.push(event as CustomEvent);
  document.addEventListener('punk-remove', handler);
  return { events, stop: () => document.removeEventListener('punk-remove', handler) };
}

describe('semantics', () => {
  it('is its text alone, with no role and no button unless removable', async () => {
    const element = await mount();
    expect(element.hasAttribute('role')).toBe(false);
    expect(button(element)).toBeNull();
    expect(part(element, 'label').querySelector('slot')).toBeTruthy();
  });

  it('names its native remove button with its text', async () => {
    const element = await mount('removable', ' Iron   ore ');
    expect(button(element).localName).toBe('button');
    expect(button(element).type).toBe('button');
    expect(page.getByRole('button', { name: 'Remove Iron ore' }).element()).toBe(button(element));
  });

  it('takes remove-label as the name instead, and follows a change of text', async () => {
    const element = await mount('removable remove-label="Clear the copper filter"');
    expect(button(element).getAttribute('aria-label')).toBe('Clear the copper filter');
    element.removeAttribute('remove-label');
    element.textContent = 'Tin';
    await new Promise((resolve) => setTimeout(resolve));
    await element.updateComplete;
    expect(button(element).getAttribute('aria-label')).toBe('Remove Tin');
  });

  it('is named in the page locale, and changes with it', async () => {
    const element = await mount('removable');
    await setLocale('de');
    await vi.waitFor(() =>
      expect(button(element).getAttribute('aria-label')).toBe('Copper entfernen'),
    );
    await setLocale('en');
    await vi.waitFor(() =>
      expect(button(element).getAttribute('aria-label')).toBe('Remove Copper'),
    );
  });
});

describe('removing', () => {
  it('sends punk-remove from a click, once, with its value and itself, and stays in the page', async () => {
    const element = await mount('removable value="cu"');
    const { events, stop } = listen();
    button(element).click();
    stop();
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ value: 'cu', item: element });
    expect(events[0]?.bubbles).toBe(true);
    expect(events[0]?.composed).toBe(true);
    expect(events[0]?.cancelable).toBe(false);
    expect(element.isConnected).toBe(true);
  });

  it.each(['{Enter}', ' '])('sends it once for %j on the button', async (key) => {
    const element = await mount('removable');
    const { events, stop } = listen();
    button(element).focus();
    await userEvent.keyboard(key);
    stop();
    expect(events).toHaveLength(1);
  });

  it('sends nothing for a click on the text', async () => {
    const element = await mount('removable');
    const { events, stop } = listen();
    part(element, 'label').click();
    element.click();
    stop();
    expect(events).toEqual([]);
  });

  it('disables the button, sends nothing, and keeps the text readable', async () => {
    const live = await mount('removable');
    const element = await mount('removable disabled');
    expect(button(element).disabled).toBe(true);
    const { events, stop } = listen();
    button(element).click();
    stop();
    expect(events).toEqual([]);
    expect(getComputedStyle(part(element, 'label')).color).toBe(
      getComputedStyle(part(live, 'label')).color,
    );
  });

  it('draws a disabled remove button flat and dimmed, with no pointer', async () => {
    const live = getComputedStyle(button(await mount('removable')));
    const style = getComputedStyle(button(await mount('removable disabled')));
    expect(style.backgroundImage).toBe('none');
    expect(style.color).not.toBe(live.color);
    expect(style.boxShadow).not.toBe(live.boxShadow);
    expect(style.cursor).toBe('not-allowed');
  });
});

describe('appearance', () => {
  it('puts the button at the inline end, in both directions', async () => {
    const element = await mount('removable');
    expect(
      part(element, 'tag').getBoundingClientRect().right -
        button(element).getBoundingClientRect().right,
    ).toBeLessThan(6);
    const holder = track(document.createElement('div'));
    holder.dir = 'rtl';
    const rtl = await mount('removable', 'نحاس', holder);
    expect(
      button(rtl).getBoundingClientRect().left - part(rtl, 'tag').getBoundingClientRect().left,
    ).toBeLessThan(6);
  });

  it('meets text contrast on the plate in every theme', async () => {
    addStylesheets();
    const problems: string[] = [];
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      const element = await mount('removable', 'Copper', holder);
      const plate = toHex(getComputedStyle(part(element, 'tag')).backgroundColor);
      const text = ratio(toHex(getComputedStyle(part(element, 'label')).color), plate);
      if (text < 4.5) problems.push(`${theme}: ${text.toFixed(2)}`);
    }
    expect(problems).toEqual([]);
  });

  it('keeps its outline and the button glyph under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount('removable');
    expect(getComputedStyle(part(element, 'tag')).borderTopStyle).toBe('solid');
    const glyph = button(element).querySelector('.glyph') as HTMLElement;
    expect(getComputedStyle(glyph).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('wraps a long text and keeps the button inside a narrow container', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '120px';
    const element = await mount(
      'removable',
      'Zwischenproduktverarbeitungsanlage überlastet',
      holder,
    );
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(120.5);
    expect(holder.scrollWidth).toBeLessThanOrEqual(121);
    expect(button(element).getBoundingClientRect().right).toBeLessThanOrEqual(
      holder.getBoundingClientRect().right + 0.5,
    );
  });
});

describe('warnings', () => {
  it('warns once when there is no text', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bare = await mount('removable', '');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-tag> It has no text');
    bare.requestUpdate();
    await bare.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
    await mount('', 'Tin');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
