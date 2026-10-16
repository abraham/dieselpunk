import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, focusWithKeyboard, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import '../button/register.ts';
import './register.ts';
import { resetTooltipWarmup } from './tooltip.ts';
import type { PunkButton } from '../button/index.ts';
import type { PunkTooltip, TooltipPlacement } from './index.ts';

interface Pair {
  anchor: HTMLButtonElement;
  tooltip: PunkTooltip;
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await userEvent.unhover(document.body);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // A tooltip that just closed lets the next one open without a delay. Forget that so a test
  // never depends on how recently an earlier test closed one.
  resetTooltipWarmup();
});

/** A plain button followed by its tooltip, placed away from the viewport edges. */
async function mount(
  options: {
    text?: string;
    delay?: number;
    placement?: TooltipPlacement;
    parent?: Element;
    position?: Partial<CSSStyleDeclaration>;
  } = {},
): Promise<Pair> {
  const wrapper = options.parent ?? track(document.createElement('div'));
  const anchor = document.createElement('button');
  anchor.textContent = 'Anchor';
  Object.assign(anchor.style, {
    position: 'absolute',
    left: '300px',
    top: '200px',
    ...options.position,
  });
  const tooltip = document.createElement('punk-tooltip');
  tooltip.textContent = options.text ?? 'Hint';
  tooltip.delay = options.delay ?? 50;
  if (options.placement) tooltip.placement = options.placement;
  wrapper.append(anchor, tooltip);
  await tooltip.updateComplete;
  return { anchor, tooltip };
}

function surface(tooltip: PunkTooltip): HTMLElement {
  const found = tooltip.shadowRoot?.querySelector<HTMLElement>('[part="surface"]');
  if (!found) throw new Error('Missing surface');
  return found;
}

const isOpen = (tooltip: PunkTooltip): boolean =>
  tooltip.open && surface(tooltip).matches(':popover-open');

function tooltipWarnings(): unknown[][] {
  return warn.mock.calls.filter(([message]) => String(message).includes('<punk-tooltip>'));
}

describe('opening (12.7.1)', () => {
  it('opens after the delay on pointer hover', async () => {
    const { anchor, tooltip } = await mount({ delay: 300 });
    await userEvent.hover(anchor);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(tooltip.open).toBe(false);
    await vi.waitFor(() => expect(isOpen(tooltip)).toBe(true), { timeout: 2000 });
  });

  it('uses a 400ms delay by default', async () => {
    const tooltip = document.createElement('punk-tooltip');
    expect(tooltip.delay).toBe(400);
  });

  it('opens at once on keyboard focus', async () => {
    const { anchor, tooltip } = await mount({ delay: 5000 });
    await focusWithKeyboard(anchor);
    await tooltip.updateComplete;
    expect(isOpen(tooltip)).toBe(true);
  });

  it('does not open on focus that came from a pointer click', async () => {
    const { anchor, tooltip } = await mount({ delay: 5000 });
    await userEvent.click(anchor);
    await tooltip.updateComplete;
    expect(tooltip.open).toBe(false);
  });

  it('never opens for a touch pointer', async () => {
    const { anchor, tooltip } = await mount({ delay: 20 });
    anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(tooltip.open).toBe(false);
  });

  it('cancels a pending open when the pointer leaves first', async () => {
    const { anchor, tooltip } = await mount({ delay: 300 });
    await userEvent.hover(anchor);
    await userEvent.unhover(anchor);
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(tooltip.open).toBe(false);
  });

  it('closes after the pointer leaves', async () => {
    const { anchor, tooltip } = await mount();
    await userEvent.hover(anchor);
    await vi.waitFor(() => expect(tooltip.open).toBe(true));
    await userEvent.unhover(anchor);
    await vi.waitFor(() => expect(tooltip.open).toBe(false), { timeout: 2000 });
  });

  it('stays open while the anchor keeps focus after the pointer leaves', async () => {
    const { anchor, tooltip } = await mount();
    await focusWithKeyboard(anchor);
    await userEvent.hover(anchor);
    await userEvent.unhover(anchor);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(tooltip.open).toBe(true);
  });

  it('closes when focus leaves', async () => {
    const { anchor, tooltip } = await mount();
    await focusWithKeyboard(anchor);
    expect(tooltip.open).toBe(true);
    anchor.blur();
    await vi.waitFor(() => expect(tooltip.open).toBe(false), { timeout: 2000 });
  });

  it('can be opened and closed with show() and hide()', async () => {
    const { tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    expect(isOpen(tooltip)).toBe(true);
    expect(tooltip.hasAttribute('open')).toBe(true);
    tooltip.hide();
    await tooltip.updateComplete;
    expect(tooltip.open).toBe(false);
    expect(surface(tooltip).matches(':popover-open')).toBe(false);
  });
});

describe('Escape (12.7.2)', () => {
  it('closes the tooltip, stops propagation, and leaves focus alone', async () => {
    const { anchor, tooltip } = await mount();
    await focusWithKeyboard(anchor);
    expect(tooltip.open).toBe(true);

    const reachedBody = vi.fn();
    document.body.addEventListener('keydown', reachedBody);
    await userEvent.keyboard('{Escape}');
    document.body.removeEventListener('keydown', reachedBody);

    await tooltip.updateComplete;
    expect(tooltip.open).toBe(false);
    expect(reachedBody).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(anchor);
  });

  it('stays closed until the anchor is entered again', async () => {
    const { anchor, tooltip } = await mount();
    await focusWithKeyboard(anchor);
    await userEvent.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(tooltip.open).toBe(false);
  });

  it('does not intercept Escape while closed', async () => {
    await mount();
    const reachedBody = vi.fn();
    document.body.addEventListener('keydown', reachedBody);
    await userEvent.keyboard('{Escape}');
    document.body.removeEventListener('keydown', reachedBody);
    expect(reachedBody).toHaveBeenCalledTimes(1);
  });
});

describe('hovering the tooltip (12.7.3)', () => {
  it('stays open when the pointer moves onto it', async () => {
    const { anchor, tooltip } = await mount();
    await userEvent.hover(anchor);
    await vi.waitFor(() => expect(tooltip.open).toBe(true));

    await userEvent.hover(surface(tooltip));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(tooltip.open).toBe(true);
  });

  it('closes once the pointer leaves the tooltip too', async () => {
    const { anchor, tooltip } = await mount();
    await userEvent.hover(anchor);
    await vi.waitFor(() => expect(tooltip.open).toBe(true));
    await userEvent.hover(surface(tooltip));
    await userEvent.unhover(surface(tooltip));
    await vi.waitFor(() => expect(tooltip.open).toBe(false), { timeout: 2000 });
  });
});

describe('placement (12.7.4)', () => {
  const rect = (element: Element) => element.getBoundingClientRect();

  it('sits above the anchor by default, centered, with the offset gap', async () => {
    const { anchor, tooltip } = await mount({ text: 'A hint' });
    tooltip.show();
    await tooltip.updateComplete;
    const a = rect(anchor);
    const s = rect(surface(tooltip));

    expect(Math.round(a.top - s.bottom)).toBe(8);
    expect(Math.abs(s.left + s.width / 2 - (a.left + a.width / 2))).toBeLessThanOrEqual(1);
    expect(surface(tooltip).dataset['side']).toBe('top');
  });

  it('flips below when there is no room above', async () => {
    const { anchor, tooltip } = await mount({ position: { top: '4px' } });
    tooltip.show();
    await tooltip.updateComplete;
    expect(rect(surface(tooltip)).top).toBeGreaterThan(rect(anchor).bottom);
    expect(surface(tooltip).dataset['side']).toBe('bottom');
  });

  it('shifts to stay inside the viewport margin', async () => {
    const { tooltip } = await mount({
      text: 'A fairly long hint that is wider than the anchor',
      position: { left: 'auto', right: '2px' },
    });
    tooltip.show();
    await tooltip.updateComplete;
    const s = rect(surface(tooltip));
    // Firefox lays out to fractions of a pixel, so the margin is checked to within half a pixel.
    expect(s.right).toBeLessThanOrEqual(document.documentElement.clientWidth - 8 + 0.5);
    expect(s.left).toBeGreaterThanOrEqual(8 - 0.5);
  });

  it('puts start on the left and end on the right in left-to-right text', async () => {
    const start = await mount({ placement: 'start', position: { left: '100px' } });
    start.tooltip.show();
    await start.tooltip.updateComplete;
    expect(rect(surface(start.tooltip)).right).toBeLessThanOrEqual(rect(start.anchor).left);

    const end = await mount({ placement: 'end', position: { left: '100px' } });
    end.tooltip.show();
    await end.tooltip.updateComplete;
    expect(rect(surface(end.tooltip)).left).toBeGreaterThanOrEqual(rect(end.anchor).right);
  });

  it('swaps start and end in right-to-left text', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.dir = 'rtl';
    const start = await mount({
      placement: 'start',
      parent: wrapper,
      position: { left: '100px' },
    });
    start.tooltip.show();
    await start.tooltip.updateComplete;
    expect(rect(surface(start.tooltip)).left).toBeGreaterThanOrEqual(rect(start.anchor).right);
  });

  it('follows the anchor when the page scrolls', async () => {
    const holder = track(document.createElement('div'));
    Object.assign(holder.style, { position: 'relative', height: '3000px' });
    const { anchor, tooltip } = await mount({ parent: holder, position: { top: '400px' } });
    tooltip.show();
    await tooltip.updateComplete;
    const before = rect(surface(tooltip)).top - rect(anchor).top;

    window.scrollTo(0, 120);
    await vi.waitFor(() => {
      const after = rect(surface(tooltip)).top - rect(anchor).top;
      expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
    });
    window.scrollTo(0, 0);
  });

  it('is in the top layer while open', async () => {
    const { tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    expect(surface(tooltip).matches(':popover-open')).toBe(true);
  });
});

describe('observers and listeners (12.7.5)', () => {
  it('registers work only while open, and removes all of it on close', async () => {
    const added: string[] = [];
    const removed: string[] = [];
    const observers: Array<{ observed: number; disconnected: boolean }> = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        state = { observed: 0, disconnected: false };
        constructor() {
          observers.push(this.state);
        }
        observe() {
          this.state.observed++;
        }
        disconnect() {
          this.state.disconnected = true;
        }
        unobserve() {}
      },
    );
    const { tooltip } = await mount();
    const track2 = (target: EventTarget, label: string) => {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, ...rest) => {
        added.push(`${label}:${type}`);
        return add(type, ...(rest as [EventListenerOrEventListenerObject]));
      });
      vi.spyOn(target, 'removeEventListener').mockImplementation((type, ...rest) => {
        removed.push(`${label}:${type}`);
        return remove(type, ...(rest as [EventListenerOrEventListenerObject]));
      });
    };
    track2(document, 'document');
    track2(window, 'window');

    expect(observers).toHaveLength(0);
    tooltip.show();
    await tooltip.updateComplete;
    expect(observers.length).toBeGreaterThan(0);
    expect(added.sort()).toEqual(['document:keydown', 'window:resize', 'window:scroll']);

    tooltip.hide();
    await tooltip.updateComplete;
    expect(removed.sort()).toEqual(added.sort());
    expect(observers.every((observer) => observer.disconnected)).toBe(true);
  });

  it('does not reposition after closing', async () => {
    const { tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    tooltip.hide();
    await tooltip.updateComplete;

    surface(tooltip).style.left = '123px';
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(surface(tooltip).style.left).toBe('123px');
  });

  it('cleans up when removed while open', async () => {
    const { anchor, tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    tooltip.remove();
    expect(tooltip.open).toBe(false);

    const reachedBody = vi.fn();
    document.body.addEventListener('keydown', reachedBody);
    await userEvent.keyboard('{Escape}');
    document.body.removeEventListener('keydown', reachedBody);
    expect(reachedBody).toHaveBeenCalledTimes(1);
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('one at a time (12.7.6)', () => {
  it('closes the previous tooltip when another opens', async () => {
    const wrapper = track(document.createElement('div'));
    const first = await mount({ parent: wrapper, position: { left: '100px' } });
    const second = await mount({ parent: wrapper, position: { left: '400px' } });

    first.tooltip.show();
    await first.tooltip.updateComplete;
    second.tooltip.show();
    await second.tooltip.updateComplete;
    await first.tooltip.updateComplete;

    expect(second.tooltip.open).toBe(true);
    expect(first.tooltip.open).toBe(false);
  });

  it('skips the delay for an adjacent anchor within 300ms', async () => {
    const wrapper = track(document.createElement('div'));
    const first = await mount({ parent: wrapper, delay: 1500, position: { left: '100px' } });
    const second = await mount({ parent: wrapper, delay: 1500, position: { left: '400px' } });

    first.tooltip.show();
    await first.tooltip.updateComplete;
    first.tooltip.hide();
    await first.tooltip.updateComplete;

    await userEvent.hover(second.anchor);
    await vi.waitFor(() => expect(second.tooltip.open).toBe(true), { timeout: 600 });
  });

  it('applies the full delay again after the warm-up window', async () => {
    const { anchor, tooltip } = await mount({ delay: 400 });
    tooltip.show();
    await tooltip.updateComplete;
    tooltip.hide();
    await tooltip.updateComplete;

    await new Promise((resolve) => setTimeout(resolve, 400));
    await userEvent.hover(anchor);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(tooltip.open).toBe(false);
  });
});

describe('describing the anchor (12.7.7)', () => {
  it('links a plain anchor through aria-describedby and gives the tooltip a role', async () => {
    const { anchor, tooltip } = await mount({ text: 'Saves the file' });
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.id).toMatch(/^punk-tooltip-/);
    expect(anchor.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(document.getElementById(tooltip.id)?.textContent).toBe('Saves the file');
  });

  it('keeps an id and an existing description', async () => {
    const wrapper = track(document.createElement('div'));
    const anchor = document.createElement('button');
    anchor.setAttribute('aria-describedby', 'existing');
    const tooltip = document.createElement('punk-tooltip');
    tooltip.id = 'mine';
    wrapper.append(anchor, tooltip);
    await tooltip.updateComplete;

    expect(anchor.getAttribute('aria-describedby')).toBe('existing mine');
    tooltip.remove();
    expect(anchor.getAttribute('aria-describedby')).toBe('existing');
    expect(tooltip.id).toBe('mine');
  });

  it('removes only what it added when it disconnects', async () => {
    const { anchor, tooltip } = await mount();
    expect(anchor.hasAttribute('aria-describedby')).toBe(true);
    tooltip.remove();
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip.hasAttribute('role')).toBe(false);
    expect(tooltip.hasAttribute('id')).toBe(false);
  });

  it('describes a punk-button through setExternalAria', async () => {
    const wrapper = track(document.createElement('div'));
    const button = document.createElement('punk-button') as PunkButton;
    button.textContent = 'Save';
    const tooltip = document.createElement('punk-tooltip');
    tooltip.textContent = 'Saves the file';
    wrapper.append(button, tooltip);
    await tooltip.updateComplete;
    await button.updateComplete;

    const inner = button.shadowRoot?.querySelector('button');
    const id = inner?.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(button.shadowRoot?.getElementById(id ?? '')?.textContent).toBe('Saves the file');
    expect(button.hasAttribute('aria-describedby')).toBe(false);

    tooltip.remove();
    await button.updateComplete;
    expect(inner?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps a punk-button description current as the text changes', async () => {
    const wrapper = track(document.createElement('div'));
    const button = document.createElement('punk-button') as PunkButton;
    button.textContent = 'Save';
    const tooltip = document.createElement('punk-tooltip');
    tooltip.textContent = 'Before';
    wrapper.append(button, tooltip);
    await tooltip.updateComplete;

    tooltip.textContent = 'After';
    await vi.waitFor(async () => {
      await button.updateComplete;
      const id = button.shadowRoot?.querySelector('button')?.getAttribute('aria-describedby') ?? '';
      expect(button.shadowRoot?.getElementById(id)?.textContent).toBe('After');
    });
  });

  it('wires a punk anchor that is defined later', async () => {
    const wrapper = track(document.createElement('div'));
    const anchor = document.createElement('punk-late-anchor');
    const tooltip = document.createElement('punk-tooltip');
    wrapper.append(anchor, tooltip);
    await tooltip.updateComplete;
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);

    const described = vi.fn();
    customElements.define(
      'punk-late-anchor',
      class extends HTMLElement {
        setExternalAria(aria: { description?: string | null }) {
          described(aria.description);
        }
      },
    );
    await vi.waitFor(() => expect(described).toHaveBeenCalled());
  });

  it('does not describe the anchor when describe is false', async () => {
    const wrapper = track(document.createElement('div'));
    const anchor = document.createElement('button');
    const tooltip = document.createElement('punk-tooltip');
    tooltip.describe = false;
    tooltip.textContent = 'Name only';
    wrapper.append(anchor, tooltip);
    await tooltip.updateComplete;

    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip.hasAttribute('role')).toBe(false);

    tooltip.describe = true;
    await tooltip.updateComplete;
    expect(anchor.getAttribute('aria-describedby')).toBe(tooltip.id);
    tooltip.describe = false;
    await tooltip.updateComplete;
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
  });

  it('reads describe="false" from an attribute', () => {
    const tooltip = document.createElement('punk-tooltip');
    tooltip.setAttribute('describe', 'false');
    expect(tooltip.describe).toBe(false);
    tooltip.removeAttribute('describe');
    expect(tooltip.describe).toBe(true);
  });
});

describe('finding the anchor', () => {
  it('uses the element named by for, in the same root', async () => {
    const wrapper = track(document.createElement('div'));
    const target = document.createElement('button');
    target.id = 'target';
    const tooltip = document.createElement('punk-tooltip');
    tooltip.setAttribute('for', 'target');
    wrapper.append(tooltip, target);
    await tooltip.updateComplete;

    expect(target.getAttribute('aria-describedby')).toBe(tooltip.id);
    tooltip.show();
    await tooltip.updateComplete;
    expect(surface(tooltip).getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('re-attaches when for changes', async () => {
    const wrapper = track(document.createElement('div'));
    const a = Object.assign(document.createElement('button'), { id: 'a' });
    const b = Object.assign(document.createElement('button'), { id: 'b' });
    const tooltip = document.createElement('punk-tooltip');
    tooltip.setAttribute('for', 'a');
    wrapper.append(a, b, tooltip);
    await tooltip.updateComplete;
    expect(a.hasAttribute('aria-describedby')).toBe(true);

    tooltip.setAttribute('for', 'b');
    await tooltip.updateComplete;
    expect(a.hasAttribute('aria-describedby')).toBe(false);
    expect(b.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('warns once when no anchor can be found', async () => {
    const wrapper = track(document.createElement('div'));
    const tooltip = document.createElement('punk-tooltip');
    tooltip.setAttribute('for', 'missing');
    wrapper.append(tooltip);
    await tooltip.updateComplete;
    expect(tooltipWarnings()).toHaveLength(1);
    expect(String(tooltipWarnings()[0]?.[0])).toContain('anchor');
  });

  it('warns when the first element has nothing before it', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.append(document.createElement('punk-tooltip'));
    await (wrapper.firstElementChild as PunkTooltip).updateComplete;
    expect(tooltipWarnings()).toHaveLength(1);
  });
});

describe('content', () => {
  it('warns once when it contains an interactive control', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.append(document.createElement('button'));
    const tooltip = document.createElement('punk-tooltip');
    tooltip.append(Object.assign(document.createElement('a'), { href: '#', textContent: 'link' }));
    wrapper.append(tooltip);
    await tooltip.updateComplete;
    await vi.waitFor(() => expect(tooltipWarnings()).toHaveLength(1));
  });

  it('does not warn for plain text or inert markup', async () => {
    const { tooltip } = await mount();
    tooltip.append(Object.assign(document.createElement('b'), { textContent: 'bold' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(tooltipWarnings()).toHaveLength(0);
  });

  it('wraps at --punk-tooltip-max-width', async () => {
    const { tooltip } = await mount({
      text: 'word '.repeat(60),
    });
    tooltip.style.setProperty('--punk-tooltip-max-width', '200px');
    tooltip.show();
    await tooltip.updateComplete;
    expect(surface(tooltip).getBoundingClientRect().width).toBeLessThanOrEqual(200);
  });

  it('honors --punk-tooltip-offset', async () => {
    const { anchor, tooltip } = await mount();
    tooltip.style.setProperty('--punk-tooltip-offset', '20px');
    tooltip.show();
    await tooltip.updateComplete;
    const gap =
      anchor.getBoundingClientRect().top - surface(tooltip).getBoundingClientRect().bottom;
    expect(Math.round(gap)).toBe(20);
  });

  it('treats an unknown placement as top', async () => {
    const { tooltip } = await mount();
    tooltip.placement = 'diagonal' as TooltipPlacement;
    tooltip.show();
    await tooltip.updateComplete;
    expect(surface(tooltip).dataset['side']).toBe('top');
  });
});

describe('without the Popover API (12.7.8)', () => {
  function disablePopover(): () => void {
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const show = proto['showPopover'];
    const hide = proto['hidePopover'];
    proto['showPopover'] = undefined;
    proto['hidePopover'] = undefined;
    return () => {
      proto['showPopover'] = show;
      proto['hidePopover'] = hide;
    };
  }

  it('falls back to a fixed-position surface that still opens and positions', async () => {
    const restore = disablePopover();
    try {
      const { anchor, tooltip } = await mount();
      tooltip.show();
      await tooltip.updateComplete;

      const el = surface(tooltip);
      const style = getComputedStyle(el);
      expect(el.matches(':popover-open')).toBe(false);
      expect(style.display).toBe('block');
      expect(style.position).toBe('fixed');
      expect(style.zIndex).toBe('1000');
      expect(
        Math.round(anchor.getBoundingClientRect().top - el.getBoundingClientRect().bottom),
      ).toBe(8);

      tooltip.hide();
      await tooltip.updateComplete;
      expect(getComputedStyle(el).display).toBe('none');
    } finally {
      restore();
    }
  });

  it('honors --punk-z-overlay in the fallback', async () => {
    const restore = disablePopover();
    try {
      const { tooltip } = await mount();
      tooltip.style.setProperty('--punk-z-overlay', '4321');
      tooltip.show();
      await tooltip.updateComplete;
      expect(getComputedStyle(surface(tooltip)).zIndex).toBe('4321');
    } finally {
      restore();
    }
  });
});

describe('appearance', () => {
  it('is hidden until opened and takes no layout space', async () => {
    const { anchor, tooltip } = await mount();
    expect(getComputedStyle(surface(tooltip)).display).toBe('none');
    expect(getComputedStyle(tooltip).display).toBe('contents');
    expect(anchor.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('uses a raised surface with light text on the default dark theme', async () => {
    const { tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    const style = getComputedStyle(surface(tooltip));
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(style.color).toBe('rgb(240, 234, 216)');
  });

  it('switches to a plain border under forced colors', async () => {
    const { tooltip } = await mount();
    tooltip.show();
    await tooltip.updateComplete;
    expect(getComputedStyle(surface(tooltip)).borderTopWidth).toBe('0px');
    await commands.setForcedColors('active');
    try {
      expect(getComputedStyle(surface(tooltip)).borderTopWidth).toBe('2px');
    } finally {
      await commands.setForcedColors(null);
    }
  });
});
