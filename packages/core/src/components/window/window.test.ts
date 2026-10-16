import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { overlayStack } from '../../internal/overlays.ts';
import './register.ts';
import type { PunkCloseDetail, PunkMoveDetail, PunkWindow } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  document.documentElement.style.removeProperty('overflow');
  vi.restoreAllMocks();
});

const flush = () => new Promise((resolve) => setTimeout(resolve));
const content = '<p>Crafting speed 0.75</p><button id="go">Go</button>';

async function mount(attributes = 'heading="Assembler"', inner = content, parent?: Element) {
  const element = document.createElement('punk-window');
  for (const match of attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
    element.setAttribute(match[1] as string, match[2] ?? '');
  }
  element.innerHTML = inner;
  track(element, parent);
  await element.updateComplete;
  return element;
}

async function open(attributes?: string, inner?: string, parent?: Element) {
  const element = await mount(attributes, inner, parent);
  element.open = true;
  await element.updateComplete;
  await flush();
  return element;
}

const part = (element: PunkWindow, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const dialogOf = (element: PunkWindow) => part(element, 'window') as HTMLDialogElement;
const deepActive = (): Element | null => {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
};
const events = (element: PunkWindow) => {
  const opened = vi.fn();
  const closed = vi.fn<(detail: PunkCloseDetail) => void>();
  const started = vi.fn<(detail: PunkMoveDetail) => void>();
  const ended = vi.fn<(detail: PunkMoveDetail) => void>();
  element.addEventListener('punk-open', opened);
  element.addEventListener('punk-close', (event) => closed(event.detail));
  element.addEventListener('punk-move-start', (event) => started(event.detail));
  element.addEventListener('punk-move-end', (event) => ended(event.detail));
  return { opened, closed, started, ended };
};
const offsetOf = (element: PunkWindow) => {
  const [x, y] = (dialogOf(element).style.translate || '0px 0px').split(' ').map(parseFloat);
  return { x: x ?? 0, y: y ?? 0 };
};
const center = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

describe('structure', () => {
  it('shows nothing while closed, and is a dialog named by its heading once open', async () => {
    const element = await mount();
    expect(getComputedStyle(dialogOf(element)).display).toBe('none');
    element.open = true;
    await element.updateComplete;
    const dialog = dialogOf(element);
    expect(dialog.open).toBe(true);
    const title = element.shadowRoot?.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent?.trim()).toBe('Assembler');
  });

  it('is not modal by default, and stays in the flow of its container', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.style.cssText = 'inline-size: 300px; padding: 8px';
    const element = await open('heading="Assembler"', content, wrapper);
    const dialog = dialogOf(element);
    expect(dialog.matches(':modal')).toBe(false);
    expect(getComputedStyle(dialog).position).toBe('relative');
    const rect = dialog.getBoundingClientRect();
    expect(rect.width).toBeLessThanOrEqual(300);
    expect(rect.left).toBeGreaterThanOrEqual(wrapper.getBoundingClientRect().left);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('is modal with `modal`, in the top layer and above the page', async () => {
    const element = await open('heading="Assembler" modal');
    expect(dialogOf(element).matches(':modal')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('has a close button only with `dismissible`, and a move button only with `movable`', async () => {
    const plain = await open();
    expect([part(plain, 'close-button'), part(plain, 'move-button')]).toEqual([null, null]);
    const full = await open('heading="x" dismissible movable');
    expect(part(full, 'close-button').getAttribute('aria-label')).toBe('Close');
    expect(part(full, 'move-button').getAttribute('aria-label')).toBe('Move window');
    expect(part(full, 'move-button').getAttribute('aria-pressed')).toBe('false');
  });

  it('is named by aria-label without a heading, and warns once when it has neither', async () => {
    const labeled = await open('aria-label="Assembler"');
    expect(dialogOf(labeled).getAttribute('aria-label')).toBe('Assembler');
    expect(warn).not.toHaveBeenCalled();
    const bare = await open('');
    bare.close();
    bare.show();
    await bare.updateComplete;
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('no name'))).toHaveLength(1);
  });

  it('shows an icon before the heading, and a footer only when it has content', async () => {
    const element = await open(
      'heading="x"',
      `${content}<svg slot="icon" width="16" height="16"></svg><button slot="footer">OK</button>`,
    );
    expect(element.shadowRoot?.querySelector<HTMLElement>('.icon')?.hidden).toBe(false);
    expect(part(element, 'footer').hidden).toBe(false);
    const bare = await open();
    expect(bare.shadowRoot?.querySelector<HTMLElement>('.icon')?.hidden).toBe(true);
    expect(part(bare, 'footer').hidden).toBe(true);
  });

  it('reflects its properties and opens from the attribute', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML =
      '<punk-window heading="x" open modal movable dismissible><button>Go</button></punk-window>';
    const element = wrapper.querySelector('punk-window') as PunkWindow;
    await element.updateComplete;
    expect([element.open, element.modal, element.movable, element.dismissible]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(dialogOf(element).open).toBe(true);
    element.modal = false;
    element.dismissible = false;
    await element.updateComplete;
    expect(element.hasAttribute('modal')).toBe(false);
    expect(part(element, 'close-button')).toBeNull();
  });
});

describe('opening and closing', () => {
  it('sends punk-open and punk-close once each, with the reason', async () => {
    const element = await mount('heading="x" dismissible');
    const { opened, closed } = events(element);
    element.show();
    await element.updateComplete;
    await userEvent.click(part(element, 'close-button'));
    expect(opened).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledExactlyOnceWith({
      reason: 'close-button',
      returnValue: undefined,
    });
    expect(element.open).toBe(false);
  });

  it('closes on Escape when dismissible, with the reason escape', async () => {
    const element = await open('heading="x" modal dismissible');
    const { closed } = events(element);
    await userEvent.keyboard('{Escape}');
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'escape', returnValue: undefined });
  });

  it('does not close on Escape when it is not dismissible, modal or not', async () => {
    for (const attributes of ['heading="x" modal', 'heading="x"']) {
      const element = await open(attributes);
      const { closed } = events(element);
      await userEvent.keyboard('{Escape}');
      expect(closed).not.toHaveBeenCalled();
      expect(element.open).toBe(true);
    }
  });

  it('closes from code with the reason method, once', async () => {
    const element = await open('heading="x" dismissible');
    const { closed } = events(element);
    element.open = false;
    await element.updateComplete;
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'method', returnValue: undefined });
  });

  it('starts focus on content, never on the close or move button', async () => {
    await open('heading="x" modal dismissible movable');
    expect(deepActive()?.id).toBe('go');
  });

  it('gives focus back to what opened a modal window', async () => {
    const opener = track(document.createElement('button'));
    opener.textContent = 'Open';
    opener.focus();
    const element = await open('heading="x" modal dismissible');
    await userEvent.keyboard('{Escape}');
    expect(document.activeElement).toBe(opener);
    expect(element.open).toBe(false);
  });

  it('lets go of the lock and the stack when it is removed while open', async () => {
    const element = await open('heading="x" modal');
    expect(overlayStack.size).toBe(1);
    element.remove();
    expect(overlayStack.size).toBe(0);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('can have several windows open at once, each with its own Escape entry', async () => {
    const first = await open('heading="a" dismissible');
    const second = await open('heading="b" dismissible');
    expect(overlayStack.size).toBe(2);
    await userEvent.keyboard('{Escape}');
    expect([first.open, second.open]).toEqual([true, false]);
    await userEvent.keyboard('{Escape}');
    expect(first.open).toBe(false);
  });
});

describe('layout', () => {
  it('is at most --punk-window-max-width wide, and wraps content wider than itself', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.style.inlineSize = '1000px';
    const element = await open(
      'heading="x"',
      '<p>Verarbeitungsanlagenbetriebsvorschrift Verarbeitungsanlagenbetriebsvorschrift</p>',
      wrapper,
    );
    element.style.setProperty('--punk-window-max-width', '300px');
    await flush();
    const dialog = dialogOf(element);
    expect(dialog.getBoundingClientRect().width).toBe(300);
    const bodyElement = part(element, 'body');
    expect(bodyElement.scrollWidth).toBeLessThanOrEqual(bodyElement.clientWidth);
  });

  it('stacks the footer actions at 480px and below and lays them in a row above', async () => {
    const footer = '<button slot="footer">One</button><button slot="footer">Two</button>';
    const narrow = track(document.createElement('div'));
    narrow.style.inlineSize = '400px';
    const wide = track(document.createElement('div'));
    wide.style.inlineSize = '800px';
    const small = await open('heading="x"', content + footer, narrow);
    const large = await open('heading="x"', content + footer, wide);
    const direction = (element: PunkWindow) =>
      getComputedStyle(part(element, 'footer')).flexDirection;
    expect([direction(small), direction(large)]).toEqual(['column', 'row']);
    const [one, two] = [...small.querySelectorAll('button[slot="footer"]')].map((entry) =>
      entry.getBoundingClientRect(),
    );
    expect(one?.width).toBe(two?.width);
    expect(two?.top).toBeGreaterThan(one?.top ?? 0);
  });

  it('puts the titlebar buttons below the title where they cannot share its row', async () => {
    const attributes = 'heading="Assembler" movable dismissible';
    const narrow = track(document.createElement('div'));
    narrow.style.inlineSize = '150px';
    const wide = track(document.createElement('div'));
    wide.style.inlineSize = '400px';
    const small = await open(attributes, content, narrow);
    const large = await open(attributes, content, wide);
    const rows = (element: PunkWindow) => ({
      title: part(element, 'title').getBoundingClientRect(),
      button: part(element, 'close-button').getBoundingClientRect(),
    });
    const { title: smallTitle, button: smallButton } = rows(small);
    expect(smallButton.top).toBeGreaterThanOrEqual(smallTitle.bottom);
    expect(smallTitle.height).toBeLessThan(smallButton.height * 1.5);
    expect(smallButton.right).toBeGreaterThan(smallTitle.right - 1);
    const { title: largeTitle, button: largeButton } = rows(large);
    expect(largeButton.top).toBeLessThan(largeTitle.bottom);
  });

  it('keeps a modal window inside the viewport, and makes a tall body a focusable scroll region', async () => {
    const element = await open(
      'heading="x" modal',
      '<div style="block-size: 4000px">Tall</div><button>Go</button>',
    );
    await flush();
    await element.updateComplete;
    const rect = dialogOf(element).getBoundingClientRect();
    expect(rect.height).toBeLessThanOrEqual(document.documentElement.clientHeight);
    expect(part(element, 'body').getAttribute('tabindex')).toBe('0');
    expect(part(element, 'body').getAttribute('role')).toBe('region');
  });
});

describe('dragging', () => {
  async function scene(attributes = 'heading="Assembler" movable dismissible') {
    const wrapper = track(document.createElement('div'));
    wrapper.style.cssText = 'inline-size: 260px; block-size: 120px';
    const element = await open(attributes, content, wrapper);
    const target = track(document.createElement('div'));
    target.style.cssText =
      'position: fixed; inline-size: 10px; block-size: 10px; inset-block-start: 400px; inset-inline-start: 150px';
    return { element, target };
  }

  it('moves the window with a drag of the titlebar, and reports the offset', async () => {
    const { element, target } = await scene();
    const { started, ended } = events(element);
    const before = dialogOf(element).getBoundingClientRect();
    await userEvent.dragAndDrop(part(element, 'title'), target);
    const after = dialogOf(element).getBoundingClientRect();
    expect(after.top).toBeGreaterThan(before.top + 100);
    expect(started).toHaveBeenCalledOnce();
    expect(ended).toHaveBeenCalledOnce();
    expect(ended.mock.calls[0]?.[0]).toEqual(offsetOf(element));
    expect(offsetOf(element).y).toBeGreaterThan(100);
  });

  it('never leaves the viewport', async () => {
    const { element, target } = await scene();
    target.style.insetInlineStart = '5000px';
    target.style.insetBlockStart = '5000px';
    await userEvent.dragAndDrop(part(element, 'title'), part(element, 'title'));
    element.resetPosition();
    const dialog = dialogOf(element);
    for (const [x, y] of [
      [-9999, -9999],
      [9999, 9999],
    ] as const) {
      part(element, 'move-button').focus();
      await userEvent.click(part(element, 'move-button'));
      for (let step = 0; step < 6; step++) {
        await userEvent.keyboard(
          `{Shift>}{${x < 0 ? 'ArrowLeft' : 'ArrowRight'}>20/}{${y < 0 ? 'ArrowUp' : 'ArrowDown'}>20/}{/Shift}`,
        );
      }
      const rect = dialog.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(-0.5);
      expect(rect.top).toBeGreaterThanOrEqual(-0.5);
      expect(rect.right).toBeLessThanOrEqual(document.documentElement.clientWidth + 0.5);
      expect(rect.bottom).toBeLessThanOrEqual(document.documentElement.clientHeight + 0.5);
      await userEvent.keyboard('{Enter}');
    }
  });

  it('does not start a drag on the close or move button', async () => {
    const { element, target } = await scene();
    const { started } = events(element);
    await userEvent.dragAndDrop(part(element, 'close-button'), target);
    await userEvent.dragAndDrop(part(element, 'move-button'), target);
    expect(started).not.toHaveBeenCalled();
    expect(offsetOf(element)).toEqual({ x: 0, y: 0 });
  });

  it('does not drag without `movable`', async () => {
    const { element, target } = await scene('heading="Assembler" dismissible');
    await userEvent.dragAndDrop(part(element, 'title'), target);
    expect(offsetOf(element)).toEqual({ x: 0, y: 0 });
  });

  it('puts the window back with resetPosition()', async () => {
    const { element, target } = await scene();
    await userEvent.dragAndDrop(part(element, 'title'), target);
    element.resetPosition();
    expect(offsetOf(element)).toEqual({ x: 0, y: 0 });
  });

  it('has a resize listener only while the window is away from its place', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const live = () =>
      add.mock.calls.filter((call) => call[0] === 'resize').length -
      remove.mock.calls.filter((call) => call[0] === 'resize').length;
    const { element, target } = await scene();
    const whileOpen = live();
    await userEvent.dragAndDrop(part(element, 'title'), target);
    expect(live()).toBe(whileOpen + 1);
    element.resetPosition();
    expect(live()).toBe(whileOpen);
    await userEvent.dragAndDrop(part(element, 'title'), target);
    element.close();
    element.remove();
    expect(live()).toBe(0);
  });
});

describe('move mode', () => {
  async function scene() {
    const wrapper = track(document.createElement('div'));
    wrapper.style.cssText = 'inline-size: 260px; block-size: 120px';
    const element = await open('heading="Assembler" movable dismissible', content, wrapper);
    const button = part(element, 'move-button');
    return { element, button };
  }

  it('starts with the move button, which shows its state and announces what to do', async () => {
    const { element, button } = await scene();
    const { started } = events(element);
    await userEvent.click(button);
    await element.updateComplete;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(element.shadowRoot?.querySelector('[role="status"]')?.textContent).toContain(
      'arrow keys',
    );
    expect(started).toHaveBeenCalledOnce();
  });

  it('moves by 8px with an arrow key and 32px with Shift', async () => {
    const { element, button } = await scene();
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}');
    expect(offsetOf(element)).toEqual({ x: 8, y: 0 });
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(offsetOf(element)).toEqual({ x: 8, y: 16 });
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(offsetOf(element)).toEqual({ x: 40, y: 16 });
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(offsetOf(element)).toEqual({ x: 40, y: 0 });
  });

  it('places the window with Enter, and reports it', async () => {
    const { element, button } = await scene();
    const { ended } = events(element);
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    await element.updateComplete;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(ended).toHaveBeenCalledExactlyOnceWith({ x: 16, y: 0 });
    await userEvent.keyboard('{ArrowRight}');
    expect(offsetOf(element)).toEqual({ x: 16, y: 0 });
  });

  it('puts the window back with Escape, without closing it', async () => {
    const { element, button } = await scene();
    const { ended, closed } = events(element);
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Escape}');
    expect(offsetOf(element)).toEqual({ x: 0, y: 0 });
    expect(ended).toHaveBeenCalledExactlyOnceWith({ x: 0, y: 0 });
    expect(closed).not.toHaveBeenCalled();
    expect(element.open).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(element.open).toBe(false);
  });

  it('places the titlebar center where a click lands, and leaves move mode', async () => {
    const { element, button } = await scene();
    const target = track(document.createElement('button'));
    const clicked = vi.fn();
    target.addEventListener('click', clicked);
    target.style.cssText = 'position: fixed; inset-block-start: 300px; inset-inline-start: 100px';
    target.textContent = 'Elsewhere';
    await userEvent.click(button);
    await userEvent.click(target);
    await element.updateComplete;
    const bar = center(part(element, 'titlebar'));
    const point = center(target);
    expect(Math.abs(bar.x - point.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(bar.y - point.y)).toBeLessThanOrEqual(2);
    expect(clicked).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('stops listening for a placing click once move mode has ended', async () => {
    const { element, button } = await scene();
    const target = track(document.createElement('button'));
    const clicked = vi.fn();
    target.addEventListener('click', clicked);
    target.style.cssText = 'position: fixed; inset-block-start: 300px; inset-inline-start: 100px';
    target.textContent = 'Elsewhere';
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await userEvent.click(target);
    expect(clicked).toHaveBeenCalledOnce();
    expect(offsetOf(element)).toEqual({ x: 8, y: 0 });
  });

  it('ends move mode when the move button is pressed again', async () => {
    const { element, button } = await scene();
    const { ended } = events(element);
    await userEvent.click(button);
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.click(button);
    expect(ended).toHaveBeenCalledExactlyOnceWith({ x: 8, y: 0 });
    expect(offsetOf(element).x).toBe(8);
  });

  it('leaves the Escape stack and the click listener when it ends, and when the window closes', async () => {
    const { element, button } = await scene();
    const before = overlayStack.size;
    await userEvent.click(button);
    expect(overlayStack.size).toBe(before + 1);
    await userEvent.keyboard('{Enter}');
    expect(overlayStack.size).toBe(before);
    await userEvent.click(button);
    element.close();
    await element.updateComplete;
    expect(overlayStack.size).toBe(0);
  });
});

describe('appearance', () => {
  it('is a bordered box under forced colors, and the pressed move button is told apart', async () => {
    await commands.setForcedColors('active');
    const element = await open('heading="x" movable dismissible');
    const style = getComputedStyle(dialogOf(element));
    expect([style.borderTopStyle, style.borderTopWidth]).toEqual(['solid', '2px']);
    const button = part(element, 'move-button');
    const idle = getComputedStyle(button).backgroundColor;
    await userEvent.click(button);
    await element.updateComplete;
    expect(getComputedStyle(button).backgroundColor).not.toBe(idle);
  });

  it('still draws the close and move glyphs under forced colors, and in a color that shows on the pressed button', async () => {
    await commands.setForcedColors('active');
    const element = await open('heading="x" movable dismissible');
    // The glyph is a background, so it only shows when it is not the button's own face color.
    const shows = (name: string) => {
      const button = part(element, name);
      const glyph = button.querySelector('.glyph') as Element;
      return getComputedStyle(glyph).backgroundColor !== getComputedStyle(button).backgroundColor;
    };
    expect([shows('close-button'), shows('move-button')]).toEqual([true, true]);
    await userEvent.click(part(element, 'move-button'));
    await element.updateComplete;
    expect(shows('move-button')).toBe(true);
  });

  it('raises a focused non-modal window above its siblings', async () => {
    const element = await open('heading="x" movable');
    element.shadowRoot?.querySelector<HTMLElement>('.body')?.focus();
    (element.querySelector('#go') as HTMLElement).focus();
    expect(getComputedStyle(element).zIndex).toBe('1');
  });
});
