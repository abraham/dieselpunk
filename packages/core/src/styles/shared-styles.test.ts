import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PunkElement } from '../internal/punk-element.ts';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  rgb,
  track,
} from '../../test/browser/helpers.ts';
import '../../test/browser/commands.ts';
import { themeNames, themes } from '../tokens/themes.ts';
import { registerElement } from '../utilities/register-element.ts';
import { closeButtonStyles, renderCloseButton } from './close-button.ts';
import { fieldStyles } from './field.ts';

// The markup `fieldStyles` documents, with the states as properties.
class TestFieldBox extends PunkElement {
  static override styles = fieldStyles;
  @property({ type: Boolean }) invalid = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;

  protected override render() {
    const classes = [
      'field',
      this.invalid && 'invalid',
      this.disabled && 'disabled',
      this.readonly && 'readonly',
    ]
      .filter(Boolean)
      .join(' ');
    return html`<div class=${classes}>
      <label class="label" for="c">Speed</label>
      <div class="box">
        <span class="prefix">$</span>
        <input class="control" id="c" placeholder="Type" ?disabled=${this.disabled} />
        <span class="suffix">kg</span>
      </div>
      <div class="hint">Hint</div>
      <div class="message">
        <span class="indicator variant-warning"><span class="shape"></span></span>
        <span>Message</span>
      </div>
    </div>`;
  }
}
registerElement('punk-test-field-box', TestFieldBox);

class TestCloseHost extends PunkElement {
  static override styles = closeButtonStyles;
  clicked = vi.fn();
  protected override render() {
    return renderCloseButton({ part: 'close-button', label: 'Close', onClick: this.clicked });
  }
}
registerElement('punk-test-close-host', TestCloseHost);

beforeEach(addStylesheets);

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
});

async function box(attributes: Record<string, string> = {}, parent?: Element) {
  const element = document.createElement('punk-test-field-box') as TestFieldBox;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  track(element, parent);
  await element.updateComplete;
  const inner = (selector: string) => element.shadowRoot?.querySelector(selector) as HTMLElement;
  return { element, inner };
}

function themed(theme: string, density = 'compact'): HTMLElement {
  const outer = track(document.createElement('div'));
  outer.setAttribute('data-punk-theme', theme);
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-punk-density', density);
  outer.append(wrapper);
  return wrapper;
}

describe('fieldStyles', () => {
  it('draws the boundary in control-edge in every theme, so it meets 3:1 as rendered', async () => {
    for (const theme of themeNames) {
      const { inner } = await box({}, themed(theme));
      expect(getComputedStyle(inner('.box')).borderTopColor, theme).toBe(
        rgb(themes[theme].tokens['color-control-edge'] as string),
      );
      expect(getComputedStyle(inner('.box')).borderTopWidth).toBe('2px');
    }
  });

  it('is as tall as a medium control, and taller at low density', async () => {
    const compact = await box({}, themed('industrial', 'compact'));
    const low = await box({}, themed('industrial', 'low'));
    expect(compact.inner('.box').getBoundingClientRect().height).toBeCloseTo(36, 0);
    expect(low.inner('.box').getBoundingClientRect().height).toBeGreaterThan(36);
  });

  it('shows the placeholder in text-muted, and the message and hint in text colors', async () => {
    const { inner } = await box({}, themed('industrial'));
    const tokens = themes['industrial'].tokens;
    expect(getComputedStyle(inner('.control'), '::placeholder').color).toBe(
      rgb(tokens['color-text-muted'] as string),
    );
    expect(getComputedStyle(inner('.message')).color).toBe(rgb(tokens['color-text'] as string));
    expect(getComputedStyle(inner('.hint')).color).toBe(rgb(tokens['color-text-muted'] as string));
  });

  it('brightens the boundary on hover, and not while disabled', async () => {
    const tokens = themes['industrial'].tokens;
    const idle = await box({}, themed('industrial'));
    await userEvent.hover(idle.inner('.box'));
    expect(getComputedStyle(idle.inner('.box')).borderTopColor).toBe(
      rgb(tokens['color-text'] as string),
    );
    const off = await box({ disabled: '' }, themed('industrial'));
    await userEvent.hover(off.inner('.box'));
    expect(getComputedStyle(off.inner('.box')).borderTopColor).toBe(
      rgb(tokens['color-disabled-text'] as string),
    );
  });

  it('frames an invalid field in danger, and a read-only one with a dashed boundary', async () => {
    const tokens = themes['industrial'].tokens;
    const invalid = await box({ invalid: '' }, themed('industrial'));
    expect(getComputedStyle(invalid.inner('.box')).boxShadow).toContain(
      rgb(tokens['color-danger'] as string),
    );
    const readonly = await box({ readonly: '' }, themed('industrial'));
    expect(getComputedStyle(readonly.inner('.box')).borderTopStyle).toBe('dashed');
  });

  it('shows a two-tone ring on the box when the control has keyboard focus', async () => {
    const tokens = themes['industrial'].tokens;
    const { inner } = await box({}, themed('industrial'));
    expect(getComputedStyle(inner('.box'), '::after').boxShadow).toBe('none');
    await focusWithKeyboard(inner('.control'));
    inner('.control').focus();
    const ring = getComputedStyle(inner('.box'), '::after').boxShadow;
    expect(ring).toContain(rgb(tokens['color-focus'] as string));
    expect(ring).toContain(rgb(tokens['color-focus-inner'] as string));
  });

  it('keeps invalid, read-only, and disabled apart by border style under forced colors', async () => {
    await commands.setForcedColors('active');
    const styles = [];
    const states: Array<Record<string, string>> = [
      {},
      { invalid: '' },
      { readonly: '' },
      { disabled: '' },
    ];
    for (const attributes of states) {
      const { inner } = await box(attributes, themed('industrial'));
      const { borderTopStyle, borderTopColor } = getComputedStyle(inner('.box'));
      styles.push(`${borderTopStyle} ${borderTopColor}`);
    }
    expect(new Set(styles).size).toBe(4);
  });

  it('uses a Highlight outline for focus under forced colors', async () => {
    await commands.setForcedColors('active');
    const { inner } = await box({}, themed('industrial'));
    await focusWithKeyboard(inner('.control'));
    inner('.control').focus();
    expect(getComputedStyle(inner('.box')).outlineStyle).toBe('solid');
  });

  it('draws the message shape with the status shapes', async () => {
    const { inner } = await box({}, themed('industrial'));
    expect(getComputedStyle(inner('.shape')).clipPath).toContain('polygon');
  });
});

describe('closeButtonStyles', () => {
  async function mountClose() {
    const host = track(themed('industrial'));
    const element = document.createElement('punk-test-close-host') as TestCloseHost;
    host.append(element);
    await element.updateComplete;
    const button = element.shadowRoot?.querySelector('button') as HTMLButtonElement;
    return { element, button };
  }

  it('is a named native button the size of a small control', async () => {
    const { button } = await mountClose();
    expect(button.getAttribute('aria-label')).toBe('Close');
    expect(button.type).toBe('button');
    expect(button.getBoundingClientRect().width).toBeCloseTo(28, 0);
    expect(button.getBoundingClientRect().height).toBeCloseTo(28, 0);
  });

  it('calls its handler on a click and on Enter and Space', async () => {
    const { element, button } = await mountClose();
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter} ');
    expect(element.clicked).toHaveBeenCalledTimes(3);
  });

  it('draws a glyph, hides it from assistive technology, and shows keyboard focus', async () => {
    const { button } = await mountClose();
    const glyph = button.querySelector('.glyph') as HTMLElement;
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(glyph).clipPath).toContain('polygon');
    await focusWithKeyboard(button);
    button.focus();
    expect(getComputedStyle(button, '::after').boxShadow).not.toBe('none');
  });

  it('is a plain bordered button under forced colors', async () => {
    await commands.setForcedColors('active');
    const { button } = await mountClose();
    const style = getComputedStyle(button);
    expect(style.borderTopStyle).toBe('solid');
    expect(style.borderTopWidth).toBe('2px');
  });
});
