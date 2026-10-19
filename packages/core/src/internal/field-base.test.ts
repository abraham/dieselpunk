import { commands } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../test/browser/helpers.ts';
import '../../test/browser/commands.ts';
import { ratio, toHex } from '../../test/browser/receptacle-helpers.ts';
import { themeNames } from '../tokens/themes.ts';
import '../components/text-field/register.ts';
import '../components/number-field/register.ts';
import '../components/select/register.ts';
import type { PunkFieldBase } from './field-base.ts';

// What the text field, the number field, and the select share, run once for each of them.

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const tags = ['punk-text-field', 'punk-number-field', 'punk-select'] as const;
type Tag = (typeof tags)[number];

const options =
  '<option value="">Choose</option><option value="a">Alpha</option><option value="b">Beta</option>';

const valid = (tag: Tag) => (tag === 'punk-select' ? 'a' : '1');

async function mount(
  tag: Tag,
  attributes = 'label="Callsign"',
  extra = '',
  width = 300,
): Promise<PunkFieldBase> {
  const wrapper = track(document.createElement('div'));
  wrapper.style.inlineSize = `${width}px`;
  wrapper.innerHTML = `<${tag} ${attributes}>${tag === 'punk-select' ? options : ''}${extra}</${tag}>`;
  const element = wrapper.firstElementChild as PunkFieldBase;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const control = (element: Element) =>
  element.shadowRoot?.querySelector('.control') as HTMLInputElement | HTMLSelectElement;
const box = (element: Element) => element.shadowRoot?.querySelector('.box') as HTMLElement;

async function touch(element: PunkFieldBase): Promise<void> {
  element.focus();
  control(element).blur();
  await element.updateComplete;
  await element.updateComplete;
}

describe.each(tags)('%s as a field', (tag) => {
  it('renders the label, the native control, the hint, and a message that is hidden', async () => {
    const element = await mount(tag);
    expect(part(element, 'label').textContent).toBe('Callsign');
    expect(part(element, 'label').hidden).toBe(false);
    expect(part(element, 'control')).toBe(control(element));
    expect(part(element, 'hint').hidden).toBe(true);
    expect(part(element, 'message').hidden).toBe(true);
    expect(part(element, 'field')).toBeTruthy();
  });

  it('hides the label element when there is none', async () => {
    const element = await mount(tag, 'aria-label="Callsign"');
    expect(part(element, 'label').hidden).toBe(true);
  });

  it('marks a required field for sight, hidden from assistive technology', async () => {
    const optional = await mount(tag);
    expect(part(optional, 'label').querySelector('.required-mark')).toBeNull();
    const element = await mount(tag, 'label="Callsign" required');
    const mark = part(element, 'label').querySelector('.required-mark') as HTMLElement;
    expect(mark.textContent?.trim()).toBe('*');
    expect(mark.getAttribute('aria-hidden')).toBe('true');
  });

  it('names the control with the rendered label', async () => {
    const element = await mount(tag);
    expect(control(element).labels?.[0]).toBe(part(element, 'label'));
    expect(control(element).hasAttribute('aria-label')).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('carries the host aria-label to the control when there is no label', async () => {
    const element = await mount(tag, 'aria-label="Callsign"');
    expect(control(element).getAttribute('aria-label')).toBe('Callsign');
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to the text of a label that points at the host', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = `<label for="f">Callsign</label><${tag} id="f">${tag === 'punk-select' ? options : ''}</${tag}>`;
    const element = wrapper.querySelector(tag) as PunkFieldBase;
    await element.updateComplete;
    expect(control(element).getAttribute('aria-label')).toBe('Callsign');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once that it has no name', async () => {
    const element = await mount(tag, '');
    element.setAttribute('name', 'x');
    await element.updateComplete;
    const messages = warn.mock.calls.filter((call) => /accessible name/.test(String(call[0])));
    expect(messages).toHaveLength(1);
  });

  it('describes the control with the hint, and shows it only when it has content', async () => {
    const element = await mount(tag, 'label="Callsign"', '<span slot="hint">Three letters</span>');
    expect(part(element, 'hint').hidden).toBe(false);
    expect(control(element).getAttribute('aria-describedby')).toBe('hint');
  });

  it('waits to show a message until the user has left the field', async () => {
    const element = await mount(tag, 'label="Callsign" required');
    expect(element.checkValidity()).toBe(false);
    expect(part(element, 'message').hidden).toBe(true);
    expect(control(element).hasAttribute('aria-invalid')).toBe(false);

    await touch(element);
    expect(part(element, 'message').hidden).toBe(false);
    expect(part(element, 'message').textContent).toMatch(/invalid:\s*\S/);
    // The text takes its direction from its own language, so its punctuation stays put on a right-to-left page.
    expect(part(element, 'message').querySelector('[dir="auto"]')).not.toBeNull();
    expect(control(element).getAttribute('aria-invalid')).toBe('true');
    expect(control(element).getAttribute('aria-describedby')).toBe('message');
  });

  it('shows the message when a form reports validity, and puts it away on reset', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = `<${tag} label="Callsign" required name="c">${tag === 'punk-select' ? options : ''}</${tag}>`;
    const element = form.firstElementChild as PunkFieldBase;
    await element.updateComplete;
    form.reportValidity();
    await element.updateComplete;
    await element.updateComplete;
    expect(part(element, 'message').hidden).toBe(false);
    form.reset();
    await element.updateComplete;
    await element.updateComplete;
    expect(part(element, 'message').hidden).toBe(true);
  });

  it('puts the message away once the value is valid', async () => {
    const element = await mount(tag, 'label="Callsign" required');
    await touch(element);
    expect(part(element, 'message').hidden).toBe(false);
    (element as unknown as { value: string }).value = valid(tag);
    await element.updateComplete;
    await element.updateComplete;
    expect(part(element, 'message').hidden).toBe(true);
    expect(control(element).hasAttribute('aria-invalid')).toBe(false);
  });

  it('puts the focus on the native control, from focus(), from the label, and from the host', async () => {
    const element = await mount(tag);
    element.focus();
    expect(document.activeElement).toBe(element);
    expect(element.shadowRoot?.activeElement).toBe(control(element));
    control(element).blur();
    part(element, 'label').click();
    expect(element.shadowRoot?.activeElement).toBe(control(element));
  });

  it('reports the anchor in the shadow tree so a form can focus the field', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = `<${tag} label="Callsign" required>${tag === 'punk-select' ? options : ''}</${tag}>`;
    const element = form.firstElementChild as PunkFieldBase;
    await element.updateComplete;
    form.reportValidity();
    expect(element.shadowRoot?.activeElement).toBe(control(element));
  });

  it('disables the native control with the host, and with a disabled fieldset around it', async () => {
    const own = await mount(tag, 'label="Callsign" disabled');
    expect(control(own).disabled).toBe(true);

    const fieldset = track(document.createElement('fieldset'));
    fieldset.disabled = true;
    fieldset.innerHTML = `<${tag} label="Callsign">${tag === 'punk-select' ? options : ''}</${tag}>`;
    const inside = fieldset.firstElementChild as PunkFieldBase;
    await inside.updateComplete;
    expect(control(inside).disabled).toBe(true);
    expect(inside.disabled).toBe(false);
  });

  it('sends input across the shadow boundary, and change once from the host', async () => {
    const element = await mount(tag);
    const log: string[] = [];
    element.addEventListener('input', () => log.push('input'));
    element.addEventListener('change', () => log.push('change'));
    control(element).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    control(element).dispatchEvent(new Event('change', { bubbles: true }));
    expect(log).toEqual(['input', 'change']);
  });

  it('takes a custom error and clears it with an empty message', async () => {
    const element = await mount(tag);
    element.setCustomValidity('Taken');
    expect(element.validity.customError).toBe(true);
    expect(element.validationMessage).toBe('Taken');
    element.setCustomValidity('');
    expect(element.validity.valid).toBe(true);
  });

  it('has a boundary that meets 3:1 on every surface in every theme, and a hint that meets 4.5:1', async () => {
    const problems: string[] = [];
    for (const theme of themeNames) {
      for (const surface of ['canvas', 'panel', 'panel-raised', 'panel-inset']) {
        const holder = track(document.createElement('div'));
        holder.setAttribute('data-punk-theme', theme);
        holder.style.cssText = `background: var(--punk-color-${surface}); inline-size: 300px`;
        holder.innerHTML = `<${tag} label="Callsign">${tag === 'punk-select' ? options : ''}<span slot="hint">Three letters</span></${tag}>`;
        const element = holder.firstElementChild as PunkFieldBase;
        await element.updateComplete;
        const behind = toHex(getComputedStyle(holder).backgroundColor);
        const edge = toHex(getComputedStyle(box(element)).borderTopColor);
        const boundary = ratio(edge, behind);
        if (boundary < 3) problems.push(`${theme} boundary on ${surface}: ${boundary.toFixed(2)}`);
        // `text-muted` is not required on panel-raised, which carries controls (specs/visual-system.md §4.2).
        if (surface === 'panel-raised') continue;
        const hint = ratio(toHex(getComputedStyle(part(element, 'hint')).color), behind);
        if (hint < 4.5) problems.push(`${theme} hint on ${surface}: ${hint.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('draws the message in the text color, with a shape, and a danger frame on the box', async () => {
    const element = await mount(tag, 'label="Callsign" required');
    const before = getComputedStyle(box(element)).boxShadow;
    await touch(element);
    expect(getComputedStyle(part(element, 'message')).color).toBe(
      getComputedStyle(part(element, 'label')).color,
    );
    expect(part(element, 'message').querySelector('.shape')).toBeTruthy();
    expect(getComputedStyle(box(element)).boxShadow).not.toBe(before);
  });

  it('looks different while disabled', async () => {
    const on = await mount(tag);
    const off = await mount(tag, 'label="Callsign" disabled');
    expect(getComputedStyle(box(off)).borderTopColor).not.toBe(
      getComputedStyle(box(on)).borderTopColor,
    );
  });

  it('keeps a solid boundary under forced colors, and a dashed one once invalid', async () => {
    await commands.setForcedColors('active');
    const element = await mount(tag, 'label="Callsign" required');
    expect(getComputedStyle(box(element)).borderTopStyle).toBe('solid');
    await touch(element);
    expect(getComputedStyle(box(element)).borderTopStyle).toBe('dashed');
  });

  it('does not overflow at 187px with a long label and hint', async () => {
    const element = await mount(
      tag,
      'label="A very long label that has to wrap rather than overflow its field"',
      '<span slot="hint">A hint that is also long enough to need several lines</span>',
      187,
    );
    expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
    expect(box(element).getBoundingClientRect().width).toBeLessThanOrEqual(187);
  });
});
