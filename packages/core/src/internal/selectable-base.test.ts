import { html } from 'lit';
import { commands, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  rgb,
  track,
} from '../../test/browser/helpers.ts';
import '../../test/browser/commands.ts';
import { themes } from '../tokens/themes.ts';
import { registerElement } from '../utilities/register-element.ts';
import { receptacleStyles } from '../styles/receptacle.ts';
import { PunkSelectableBase } from './selectable-base.ts';
import type { PunkActivateDetail } from './selectable-base.ts';

// The smallest possible subclass: the DOM shape that `receptacleStyles` documents.
class TestSelectable extends PunkSelectableBase {
  static override styles = receptacleStyles;

  protected override render() {
    const empty = this.childNodes.length === 0;
    return html`<div class=${empty ? 'slot empty' : 'slot'} part="slot">
      <div class="content"><slot></slot></div>
      <div class="overlay"><slot name="overlay"></slot></div>
    </div>`;
  }
}
registerElement('punk-test-selectable', TestSelectable);

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
});

async function mount(
  attributes: Record<string, string> = {},
  options: { content?: string; parent?: Element } = {},
): Promise<TestSelectable> {
  const element = document.createElement('punk-test-selectable') as TestSelectable;
  if (options.content !== undefined) element.textContent = options.content;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return track(element);
}

function slotOf(element: TestSelectable): HTMLElement {
  return element.shadowRoot?.querySelector('.slot') as HTMLElement;
}

function key(type: 'keydown' | 'keyup', init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent(type, { bubbles: true, cancelable: true, composed: true, ...init });
}

function listen(target: HTMLElement = document.body) {
  const handler = vi.fn<(event: CustomEvent<PunkActivateDetail>) => void>();
  target.addEventListener('punk-activate', handler);
  return handler;
}

describe('semantics', () => {
  it('is a focusable button', async () => {
    const element = await mount();
    expect(element.getAttribute('role')).toBe('button');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.hasAttribute('aria-pressed')).toBe(false);
    expect(element.hasAttribute('aria-disabled')).toBe(false);
  });

  it('is not focusable while disabled, and is again once enabled', async () => {
    const element = await mount({ disabled: '' });
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(element.hasAttribute('tabindex')).toBe(false);
    element.focus();
    expect(document.activeElement).not.toBe(element);

    element.disabled = false;
    await element.updateComplete;
    expect(element.hasAttribute('aria-disabled')).toBe(false);
    expect(element.getAttribute('tabindex')).toBe('0');
  });

  it('keeps a tabindex the author set', async () => {
    const element = await mount({ tabindex: '-1' });
    expect(element.getAttribute('tabindex')).toBe('-1');
    element.disabled = true;
    await element.updateComplete;
    expect(element.getAttribute('tabindex')).toBe('-1');
  });

  it('exposes aria-pressed only once selected has been set, true or false', async () => {
    const element = await mount();
    expect(element.selected).toBe(false);
    expect(element.hasAttribute('aria-pressed')).toBe(false);

    element.selected = false;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('false');
    expect(element.hasAttribute('selected')).toBe(false);

    element.selected = true;
    await element.updateComplete;
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(element.hasAttribute('selected')).toBe(true);
  });

  it('treats the selected attribute as setting it, and removing it as setting false', async () => {
    const element = await mount({ selected: '' });
    expect(element.selected).toBe(true);
    expect(element.getAttribute('aria-pressed')).toBe('true');

    element.removeAttribute('selected');
    await element.updateComplete;
    expect(element.selected).toBe(false);
    expect(element.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects value', async () => {
    const element = await mount();
    element.value = 'gear';
    await element.updateComplete;
    expect(element.getAttribute('value')).toBe('gear');
  });

  it('leaves role, tabindex, and aria-selected to a grid that manages it', async () => {
    const element = await mount();
    element.selected = true;
    await element.updateComplete;

    element.setAttribute('role', 'option');
    element.setAttribute('tabindex', '-1');
    element.setAttribute('aria-selected', 'true');
    element.managed = true;
    element.disabled = true;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('option');
    expect(element.getAttribute('tabindex')).toBe('-1');
    expect(element.getAttribute('aria-selected')).toBe('true');
    expect(element.hasAttribute('aria-pressed')).toBe(false);
    expect(element.getAttribute('aria-disabled')).toBe('true');
  });

  it('takes its own semantics back when a grid lets go', async () => {
    const element = await mount();
    element.selected = true;
    element.managed = true;
    element.setAttribute('role', 'option');
    element.setAttribute('tabindex', '-1');
    element.setAttribute('aria-selected', 'true');
    await element.updateComplete;

    element.managed = false;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('button');
    expect(element.getAttribute('tabindex')).toBe('0');
    expect(element.hasAttribute('aria-selected')).toBe(false);
    expect(element.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('activation', () => {
  it('emits one punk-activate per click, with the value and the item', async () => {
    const element = await mount({ value: 'gear' }, { content: 'x' });
    const handler = listen();
    await userEvent.click(element);
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<PunkActivateDetail>;
    expect(event.detail).toEqual({ value: 'gear', item: element });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
  });

  it('activates on Enter once, ignoring auto-repeat', async () => {
    const element = await mount({}, { content: 'x' });
    const handler = listen();
    element.focus();
    await userEvent.keyboard('{Enter}');
    expect(handler).toHaveBeenCalledTimes(1);
    element.dispatchEvent(key('keydown', { key: 'Enter', repeat: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('activates on Space when it is released, and Space does not scroll', async () => {
    const element = await mount({}, { content: 'x' });
    const handler = listen();
    const down = key('keydown', { key: ' ' });
    element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    element.dispatchEvent(key('keyup', { key: ' ' }));
    expect(handler).toHaveBeenCalledTimes(1);

    element.focus();
    await userEvent.keyboard(' ');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does not activate when Space is released after focus moved away', async () => {
    const element = await mount({}, { content: 'x' });
    const handler = listen();
    element.dispatchEvent(key('keydown', { key: ' ' }));
    element.dispatchEvent(new FocusEvent('blur'));
    element.dispatchEvent(key('keyup', { key: ' ' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing while disabled, and hides the click from later listeners', async () => {
    const element = await mount({ disabled: '' }, { content: 'x' });
    const handler = listen();
    const consumer = vi.fn();
    element.addEventListener('click', consumer);
    element.click();
    element.dispatchEvent(key('keydown', { key: 'Enter' }));
    element.dispatchEvent(key('keydown', { key: ' ' }));
    element.dispatchEvent(key('keyup', { key: ' ' }));
    expect(handler).not.toHaveBeenCalled();
    expect(consumer).not.toHaveBeenCalled();
  });

  it('ignores keys with a modifier', async () => {
    const element = await mount({}, { content: 'x' });
    const handler = listen();
    for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
      element.dispatchEvent(key('keydown', { key: 'Enter', [modifier]: true }));
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores keys pressed in focusable content slotted into it', async () => {
    const element = await mount();
    const inner = document.createElement('button');
    element.append(inner);
    const handler = listen();
    inner.dispatchEvent(key('keydown', { key: 'Enter' }));
    inner.dispatchEvent(key('keydown', { key: ' ' }));
    inner.dispatchEvent(key('keyup', { key: ' ' }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('leaves a key to whoever already handled it, as a grid does', async () => {
    const wrapper = container();
    const element = await mount({}, { content: 'x', parent: wrapper });
    wrapper.addEventListener('keydown', (event) => event.preventDefault(), true);
    const handler = listen();
    element.dispatchEvent(key('keydown', { key: 'Enter' }));
    element.dispatchEvent(key('keydown', { key: ' ' }));
    element.dispatchEvent(key('keyup', { key: ' ' }));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('receptacle styles', () => {
  it('sizes the slot from --punk-slot-size, with small and large steps', async () => {
    const wrapper = container();
    const sizes: Record<string, number> = {};
    for (const size of ['sm', 'md', 'lg']) {
      const element = await mount({ size }, { content: 'x', parent: wrapper });
      sizes[size] = element.getBoundingClientRect().width;
    }
    expect(sizes['sm']).toBeCloseTo(32, 0);
    expect(sizes['md']).toBeCloseTo(40, 0);
    expect(sizes['lg']).toBeCloseTo(48, 0);

    wrapper.style.setProperty('--punk-slot-size', '50px');
    const element = await mount({}, { content: 'x', parent: wrapper });
    expect(element.getBoundingClientRect().width).toBeCloseTo(50, 0);
    expect(element.getBoundingClientRect().height).toBeCloseTo(50, 0);
  });

  it('follows the density token', async () => {
    addStylesheets();
    const wrapper = container({ 'data-punk-density': 'low' });
    const element = await mount({}, { content: 'x', parent: wrapper });
    expect(element.getBoundingClientRect().width).toBeCloseTo(50, 0);
  });

  it('draws an empty slot with the control-edge boundary in every theme, and a filled one without', async () => {
    addStylesheets();
    for (const theme of ['industrial', 'industrial-light', 'high-contrast'] as const) {
      const wrapper = container({ 'data-punk-theme': theme });
      const tokens = themes[theme].tokens;
      const empty = slotOf(await mount({}, { parent: wrapper }));
      const filled = slotOf(await mount({}, { content: 'x', parent: wrapper }));
      expect(getComputedStyle(empty).boxShadow, theme).toContain(
        `${rgb(tokens['color-control-edge'])} 0px 0px 0px 2px`,
      );
      expect(getComputedStyle(filled).boxShadow, theme).toContain(
        `${rgb(tokens['color-edge-dark'])} 0px 0px 0px 2px`,
      );
    }
  });

  it('draws selected, highlighted, and invalid with different cues that combine', async () => {
    const tokens = themes.industrial.tokens;
    const idle = slotOf(await mount({}, { content: 'x' }));
    const selected = slotOf(await mount({ selected: '' }, { content: 'x' }));
    const highlighted = slotOf(await mount({ highlighted: '' }, { content: 'x' }));
    const invalid = slotOf(await mount({ invalid: '' }, { content: 'x' }));

    expect(getComputedStyle(selected).boxShadow).toContain(
      `${rgb(tokens['color-accent'])} 0px 0px 0px 3px`,
    );
    expect(getComputedStyle(selected).backgroundColor).not.toBe(
      getComputedStyle(idle).backgroundColor,
    );
    expect(getComputedStyle(highlighted).outlineStyle).toBe('dotted');
    expect(getComputedStyle(highlighted).outlineColor).toBe(rgb(tokens['color-warning']));
    expect(getComputedStyle(invalid).boxShadow).toContain(rgb(tokens['color-danger']));
    expect(getComputedStyle(invalid, '::before').content).not.toBe('none');
    expect(getComputedStyle(idle, '::before').content).toBe('none');
    expect(getComputedStyle(idle).outlineStyle).toBe('none');

    const all = slotOf(
      await mount({ selected: '', highlighted: '', invalid: '' }, { content: 'x' }),
    );
    expect(getComputedStyle(all).boxShadow).toContain(rgb(tokens['color-accent']));
    expect(getComputedStyle(all).boxShadow).toContain(rgb(tokens['color-danger']));
    expect(getComputedStyle(all).outlineStyle).toBe('dotted');
  });

  it('draws a selected empty slot with the selection ring, not the boundary', async () => {
    const tokens = themes.industrial.tokens;
    const slot = slotOf(await mount({ selected: '' }));
    expect(getComputedStyle(slot).boxShadow).toContain(
      `${rgb(tokens['color-accent'])} 0px 0px 0px 3px`,
    );
  });

  it('draws a disabled slot flat and desaturated', async () => {
    const element = await mount({ disabled: '' }, { content: 'x' });
    const content = element.shadowRoot?.querySelector('.content') as HTMLElement;
    expect(getComputedStyle(element).cursor).toBe('not-allowed');
    expect(getComputedStyle(content).opacity).toBe('0.5');
    expect(getComputedStyle(content).filter).toContain('grayscale');
  });

  it('adds edge contrast on hover, but not while disabled', async () => {
    const element = await mount({}, { content: 'x' });
    const disabled = await mount({ disabled: '' }, { content: 'x' });
    const before = getComputedStyle(slotOf(element)).boxShadow;
    const disabledBefore = getComputedStyle(slotOf(disabled)).boxShadow;
    await userEvent.hover(element);
    expect(getComputedStyle(slotOf(element)).boxShadow).not.toBe(before);
    await userEvent.hover(disabled);
    expect(getComputedStyle(slotOf(disabled)).boxShadow).toBe(disabledBefore);
    await userEvent.unhover(disabled);
  });

  it('moves the content toward the inline end while pressed', async () => {
    for (const [dir, translate] of [
      ['ltr', '1px 1px'],
      ['rtl', '-1px 1px'],
    ] as const) {
      const wrapper = container({ dir });
      const element = await mount({ id: `held-${dir}` }, { content: 'x', parent: wrapper });
      const content = element.shadowRoot?.querySelector('.content') as HTMLElement;
      await commands.holdPointer(`#held-${dir}`);
      try {
        expect(getComputedStyle(content).translate, dir).toBe(translate);
      } finally {
        await commands.releasePointer();
      }
      expect(getComputedStyle(content).translate, dir).not.toBe(translate);
    }
  });

  it('lets overlay content through to the slot', async () => {
    const element = await mount({}, { content: 'x' });
    const overlay = document.createElement('span');
    overlay.slot = 'overlay';
    element.append(overlay);
    await element.updateComplete;
    expect(getComputedStyle(overlay).pointerEvents).toBe('none');
  });

  it('grows a small item to 40px under a coarse pointer', async () => {
    const element = await mount({ size: 'sm' }, { content: 'x' });
    const rules = (element.shadowRoot?.adoptedStyleSheets ?? []).flatMap((sheet) => [
      ...sheet.cssRules,
    ]);
    const coarse = rules.find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('coarse'),
    );
    expect(coarse?.cssText).toContain('min-inline-size: 40px');
    expect(coarse?.cssText).toContain('min-block-size: 40px');
  });
});

describe('focus', () => {
  it('draws the two-tone ring on the slot when the host has keyboard focus', async () => {
    const tokens = themes.industrial.tokens;
    const element = await mount({}, { content: 'x' });
    await focusWithKeyboard(element);
    expect(document.activeElement).toBe(element);
    const ring = getComputedStyle(slotOf(element), '::after').boxShadow;
    expect(ring).toContain(rgb(tokens['color-focus']));
    expect(ring).toContain(rgb(tokens['color-focus-inner']));
    expect(getComputedStyle(element).outlineStyle).toBe('none');
  });

  it('does not draw the ring for a mouse click', async () => {
    const element = await mount({}, { content: 'x' });
    await userEvent.click(element);
    expect(getComputedStyle(slotOf(element), '::after').content).toBe('none');
  });
});

describe('forced colors', () => {
  it('replaces bevels with borders, and keeps the states apart by pattern and thickness', async () => {
    await commands.setForcedColors('active');
    const idle = slotOf(await mount({}, { content: 'x' }));
    const selected = slotOf(await mount({ selected: '' }, { content: 'x' }));
    const highlighted = slotOf(await mount({ highlighted: '' }, { content: 'x' }));
    const invalid = slotOf(await mount({ invalid: '' }, { content: 'x' }));

    for (const slot of [idle, selected, highlighted, invalid]) {
      expect(getComputedStyle(slot).boxShadow).toBe('none');
      expect(getComputedStyle(slot).borderTopWidth).toBe('2px');
    }
    expect(getComputedStyle(idle).borderTopStyle).toBe('solid');
    expect(getComputedStyle(selected).outlineStyle).toBe('solid');
    expect(getComputedStyle(selected).outlineWidth).toBe('3px');
    expect(getComputedStyle(highlighted).borderTopStyle).toBe('dotted');
    expect(getComputedStyle(highlighted).outlineStyle).toBe('none');
    expect(getComputedStyle(invalid).borderTopStyle).toBe('dashed');
  });

  it('shows keyboard focus as a Highlight outline on the host', async () => {
    await commands.setForcedColors('active');
    const element = await mount({}, { content: 'x' });
    await focusWithKeyboard(element);
    expect(getComputedStyle(element).outlineStyle).toBe('solid');
    expect(getComputedStyle(element).outlineWidth).toBe('2px');
  });
});
