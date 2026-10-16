import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { resetStrings, setStrings } from '../../utilities/localize.ts';
import '../button/register.ts';
import './register.ts';
import type { PunkToast, PunkToastStack } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetStrings();
});

const flush = () => new Promise((resolve) => setTimeout(resolve));

async function mount(attributes = '', content = '', dir = ''): Promise<PunkToastStack> {
  const wrapper = track(document.createElement('div'));
  if (dir) wrapper.dir = dir;
  wrapper.innerHTML = `<punk-toast-stack ${attributes}>${content}</punk-toast-stack>`;
  const stack = wrapper.querySelector('punk-toast-stack') as PunkToastStack;
  await stack.updateComplete;
  await flush();
  return stack;
}

const surface = (stack: Element) =>
  stack.shadowRoot?.querySelector('[part="stack"]') as HTMLElement;
const region = (stack: Element, role: 'status' | 'alert') =>
  stack.shadowRoot?.querySelector(`[role="${role}"]`) as HTMLElement;
/** The live region a toast is rendered in, by way of the slot it was assigned to. */
const regionOf = (toast: Element) => toast.assignedSlot?.parentElement ?? null;
const toastsOf = (stack: Element) => [...stack.querySelectorAll('punk-toast')] as PunkToast[];
const dismissedBy = (stack: Element) => {
  const reasons: string[] = [];
  stack.addEventListener('punk-dismiss', (event) => {
    reasons.push((event as CustomEvent<{ reason: string }>).detail.reason);
  });
  return reasons;
};

describe('the live regions', () => {
  it('has a status region and an alert region before any toast exists', async () => {
    const stack = await mount();
    expect(region(stack, 'status')).toBeTruthy();
    expect(region(stack, 'alert')).toBeTruthy();
    expect(region(stack, 'status').querySelector('slot')?.name).toBe('polite');
    expect(region(stack, 'alert').querySelector('slot')?.name).toBe('assertive');
  });

  it('does not re-announce the toasts already showing when another arrives', async () => {
    const stack = await mount();
    expect(region(stack, 'status').getAttribute('aria-atomic')).toBe('false');
    expect(region(stack, 'alert').getAttribute('aria-atomic')).toBe('false');
  });

  it('puts warning and danger toasts in the alert region, and info and success in the status one', async () => {
    const stack = await mount(
      '',
      ['info', 'success', 'warning', 'danger']
        .map((variant) => `<punk-toast variant="${variant}">${variant}</punk-toast>`)
        .join(''),
    );
    const found = toastsOf(stack).map((toast) => [
      toast.variant,
      regionOf(toast)?.getAttribute('role'),
    ]);
    expect(found).toEqual([
      ['info', 'status'],
      ['success', 'status'],
      ['warning', 'alert'],
      ['danger', 'alert'],
    ]);
  });

  it('moves a toast to the other region when its variant changes', async () => {
    const stack = await mount('', '<punk-toast variant="info">Saved</punk-toast>');
    const toast = toastsOf(stack)[0] as PunkToast;
    toast.variant = 'danger';
    await toast.updateComplete;
    expect(regionOf(toast)?.getAttribute('role')).toBe('alert');
    toast.variant = 'success';
    await toast.updateComplete;
    expect(regionOf(toast)?.getAttribute('role')).toBe('status');
  });

  it('puts a toast with an unknown variant in the status region', async () => {
    const stack = await mount('', '<punk-toast variant="broken">Saved</punk-toast>');
    expect(regionOf(toastsOf(stack)[0] as PunkToast)?.getAttribute('role')).toBe('status');
  });

  it('places a toast added later, from markup or from code', async () => {
    const stack = await mount();
    const toast = document.createElement('punk-toast');
    toast.variant = 'warning';
    toast.textContent = 'Low fuel';
    stack.append(toast);
    await flush();
    expect(regionOf(toast)?.getAttribute('role')).toBe('alert');
  });

  it('gives the toast its own slot back when it leaves', async () => {
    const stack = await mount('', '<punk-toast variant="danger" duration="0">Down</punk-toast>');
    const toast = toastsOf(stack)[0] as PunkToast;
    expect(toast.getAttribute('slot')).toBe('assertive');
    expect(toast.owner).toBe(stack);
    toast.remove();
    expect(toast.hasAttribute('slot')).toBe(false);
    expect(toast.owner).toBeNull();
  });

  it('places a toast again when it is moved into another stack', async () => {
    const first = await mount();
    const second = await mount();
    const toast = first.show({ message: 'Moved', variant: 'danger', duration: 0 });
    await flush();
    second.append(toast);
    await flush();
    expect(toast.owner).toBe(second);
    expect(regionOf(toast)?.getAttribute('role')).toBe('alert');
    expect(regionOf(toast)?.getRootNode()).toBe(second.shadowRoot);
  });
});

describe('the region name', () => {
  it('is the localized Notifications, and `label` replaces it', async () => {
    const stack = await mount();
    expect(surface(stack).getAttribute('role')).toBe('region');
    expect(surface(stack).getAttribute('aria-label')).toBe('Notifications');
    stack.label = 'Meldungen';
    await stack.updateComplete;
    expect(surface(stack).getAttribute('aria-label')).toBe('Meldungen');
    stack.label = '';
    setStrings({ notifications: 'Benachrichtigungen' });
    stack.requestUpdate();
    await stack.updateComplete;
    expect(surface(stack).getAttribute('aria-label')).toBe('Benachrichtigungen');
  });
});

describe('show() and clear()', () => {
  it('creates a toast with the options, appends it, and returns it', async () => {
    const stack = await mount();
    const action = document.createElement('button');
    action.textContent = 'Undo';
    const toast = stack.show({
      message: 'Saved',
      heading: 'Done',
      variant: 'success',
      duration: 1234,
      action,
    });
    await toast.updateComplete;
    expect(toast.parentElement).toBe(stack);
    expect(toast.textContent).toContain('Saved');
    expect([toast.heading, toast.variant, toast.duration]).toEqual(['Done', 'success', 1234]);
    expect(action.slot).toBe('action');
    expect(action.parentElement).toBe(toast);
  });

  it('puts the toast in its live region at once', async () => {
    const stack = await mount();
    const toast = stack.show({ message: 'Down', variant: 'danger' });
    expect(toast.getAttribute('slot')).toBe('assertive');
    await toast.updateComplete;
    expect(regionOf(toast)?.getAttribute('role')).toBe('alert');
  });

  it('treats the message as text, not as markup', async () => {
    const stack = await mount();
    const toast = stack.show({ message: '<b onclick="x()">Bold</b>' });
    expect(toast.querySelector('b')).toBeNull();
    expect(toast.textContent).toBe('<b onclick="x()">Bold</b>');
  });

  it('works with only a message', async () => {
    const stack = await mount();
    const toast = stack.show({ message: 'Hello' });
    await toast.updateComplete;
    expect([toast.variant, toast.duration, toast.heading]).toEqual(['info', null, '']);
  });

  it('dismisses every toast with the reason method on clear()', async () => {
    const stack = await mount();
    const reasons = dismissedBy(stack);
    for (const message of ['a', 'b', 'c']) stack.show({ message, duration: 0 });
    stack.clear();
    expect(reasons).toEqual(['method', 'method', 'method']);
    await vi.waitFor(() => expect(toastsOf(stack)).toEqual([]));
  });

  it('does nothing on clear() when there are no toasts', async () => {
    const stack = await mount();
    expect(() => stack.clear()).not.toThrow();
  });
});

describe('the limit', () => {
  it('dismisses the oldest toast past the limit, with the reason limit', async () => {
    const stack = await mount('limit="2"');
    const reasons = dismissedBy(stack);
    const first = stack.show({ message: 'one', duration: 0 });
    stack.show({ message: 'two', duration: 0 });
    expect(reasons).toEqual([]);
    stack.show({ message: 'three', duration: 0 });
    expect(reasons).toEqual(['limit']);
    await vi.waitFor(() => expect(first.isConnected).toBe(false));
    expect(toastsOf(stack).map((toast) => toast.textContent)).toEqual(['two', 'three']);
  });

  it('is 5 by default', async () => {
    const stack = await mount();
    expect(stack.limit).toBe(5);
    const reasons = dismissedBy(stack);
    for (let index = 0; index < 5; index++) stack.show({ message: `${index}`, duration: 0 });
    expect(reasons).toEqual([]);
    stack.show({ message: 'six', duration: 0 });
    expect(reasons).toEqual(['limit']);
  });

  it('does not count a toast that is already on its way out', async () => {
    const stack = await mount('limit="2"');
    const reasons = dismissedBy(stack);
    const first = stack.show({ message: 'one', duration: 0 });
    const second = stack.show({ message: 'two', duration: 0 });
    second.dismiss();
    stack.show({ message: 'three', duration: 0 });
    expect(reasons).toEqual(['method']);
    await flush();
    expect(first.isConnected).toBe(true);
  });

  it('counts toasts of both regions together', async () => {
    const stack = await mount('limit="2"');
    const reasons = dismissedBy(stack);
    stack.show({ message: 'a', variant: 'danger' });
    stack.show({ message: 'b', variant: 'info', duration: 0 });
    stack.show({ message: 'c', variant: 'danger' });
    expect(reasons).toEqual(['limit']);
  });

  it('applies to toasts added in markup, and to a lower limit set later', async () => {
    const stack = await mount(
      'limit="2"',
      '<punk-toast duration="0">a</punk-toast><punk-toast duration="0">b</punk-toast><punk-toast duration="0">c</punk-toast>',
    );
    await vi.waitFor(() =>
      expect(toastsOf(stack).map((toast) => toast.textContent)).toEqual(['b', 'c']),
    );
    const reasons = dismissedBy(stack);
    stack.limit = 1;
    await stack.updateComplete;
    expect(reasons).toEqual(['limit']);
  });

  it('keeps a toast whose dismissal was cancelled, and does not count it twice', async () => {
    const stack = await mount('limit="1"');
    stack.addEventListener('punk-dismiss', (event) => event.preventDefault());
    const first = stack.show({ message: 'one', duration: 0 });
    stack.show({ message: 'two', duration: 0 });
    await flush();
    expect(first.isConnected).toBe(true);
  });

  it('repairs a limit that is not a usable number', async () => {
    const stack = await mount('limit="0"');
    const reasons = dismissedBy(stack);
    stack.show({ message: 'one', duration: 0 });
    expect(reasons).toEqual([]);
    stack.show({ message: 'two', duration: 0 });
    expect(reasons).toEqual(['limit']);
  });
});

describe('placement', () => {
  // The stack is narrowed so a corner is told apart from its opposite.
  const corner = (stack: Element) => {
    const rect = surface(stack).getBoundingClientRect();
    return {
      top: rect.top < innerHeight / 2,
      left: rect.left < innerWidth / 2,
    };
  };
  const narrow = (stack: Element) => {
    surface(stack).style.inlineSize = '160px';
  };

  it.each([
    ['bottom-end', { top: false, left: false }],
    ['bottom-start', { top: false, left: true }],
    ['top-end', { top: true, left: false }],
    ['top-start', { top: true, left: true }],
  ])('puts %s in that corner, in left-to-right text', async (placement, expected) => {
    const stack = await mount(`placement="${placement}"`);
    narrow(stack);
    stack.show({ message: 'Hello', duration: 0 });
    await flush();
    expect(corner(stack)).toEqual(expected);
  });

  it('swaps start and end in right-to-left text', async () => {
    const stack = await mount('placement="top-start"', '', 'rtl');
    narrow(stack);
    stack.show({ message: 'Hello', duration: 0 });
    await flush();
    expect(corner(stack)).toEqual({ top: true, left: false });
  });

  it('is bottom-end by default, and for an unknown value', async () => {
    const stack = await mount();
    expect(stack.placement).toBe('bottom-end');
    stack.placement = 'middle' as never;
    narrow(stack);
    stack.show({ message: 'Hello', duration: 0 });
    await flush();
    expect(corner(stack)).toEqual({ top: false, left: false });
  });

  it('puts the newest toast nearest the edge it grows from', async () => {
    for (const placement of ['bottom-end', 'top-end'] as const) {
      const stack = await mount(`placement="${placement}"`);
      const older = stack.show({ message: 'older', duration: 0 });
      const newer = stack.show({ message: 'newer', duration: 0 });
      await flush();
      const [olderTop, newerTop] = [older, newer].map((toast) => toast.getBoundingClientRect().top);
      if (placement === 'bottom-end') expect(newerTop).toBeGreaterThan(olderTop as number);
      else expect(newerTop).toBeLessThan(olderTop as number);
      stack.clear();
      await vi.waitFor(() => expect(toastsOf(stack)).toEqual([]));
    }
  });

  it('puts the alert region nearest the edge the stack grows from', async () => {
    for (const placement of ['bottom-end', 'top-end'] as const) {
      const stack = await mount(`placement="${placement}"`);
      const polite = stack.show({ message: 'polite', variant: 'info', duration: 0 });
      const assertive = stack.show({ message: 'assertive', variant: 'danger', duration: 0 });
      await flush();
      const [politeTop, assertiveTop] = [polite, assertive].map(
        (toast) => toast.getBoundingClientRect().top,
      );
      if (placement === 'bottom-end') expect(assertiveTop).toBeGreaterThan(politeTop as number);
      else expect(assertiveTop).toBeLessThan(politeTop as number);
      stack.clear();
      await vi.waitFor(() => expect(toastsOf(stack)).toEqual([]));
    }
  });

  it('keeps the stack inside the viewport, however long the message', async () => {
    const stack = await mount();
    stack.show({
      message: 'A long message that has to wrap inside a very narrow viewport',
      duration: 0,
    });
    await flush();
    const rect = surface(stack).getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });
});

describe('the top layer', () => {
  it('is in the top layer from the start, empty, and stays there as toasts come and go', async () => {
    const stack = await mount();
    expect(surface(stack).matches(':popover-open')).toBe(true);
    const toast = stack.show({ message: 'Hello', duration: 0 });
    toast.dismiss();
    await vi.waitFor(() => expect(toast.isConnected).toBe(false));
    expect(surface(stack).matches(':popover-open')).toBe(true);
  });

  it('is in the top layer again after it is moved', async () => {
    const stack = await mount();
    const parent = stack.parentElement as HTMLElement;
    stack.remove();
    parent.append(stack);
    await flush();
    expect(surface(stack).matches(':popover-open')).toBe(true);
  });

  it('stays above a popover that opened before it', async () => {
    const other = track(document.createElement('div'));
    other.popover = 'manual';
    other.textContent = 'Menu';
    other.showPopover();
    const stack = await mount();
    stack.show({ message: 'Hello', duration: 0 });
    await flush();
    const rect = (stack.querySelector('punk-toast') as HTMLElement).getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(hit?.localName).toBe('punk-toast');
    other.hidePopover();
  });

  it('works with the Popover API turned off, fixed above the page', async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      value: undefined,
      configurable: true,
    });
    try {
      const stack = await mount();
      stack.show({ message: 'Hello', duration: 0 });
      await flush();
      expect(getComputedStyle(surface(stack)).display).toBe('flex');
      expect(getComputedStyle(surface(stack)).zIndex).toBe('1200');
      const rect = surface(stack).getBoundingClientRect();
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.bottom).toBeLessThanOrEqual(innerHeight);
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'showPopover', original);
    }
  });

  it('lets clicks through everywhere but the toasts', async () => {
    const stack = await mount();
    const toast = stack.show({ message: 'Hello', duration: 0 });
    await toast.updateComplete;
    expect(getComputedStyle(surface(stack)).pointerEvents).toBe('none');
    expect(getComputedStyle(toast).pointerEvents).toBe('auto');
    for (const role of ['status', 'alert'] as const) {
      expect(getComputedStyle(region(stack, role)).pointerEvents).toBe('none');
    }
  });

  it('lets a button underneath the empty stack be clicked', async () => {
    const stack = await mount();
    const rect = surface(stack).getBoundingClientRect();
    const button = track(document.createElement('button'));
    button.style.cssText = `position: fixed; inset-inline-end: 8px; inset-block-end: 8px; inline-size: 120px; block-size: 40px; left: ${Math.max(0, rect.right - 120)}px; top: ${Math.max(0, rect.bottom - 40)}px`;
    const onClick = vi.fn();
    button.addEventListener('click', onClick);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('what a toast does in a stack', () => {
  it('can be dismissed from the keyboard, and the others stay', async () => {
    const stack = await mount();
    const first = stack.show({ message: 'one', duration: 0 });
    const second = stack.show({ message: 'two', duration: 0 });
    await second.updateComplete;
    (second.shadowRoot?.querySelector('button') as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(second.isConnected).toBe(false));
    expect(first.isConnected).toBe(true);
  });

  it('is left in the stack when the application cancels its dismissal', async () => {
    const stack = await mount();
    const toast = stack.show({ message: 'one', duration: 0 });
    toast.addEventListener('punk-dismiss', (event) => event.preventDefault());
    toast.dismiss('user');
    await flush();
    expect(toastsOf(stack)).toEqual([toast]);
  });
});
