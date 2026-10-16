import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { overlayStack } from '../../internal/overlays.ts';
import '../button/register.ts';
import './register.ts';
import type { PunkCloseDetail, PunkPopover } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const flush = () => new Promise((resolve) => setTimeout(resolve));
const items = `
  <button role="menuitem" id="one">One</button>
  <button role="menuitem" id="two" disabled>Two</button>
  <button role="menuitem" id="three">Three</button>
  <button role="menuitem" id="four">Four</button>`;
const form = '<input id="a" aria-label="A" /><input id="b" aria-label="B" />';

interface Options {
  attributes?: string;
  content?: string;
  position?: string;
  dir?: string;
}

async function mount(options: Options = {}) {
  const wrapper = track(document.createElement('div'));
  if (options.dir) wrapper.dir = options.dir;
  wrapper.innerHTML = `
    <button id="before">Before</button>
    <button id="trigger" style="position: absolute; ${options.position ?? 'left: 120px; top: 160px'}">Trigger</button>
    <punk-popover ${options.attributes ?? ''}>${options.content ?? '<p>Details</p>'}</punk-popover>
    <button id="after">After</button>`;
  const popover = wrapper.querySelector('punk-popover') as PunkPopover;
  await popover.updateComplete;
  const trigger = wrapper.querySelector('#trigger') as HTMLButtonElement;
  return { wrapper, popover, trigger };
}

const surfaceOf = (popover: PunkPopover) =>
  popover.shadowRoot?.querySelector('[part="surface"]') as HTMLElement;
const active = () => document.activeElement;
const events = (popover: PunkPopover) => {
  const opened = vi.fn();
  const closed = vi.fn<(detail: PunkCloseDetail) => void>();
  popover.addEventListener('punk-open', opened);
  popover.addEventListener('punk-close', (event) => closed(event.detail));
  return { opened, closed };
};
const opened = async (options?: Options) => {
  const fixture = await mount(options);
  fixture.popover.show();
  await fixture.popover.updateComplete;
  await flush();
  return fixture;
};

describe('the trigger', () => {
  it('is the previous sibling, and gets aria-expanded that follows the popover', async () => {
    const { popover, trigger } = await mount();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    popover.show();
    await popover.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    popover.hide();
    await popover.updateComplete;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('is found by `for`, and says menu in menu mode', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<button id="elsewhere">T</button><p>x</p><punk-popover for="elsewhere" mode="menu"><button role="menuitem">A</button></punk-popover>';
    const popover = wrapper.querySelector('punk-popover') as PunkPopover;
    await popover.updateComplete;
    const trigger = wrapper.querySelector('#elsewhere') as HTMLElement;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('puts aria-expanded and aria-haspopup on the inner button of a punk-button', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<punk-button>Menu</punk-button><punk-popover mode="menu"><button role="menuitem">A</button></punk-popover>';
    const popover = wrapper.querySelector('punk-popover') as PunkPopover;
    const trigger = wrapper.querySelector('punk-button') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await popover.updateComplete;
    await trigger.updateComplete;
    const inner = trigger.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect([inner.getAttribute('aria-expanded'), inner.getAttribute('aria-haspopup')]).toEqual([
      'false',
      'menu',
    ]);
    popover.show();
    await popover.updateComplete;
    await trigger.updateComplete;
    expect(inner.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
  });

  it('gets back what it had when the popover is removed', async () => {
    const { popover, trigger } = await mount();
    trigger.setAttribute('aria-expanded', 'mine');
    popover.remove();
    await flush();
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<button id="plain">T</button><punk-popover mode="menu"><button role="menuitem">A</button></punk-popover>';
    const second = wrapper.querySelector('punk-popover') as PunkPopover;
    await second.updateComplete;
    second.remove();
    const plain = wrapper.querySelector('#plain') as HTMLElement;
    expect([plain.hasAttribute('aria-expanded'), plain.hasAttribute('aria-haspopup')]).toEqual([
      false,
      false,
    ]);
  });

  it('warns once when there is no trigger, and once for a menu with no items', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = '<punk-popover for="nothing"><p>x</p></punk-popover>';
    const lonely = wrapper.querySelector('punk-popover') as PunkPopover;
    await lonely.updateComplete;
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('No trigger'))).toHaveLength(
      1,
    );
    warn.mockClear();
    const { popover } = await mount({ attributes: 'mode="menu"', content: '<p>no items</p>' });
    popover.show();
    await popover.updateComplete;
    popover.hide();
    popover.show();
    await popover.updateComplete;
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('menuitem'))).toHaveLength(1);
  });
});

describe('opening and closing', () => {
  it('toggles from a click on the trigger, and does not reopen when the trigger closes it', async () => {
    const { popover, trigger } = await mount();
    const { opened: heard, closed } = events(popover);
    await userEvent.click(trigger);
    expect(popover.open).toBe(true);
    await userEvent.click(trigger);
    expect(popover.open).toBe(false);
    expect(heard).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'method' });
  });

  it('shows the surface in the top layer next to the trigger, and hides it again', async () => {
    const { popover, trigger } = await opened();
    const surface = surfaceOf(popover);
    expect(surface.matches(':popover-open')).toBe(true);
    const box = surface.getBoundingClientRect();
    const anchor = trigger.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(anchor.bottom);
    popover.hide();
    await popover.updateComplete;
    expect(surface.matches(':popover-open')).toBe(false);
    expect(getComputedStyle(surface).display).toBe('none');
  });

  it('closes on Escape with the reason escape', async () => {
    const { popover } = await opened();
    const { closed } = events(popover);
    await userEvent.keyboard('{Escape}');
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'escape' });
    expect(popover.open).toBe(false);
  });

  it('closes on a press outside with the reason outside, and not on a press inside or on the trigger', async () => {
    const { popover, trigger, wrapper } = await opened({ content: '<p id="inside">Details</p>' });
    const { closed } = events(popover);
    await userEvent.click(popover.querySelector('#inside') as HTMLElement);
    expect(popover.open).toBe(true);
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(popover.open).toBe(true);
    await userEvent.click(wrapper.querySelector('#after') as HTMLElement);
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'outside' });
  });

  it('opens and closes from the attribute, and from toggle()', async () => {
    const { popover } = await mount({ attributes: 'open' });
    await flush();
    expect(surfaceOf(popover).matches(':popover-open')).toBe(true);
    popover.removeAttribute('open');
    await popover.updateComplete;
    expect(popover.open).toBe(false);
    popover.toggle();
    await popover.updateComplete;
    expect(popover.open).toBe(true);
  });

  it('closes with the reason action when an item is activated and data-punk-close-on-activate is set', async () => {
    const { popover } = await opened({
      attributes: 'mode="menu" data-punk-close-on-activate',
      content: items,
    });
    const { closed } = events(popover);
    await userEvent.click(popover.querySelector('#three') as HTMLElement);
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'action' });
    const kept = await opened({ attributes: 'mode="menu"', content: items });
    await userEvent.click(kept.popover.querySelector('#one') as HTMLElement);
    expect(kept.popover.open).toBe(true);
  });

  it('lets go of everything without events when it is removed while open', async () => {
    const { popover } = await opened();
    const { closed } = events(popover);
    expect(overlayStack.size).toBe(1);
    popover.remove();
    await flush();
    expect(overlayStack.size).toBe(0);
    expect(closed).not.toHaveBeenCalled();
  });

  it('works with the Popover API turned off, fixed above the page', async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      value: undefined,
      configurable: true,
    });
    try {
      const { popover, trigger } = await opened();
      const surface = surfaceOf(popover);
      expect(getComputedStyle(surface).display).toBe('block');
      expect(getComputedStyle(surface).zIndex).toBe('1000');
      expect(surface.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        trigger.getBoundingClientRect().bottom,
      );
      await userEvent.keyboard('{Escape}');
      expect(popover.open).toBe(false);
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'showPopover', original);
    }
  });
});

describe('listeners', () => {
  it('has no listener on the page, and no observer, while closed', async () => {
    const documentAdds = vi.spyOn(document, 'addEventListener');
    const windowAdds = vi.spyOn(window, 'addEventListener');
    const Original = window.ResizeObserver;
    let observers = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class extends Original {
        constructor(callback: ResizeObserverCallback) {
          super(callback);
          observers++;
        }
      },
    );
    await mount();
    expect(documentAdds).not.toHaveBeenCalled();
    expect(
      windowAdds.mock.calls.filter((call) => ['scroll', 'resize'].includes(String(call[0]))),
    ).toHaveLength(0);
    expect(observers).toBe(0);
  });

  it('adds them while open and takes them all away when it closes', async () => {
    const Original = window.ResizeObserver;
    let created = 0;
    let disconnected = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class extends Original {
        constructor(callback: ResizeObserverCallback) {
          super(callback);
          created++;
        }
        override disconnect() {
          disconnected++;
          super.disconnect();
        }
      },
    );
    const live = (
      spy: MockInstance<typeof window.addEventListener>,
      other: MockInstance<typeof window.removeEventListener>,
    ) =>
      spy.mock.calls.filter((call) => ['scroll', 'resize', 'pointerdown'].includes(String(call[0])))
        .length -
      other.mock.calls.filter((call) =>
        ['scroll', 'resize', 'pointerdown'].includes(String(call[0])),
      ).length;
    const { popover } = await mount();
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const documentAdd = vi.spyOn(document, 'addEventListener');
    const documentRemove = vi.spyOn(document, 'removeEventListener');
    popover.show();
    await popover.updateComplete;
    expect(live(add, remove)).toBe(2);
    expect(live(documentAdd as never, documentRemove as never)).toBe(1);
    expect(created).toBe(1);
    popover.hide();
    await popover.updateComplete;
    expect(live(add, remove)).toBe(0);
    expect(live(documentAdd as never, documentRemove as never)).toBe(0);
    expect(disconnected).toBe(1);
    expect(overlayStack.size).toBe(0);
  });
});

describe('placement', () => {
  it('puts the surface on the chosen side, and flips when there is no room', async () => {
    const below = await opened({ attributes: 'placement="bottom"' });
    expect(surfaceOf(below.popover).dataset['side']).toBe('bottom');
    const flipped = await opened({
      attributes: 'placement="top"',
      position: 'left: 120px; top: 4px',
    });
    expect(surfaceOf(flipped.popover).dataset['side']).toBe('bottom');
  });

  it('keeps the surface inside the viewport', async () => {
    const { popover } = await opened({
      position: 'left: 0px; top: 160px',
      content: '<p>Some text that is wide enough to matter at the edge</p>',
    });
    const box = surfaceOf(popover).getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  it('goes below the trigger when neither side has room for it', async () => {
    const { popover } = await opened({
      attributes: 'placement="end" style="--punk-popover-max-width: 90vw"',
      position: 'left: 150px; top: 160px',
      content: '<p>' + 'word '.repeat(60) + '</p>',
    });
    const surface = surfaceOf(popover);
    expect(surface.dataset['side']).toBe('bottom');
    const box = surface.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  it('puts start at the inline start of the trigger, which is the right in rtl', async () => {
    const ltr = await opened({
      attributes: 'placement="start"',
      position: 'left: 200px; top: 160px',
    });
    expect(surfaceOf(ltr.popover).dataset['side']).toBe('left');
    const rtl = await opened({
      attributes: 'placement="start"',
      position: 'left: 100px; top: 160px',
      dir: 'rtl',
    });
    expect(surfaceOf(rtl.popover).dataset['side']).toBe('right');
  });

  it('ignores an unknown placement', async () => {
    const { popover } = await opened({ attributes: 'placement="middle"' });
    expect(surfaceOf(popover).dataset['side']).toBe('bottom');
  });

  it('is at most --punk-popover-max-width wide', async () => {
    const { popover } = await mount({ content: '<p>' + 'word '.repeat(60) + '</p>' });
    popover.style.setProperty('--punk-popover-max-width', '200px');
    popover.show();
    await popover.updateComplete;
    await flush();
    expect(surfaceOf(popover).getBoundingClientRect().width).toBeLessThanOrEqual(200);
  });
});

describe('content mode focus', () => {
  it('leaves focus on the trigger after a pointer open, and after show() from code', async () => {
    const { popover, trigger } = await mount({ content: form });
    await userEvent.click(trigger);
    await flush();
    expect(active()).toBe(trigger);
    popover.hide();
    trigger.focus();
    popover.show();
    await popover.updateComplete;
    await flush();
    expect(active()).toBe(trigger);
  });

  it.each([
    ['the first tabbable', form, 'a', '{Enter}'],
    [
      'an autofocus element',
      '<input id="a" aria-label="A" /><input id="b" aria-label="B" autofocus />',
      'b',
      ' ',
    ],
  ])('moves focus in after a keyboard open, to %s', async (_label, content, id, key) => {
    const { trigger } = await mount({ content });
    trigger.focus();
    await userEvent.keyboard(key);
    await flush();
    expect(active()?.id).toBe(id);
  });

  it('moves focus to the surface after a keyboard open when there is nothing to Tab to', async () => {
    const { popover, trigger } = await mount({ content: '<p>Text only</p>' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    expect(active()).toBe(popover);
    expect(popover.shadowRoot?.activeElement).toBe(surfaceOf(popover));
  });

  it('gives focus back to the trigger when it closes with Escape from inside', async () => {
    const { popover, trigger } = await mount({ content: form });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    await userEvent.keyboard('{Escape}');
    expect(popover.open).toBe(false);
    expect(active()).toBe(trigger);
  });

  it('leaves focus alone when it closes and focus was not inside', async () => {
    const { popover, wrapper } = await mount({ content: form });
    popover.show();
    await popover.updateComplete;
    const other = wrapper.querySelector('#after') as HTMLElement;
    other.focus();
    popover.hide();
    await popover.updateComplete;
    expect(active()).toBe(other);
  });

  it('closes on Tab from the last tabbable and carries on from the trigger', async () => {
    const { popover, trigger, wrapper } = await mount({ content: form });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    await userEvent.tab();
    expect(active()?.id).toBe('b');
    expect(popover.open).toBe(true);
    const { closed } = events(popover);
    await userEvent.tab();
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'tab' });
    expect(active()).toBe(wrapper.querySelector('#after'));
  });

  it('closes on Shift+Tab from the first tabbable and carries on from the trigger', async () => {
    const { popover, trigger, wrapper } = await mount({ content: form });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    await userEvent.tab({ shift: true });
    expect(popover.open).toBe(false);
    expect(active()).toBe(wrapper.querySelector('#before'));
  });

  it('closes on Tab when there is nothing to Tab to', async () => {
    const { popover, trigger, wrapper } = await mount({ content: '<p>Text only</p>' });
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await flush();
    await userEvent.tab();
    expect(popover.open).toBe(false);
    expect(active()).toBe(wrapper.querySelector('#after'));
  });
});

describe('menu mode', () => {
  const menu = (extra = '') => ({ attributes: `mode="menu" ${extra}`, content: items });

  it('is a menu only while it is showing, and keeps a role the author set', async () => {
    const { popover } = await mount(menu());
    expect(popover.hasAttribute('role')).toBe(false);
    popover.show();
    await popover.updateComplete;
    expect(popover.getAttribute('role')).toBe('menu');
    popover.hide();
    await popover.updateComplete;
    expect(popover.hasAttribute('role')).toBe(false);
    const custom = await mount(menu('role="group"'));
    custom.popover.show();
    await custom.popover.updateComplete;
    expect(custom.popover.getAttribute('role')).toBe('group');
  });

  it('moves focus to the first enabled item however it opens', async () => {
    const pointer = await mount(menu());
    await userEvent.click(pointer.trigger);
    await flush();
    expect(active()?.id).toBe('one');
    const code = await mount({
      attributes: 'mode="menu"',
      content: items.replace('id="one"', 'id="one" disabled'),
    });
    code.popover.show();
    await code.popover.updateComplete;
    await flush();
    expect(active()?.id).toBe('three');
  });

  it('opens with ArrowDown on the trigger, and focuses the first item', async () => {
    const { popover, trigger } = await mount(menu());
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await flush();
    expect(popover.open).toBe(true);
    expect(active()?.id).toBe('one');
  });

  it('moves with Up, Down, Home, and End, skips disabled items, and does not wrap', async () => {
    const { popover } = await opened(menu());
    await userEvent.keyboard('{ArrowDown}');
    expect(active()?.id).toBe('three');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(active()?.id).toBe('four');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(active()?.id).toBe('one');
    await userEvent.keyboard('{End}');
    expect(active()?.id).toBe('four');
    await userEvent.keyboard('{Home}');
    expect(active()?.id).toBe('one');
    expect(popover.open).toBe(true);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { popover, trigger } = await opened(menu());
    await userEvent.keyboard('{Escape}');
    expect(popover.open).toBe(false);
    expect(active()).toBe(trigger);
  });

  it('closes on Tab, and the next stop comes from the trigger', async () => {
    const { popover, wrapper } = await opened(menu());
    const { closed } = events(popover);
    await userEvent.tab();
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'tab' });
    expect(active()).toBe(wrapper.querySelector('#after'));
  });

  it('does not close when an item is activated, unless it is asked to', async () => {
    const { popover } = await opened(menu());
    await userEvent.keyboard('{Enter}');
    expect(popover.open).toBe(true);
  });

  it('ignores keys with Ctrl, Alt, or Meta', async () => {
    await opened(menu());
    await userEvent.keyboard('{Control>}{ArrowDown}{/Control}');
    expect(active()?.id).toBe('one');
  });
});

describe('appearance', () => {
  it('is a bordered box under forced colors', async () => {
    await commands.setForcedColors('active');
    const { popover } = await opened();
    const style = getComputedStyle(surfaceOf(popover));
    expect([style.borderTopStyle, style.borderTopWidth]).toEqual(['solid', '2px']);
  });

  it('shows keyboard focus on the surface', async () => {
    const { popover, wrapper } = await mount({ content: '<p>Text only</p>' });
    await focusWithKeyboard(wrapper.querySelector('#before') as HTMLElement);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await flush();
    expect(getComputedStyle(surfaceOf(popover)).outlineStyle).toBe('solid');
  });
});
