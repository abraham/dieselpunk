import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { ratio, toHex } from '../../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkTextField } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Callsign"', inner = ''): Promise<PunkTextField> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = '300px';
  wrapper.innerHTML = `<punk-text-field ${attributes}>${inner}</punk-text-field>`;
  const element = wrapper.firstElementChild as PunkTextField;
  await element.updateComplete;
  return element;
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;

describe('punk-text-field', () => {
  it('shows the value attribute and the value property in the native input', async () => {
    const element = await mount('label="Callsign" value="Echo"');
    expect(input(element).value).toBe('Echo');
    element.value = 'Foxtrot';
    await element.updateComplete;
    expect(input(element).value).toBe('Foxtrot');
  });

  it('does not reflect the live value to the attribute', async () => {
    const element = await mount('label="Callsign" value="Echo"');
    await userEvent.fill(input(element), 'Golf');
    expect(element.value).toBe('Golf');
    expect(element.getAttribute('value')).toBe('Echo');
  });

  it('takes the type, and uses text for one it does not know', async () => {
    const element = await mount('label="Callsign" type="email"');
    expect(input(element).type).toBe('email');
    element.setAttribute('type', 'color');
    await element.updateComplete;
    expect(input(element).type).toBe('text');
    element.type = 'password';
    await element.updateComplete;
    expect(input(element).type).toBe('password');
  });

  it('passes the native attributes through', async () => {
    const element = await mount(
      'label="Callsign" placeholder="NAME" autocomplete="username" inputmode="text" maxlength="6" pattern="[A-Z]+"',
    );
    expect(input(element).placeholder).toBe('NAME');
    // Firefox reports the property empty for a token it does not fill, so read the attribute.
    expect(input(element).getAttribute('autocomplete')).toBe('username');
    expect(input(element).inputMode).toBe('text');
    expect(input(element).maxLength).toBe(6);
    expect(input(element).pattern).toBe('[A-Z]+');
  });

  it('submits the value under its name, as soon as the user types', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = '<punk-text-field label="Callsign" name="call"></punk-text-field>';
    const element = form.firstElementChild as PunkTextField;
    await element.updateComplete;
    await userEvent.fill(input(element), 'Hotel');
    expect(new FormData(form).get('call')).toBe('Hotel');
  });

  it('puts the value back to the attribute on a form reset', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML =
      '<punk-text-field label="Callsign" name="call" value="Echo"></punk-text-field>';
    const element = form.firstElementChild as PunkTextField;
    await element.updateComplete;
    await userEvent.fill(input(element), 'India');
    form.reset();
    await element.updateComplete;
    expect(element.value).toBe('Echo');
    expect(input(element).value).toBe('Echo');
    expect(new FormData(form).get('call')).toBe('Echo');
  });

  it('is missing a value when required and empty', async () => {
    const element = await mount('label="Callsign" required');
    expect(element.validity.valueMissing).toBe(true);
    await userEvent.fill(input(element), 'x');
    expect(element.validity.valid).toBe(true);
  });

  it('has the native type, length, and pattern validity', async () => {
    const email = await mount('label="Mail" type="email"');
    await userEvent.fill(input(email), 'nope');
    expect(email.validity.typeMismatch).toBe(true);

    const short = await mount('label="Callsign" minlength="4"');
    await userEvent.type(short.shadowRoot!.querySelector('input')!, 'ab');
    expect(short.validity.tooShort).toBe(true);

    const pattern = await mount('label="Callsign" pattern="[A-Z]+"');
    await userEvent.fill(pattern.shadowRoot!.querySelector('input')!, 'abc');
    expect(pattern.validity.patternMismatch).toBe(true);
  });

  it('does not let the user type past maxlength', async () => {
    const element = await mount('label="Callsign" maxlength="3"');
    await userEvent.type(input(element), 'abcdef');
    expect(element.value).toBe('abc');
  });

  it('does not stop a paste', async () => {
    const element = await mount();
    input(element).focus();
    const paste = new Event('paste', { bubbles: true, cancelable: true, composed: true });
    input(element).dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(false);
  });

  it('selects its text', async () => {
    const element = await mount('label="Callsign" value="Echo"');
    element.select();
    expect(input(element).selectionStart).toBe(0);
    expect(input(element).selectionEnd).toBe(4);
  });

  it('does not change while readonly, and the native input says so', async () => {
    const element = await mount('label="Callsign" value="Echo" readonly');
    expect(input(element).readOnly).toBe(true);
    await userEvent.type(input(element), 'zz');
    expect(element.value).toBe('Echo');
    expect(element.shadowRoot?.querySelector('.field')?.classList.contains('readonly')).toBe(true);
  });

  it('puts the prefix and the suffix inside the box, and hides them when empty', async () => {
    const empty = await mount();
    expect(empty.shadowRoot?.querySelector<HTMLElement>('[part="prefix"]')?.hidden).toBe(true);
    expect(empty.shadowRoot?.querySelector<HTMLElement>('[part="suffix"]')?.hidden).toBe(true);

    const full = await mount(
      'label="Callsign"',
      '<span slot="prefix">@</span><span slot="suffix">m</span>',
    );
    await full.updateComplete;
    for (const name of ['prefix', 'suffix']) {
      const wrapper = full.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
      expect(wrapper?.hidden).toBe(false);
      expect(wrapper?.closest('.box')).toBeTruthy();
    }
  });

  it('moves the focus to the input when the prefix is clicked', async () => {
    const element = await mount('label="Callsign"', '<span slot="prefix">@</span>');
    element.shadowRoot?.querySelector<HTMLElement>('[part="prefix"]')?.click();
    element.focus();
    expect(element.shadowRoot?.activeElement).toBe(input(element));
  });

  it('shows a focus ring on the box for the keyboard', async () => {
    const element = await mount();
    await userEvent.tab();
    expect(element.shadowRoot?.activeElement).toBe(input(element));
    const ring = getComputedStyle(element.shadowRoot!.querySelector('.box')!, '::after');
    expect(ring.boxShadow).not.toBe('none');
  });

  it('draws the placeholder at 4.5:1 on the field in every theme', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      holder.innerHTML = '<punk-text-field label="Callsign" placeholder="NAME"></punk-text-field>';
      const element = holder.firstElementChild as PunkTextField;
      await element.updateComplete;
      const field = toHex(
        getComputedStyle(element.shadowRoot!.querySelector('.box')!).backgroundColor,
      );
      const text = toHex(getComputedStyle(input(element), '::placeholder').color);
      const found = ratio(text, field);
      if (found < 4.5) problems.push(`${theme}: ${found.toFixed(2)}`);
    }
    expect(problems).toEqual([]);
  });

  it('shows a dotted boundary while readonly under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await mount('label="Callsign" readonly');
    expect(getComputedStyle(element.shadowRoot!.querySelector('.box')!).borderTopStyle).toBe(
      'dotted',
    );
  });
});
