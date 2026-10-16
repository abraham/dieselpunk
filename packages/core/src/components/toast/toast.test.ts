import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, rgb, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { resetStrings, setStrings } from '../../utilities/localize.ts';
import '../button/register.ts';
import './register.ts';
import type { PunkDismissDetail, PunkToast, ToastVariant } from './index.ts';

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetStrings();
  await commands.setForcedColors(null);
  Reflect.deleteProperty(document, 'hidden');
});

// Not a timeout, so it also works while the clock is faked.
const microtasks = async () => {
  for (let round = 0; round < 5; round++) await Promise.resolve();
};
const variants: ToastVariant[] = ['info', 'success', 'warning', 'danger'];

async function mount(attributes = '', content = 'Saved', extra = ''): Promise<PunkToast> {
  // Away from the corner the pointer is parked in, so an unhover really leaves it.
  const wrapper = track(document.createElement('div'));
  wrapper.style.cssText = 'position: absolute; left: 160px; top: 160px; inline-size: 300px';
  wrapper.innerHTML = `<punk-toast ${attributes}>${content}${extra}</punk-toast>`;
  const toast = wrapper.querySelector('punk-toast') as PunkToast;
  await toast.updateComplete;
  return toast;
}

const part = (toast: Element, name: string) =>
  toast.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const dismissButton = (toast: Element) => part(toast, 'dismiss-button') as HTMLButtonElement;

/** Records `punk-dismiss`, and lets the test decide whether to cancel it. */
function listen(toast: Element, cancel = false) {
  const reasons: string[] = [];
  toast.addEventListener('punk-dismiss', (event) => {
    reasons.push((event as CustomEvent<PunkDismissDetail>).detail.reason);
    if (cancel) event.preventDefault();
  });
  return reasons;
}

/** Fake time for the countdown only. Updates and the fade still run on the real clock. */
const useClock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });

describe('structure', () => {
  it('renders the parts, and shows the heading only when it has one', async () => {
    const toast = await mount('', 'Saved');
    for (const name of ['toast', 'indicator', 'heading', 'content', 'action', 'dismiss-button']) {
      expect(part(toast, name), name).toBeTruthy();
    }
    expect(part(toast, 'heading').hidden).toBe(true);
    expect(part(toast, 'action').hidden).toBe(true);
    toast.heading = 'Done';
    await toast.updateComplete;
    expect(part(toast, 'heading').hidden).toBe(false);
    expect(part(toast, 'heading').textContent).toBe('Done');
  });

  it('shows the action only when there is one', async () => {
    const toast = await mount('', 'Saved', '<button slot="action">Undo</button>');
    await microtasks();
    expect(part(toast, 'action').hidden).toBe(false);
  });

  it('has a dismiss button that is a native button with the localized name', async () => {
    const toast = await mount();
    expect(dismissButton(toast).localName).toBe('button');
    expect(dismissButton(toast).getAttribute('aria-label')).toBe('Dismiss');
    setStrings({ dismiss: 'Schließen' });
    toast.requestUpdate();
    await toast.updateComplete;
    expect(dismissButton(toast).getAttribute('aria-label')).toBe('Schließen');
  });

  it('hides the shape from assistive technology, since the text carries the meaning', async () => {
    expect(part(await mount(), 'indicator').getAttribute('aria-hidden')).toBe('true');
  });

  it('has no role of its own, since the stack supplies the live region', async () => {
    const toast = await mount();
    expect(toast.hasAttribute('role')).toBe(false);
    expect(toast.shadowRoot?.querySelector('[role], [aria-live]')).toBeNull();
  });

  it('reflects variant, duration, and heading, set before or after it connects', async () => {
    const toast = await mount('variant="danger" duration="900" heading="Low fuel"');
    expect([toast.variant, toast.duration, toast.heading]).toEqual(['danger', 900, 'Low fuel']);
    toast.variant = 'success';
    toast.duration = 0;
    toast.heading = '';
    await toast.updateComplete;
    expect(toast.getAttribute('variant')).toBe('success');
    expect(toast.getAttribute('duration')).toBe('0');
    expect(toast.getAttribute('heading')).toBe('');
    toast.removeAttribute('duration');
    expect(toast.duration).toBeNull();
  });
});

describe('dismissing', () => {
  it('sends punk-dismiss with the reason user from the button, and removes the toast', async () => {
    const toast = await mount();
    const reasons = listen(toast);
    dismissButton(toast).click();
    expect(reasons).toEqual(['user']);
    await vi.waitFor(() => expect(toast.isConnected).toBe(false));
  });

  it('is dismissed with the keyboard', async () => {
    const toast = await mount();
    const reasons = listen(toast);
    dismissButton(toast).focus();
    await userEvent.keyboard('{Enter}');
    expect(reasons).toEqual(['user']);
  });

  it('sends the reason method from dismiss(), once however often it is called', async () => {
    const toast = await mount();
    const reasons = listen(toast);
    toast.dismiss();
    toast.dismiss();
    dismissButton(toast).click();
    expect(reasons).toEqual(['method']);
  });

  it('takes the reason it is given', async () => {
    const toast = await mount();
    const reasons = listen(toast);
    toast.dismiss('limit');
    expect(reasons).toEqual(['limit']);
  });

  it('bubbles out of the toast, composed, so a listener on the page hears it', async () => {
    const toast = await mount();
    const heard = vi.fn();
    document.addEventListener('punk-dismiss', heard);
    toast.dismiss();
    document.removeEventListener('punk-dismiss', heard);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('stays when the event is cancelled, and can be dismissed again', async () => {
    const toast = await mount();
    const reasons = listen(toast, true);
    toast.dismiss();
    await microtasks();
    expect(toast.isConnected).toBe(true);
    expect(part(toast, 'toast').classList.contains('leaving')).toBe(false);
    toast.dismiss();
    expect(reasons).toEqual(['method', 'method']);
  });

  it('fades out before it is removed, so it is still there while the fade runs', async () => {
    const toast = await mount();
    toast.dismiss();
    await toast.updateComplete;
    const surface = part(toast, 'toast');
    expect(surface.classList.contains('leaving')).toBe(true);
    expect(surface.getAnimations().length).toBeGreaterThan(0);
    expect(toast.isConnected).toBe(true);
    await vi.waitFor(() => expect(toast.isConnected).toBe(false));
  });

  it('does not take clicks while it leaves', async () => {
    const toast = await mount();
    toast.dismiss();
    await toast.updateComplete;
    expect(getComputedStyle(part(toast, 'toast')).pointerEvents).toBe('none');
  });

  it('is removed at once when the application removed it in its own handler', async () => {
    const toast = await mount();
    toast.addEventListener('punk-dismiss', () => toast.remove());
    expect(() => toast.dismiss()).not.toThrow();
    await microtasks();
    expect(toast.isConnected).toBe(false);
  });
});

describe('the countdown', () => {
  it.each(['info', 'success'] as const)(
    'dismisses a %s toast after 5 seconds, with the reason timeout',
    async (variant) => {
      useClock();
      const toast = await mount(`variant="${variant}"`);
      const reasons = listen(toast);
      vi.advanceTimersByTime(4999);
      expect(reasons).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(reasons).toEqual(['timeout']);
    },
  );

  it.each(['warning', 'danger'] as const)(
    'never dismisses a %s toast by itself',
    async (variant) => {
      useClock();
      const toast = await mount(`variant="${variant}"`);
      const reasons = listen(toast);
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(600_000);
      expect(reasons).toEqual([]);
    },
  );

  it('never dismisses a toast with an action by itself', async () => {
    useClock();
    const toast = await mount('', 'Saved', '<button slot="action">Undo</button>');
    await microtasks();
    const reasons = listen(toast);
    vi.advanceTimersByTime(600_000);
    expect(reasons).toEqual([]);
  });

  it('starts counting when its action is removed', async () => {
    useClock();
    const toast = await mount('', 'Saved', '<button slot="action" id="undo">Undo</button>');
    await microtasks();
    expect(vi.getTimerCount()).toBe(0);
    toast.querySelector('#undo')?.remove();
    await microtasks();
    await toast.updateComplete;
    expect(vi.getTimerCount()).toBe(1);
  });

  it('uses `duration` when it is set, for any variant', async () => {
    useClock();
    const toast = await mount('variant="danger" duration="1500"');
    const reasons = listen(toast);
    vi.advanceTimersByTime(1499);
    expect(reasons).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(reasons).toEqual(['timeout']);
  });

  it('never closes by itself with duration 0', async () => {
    useClock();
    const toast = await mount('duration="0"');
    const reasons = listen(toast);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(600_000);
    expect(reasons).toEqual([]);
  });

  it('uses the default for a duration that is not a number', async () => {
    useClock();
    const toast = await mount('duration="soon"');
    const reasons = listen(toast);
    vi.advanceTimersByTime(5000);
    expect(reasons).toEqual(['timeout']);
  });

  it('starts again from the new duration when it changes', async () => {
    useClock();
    const toast = await mount();
    const reasons = listen(toast);
    vi.advanceTimersByTime(4000);
    toast.duration = 2000;
    await toast.updateComplete;
    vi.advanceTimersByTime(1999);
    expect(reasons).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(reasons).toEqual(['timeout']);
  });

  it('starts again from the new default when the variant changes', async () => {
    useClock();
    const toast = await mount();
    toast.variant = 'danger';
    await toast.updateComplete;
    expect(vi.getTimerCount()).toBe(0);
    toast.variant = 'success';
    await toast.updateComplete;
    expect(vi.getTimerCount()).toBe(1);
  });

  it('stops counting once it is removed, and starts again when it is put back', async () => {
    useClock();
    const toast = await mount();
    const reasons = listen(toast);
    const parent = toast.parentElement as HTMLElement;
    toast.remove();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(600_000);
    expect(reasons).toEqual([]);
    parent.append(toast);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(reasons).toEqual(['timeout']);
  });

  it('has no timer once dismissed, and adds no page listener when it needs no countdown', async () => {
    useClock();
    const add = vi.spyOn(document, 'addEventListener');
    await mount('variant="danger"');
    expect(add).not.toHaveBeenCalledWith('visibilitychange', expect.anything());
    const toast = await mount();
    expect(vi.getTimerCount()).toBe(1);
    toast.dismiss();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('listens for the page being hidden only while it counts down', async () => {
    useClock();
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const toast = await mount();
    const added = add.mock.calls.filter(([type]) => type === 'visibilitychange').length;
    expect(added).toBe(1);
    toast.remove();
    expect(remove.mock.calls.filter(([type]) => type === 'visibilitychange').length).toBe(1);
  });
});

describe('pausing', () => {
  it('waits while the pointer is over it, and resumes with the time that was left', async () => {
    useClock();
    const toast = await mount();
    const reasons = listen(toast);
    vi.advanceTimersByTime(3000);
    await userEvent.hover(toast);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(reasons).toEqual([]);
    await userEvent.unhover(document.body);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1999);
    expect(reasons).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(reasons).toEqual(['timeout']);
  });

  it('waits while focus is inside, and resumes when it leaves', async () => {
    useClock();
    const toast = await mount();
    const reasons = listen(toast);
    vi.advanceTimersByTime(1000);
    dismissButton(toast).focus();
    vi.advanceTimersByTime(60_000);
    expect(reasons).toEqual([]);
    dismissButton(toast).blur();
    vi.advanceTimersByTime(3999);
    expect(reasons).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(reasons).toEqual(['timeout']);
  });

  it('keeps waiting while focus moves between its own parts', async () => {
    useClock();
    const toast = await mount(
      'duration="1000"',
      'Saved',
      '<button slot="action" id="undo">Undo</button>',
    );
    await microtasks();
    dismissButton(toast).focus();
    (toast.querySelector('#undo') as HTMLElement).focus();
    vi.advanceTimersByTime(60_000);
    expect(vi.getTimerCount()).toBe(0);
    (toast.querySelector('#undo') as HTMLElement).blur();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('stays paused when the duration changes while the pointer is over it', async () => {
    useClock();
    const toast = await mount();
    await userEvent.hover(toast);
    toast.duration = 2000;
    await toast.updateComplete;
    expect(vi.getTimerCount()).toBe(0);
    await userEvent.unhover(document.body);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('stays paused when the duration changes while focus is inside', async () => {
    useClock();
    const toast = await mount();
    dismissButton(toast).focus();
    toast.duration = 2000;
    await toast.updateComplete;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps waiting for hover and focus both, until both are gone', async () => {
    useClock();
    const toast = await mount();
    await userEvent.hover(toast);
    dismissButton(toast).focus();
    await userEvent.unhover(document.body);
    expect(vi.getTimerCount()).toBe(0);
    dismissButton(toast).blur();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('waits while the document is hidden, and resumes when it is shown again', async () => {
    useClock();
    const toast = await mount();
    const reasons = listen(toast);
    vi.advanceTimersByTime(2000);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(60_000);
    expect(reasons).toEqual([]);
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000);
    expect(reasons).toEqual(['timeout']);
  });

  it('does not begin while the document is hidden', async () => {
    useClock();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    await mount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is not paused by a touch, which makes a pointer enter and leave at once', async () => {
    useClock();
    const toast = await mount();
    toast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    expect(vi.getTimerCount()).toBe(1);
  });

  it('is paused by a pen', async () => {
    useClock();
    const toast = await mount();
    toast.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'pen' }));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('forgets a hover when it is removed, since no pointerleave will come', async () => {
    useClock();
    const first = await mount();
    first.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    const parent = first.parentElement as HTMLElement;
    first.remove();
    expect(vi.getTimerCount()).toBe(0);
    parent.append(first);
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('what it says', () => {
  it('warns once when it has no text, and not when it has a heading or a message', async () => {
    await mount('', '');
    await mount('', '');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain('<punk-toast>');
    warn.mockClear();
    await mount('heading="Done"', '');
    await mount('', 'Saved');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once for one toast however often it updates', async () => {
    const toast = await mount('', '');
    toast.variant = 'success';
    await toast.updateComplete;
    toast.variant = 'info';
    await toast.updateComplete;
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('appearance', () => {
  const silhouette = (toast: Element) => {
    const style = getComputedStyle(toast.shadowRoot?.querySelector('.shape') as Element);
    return JSON.stringify([
      style.clipPath,
      style.borderTopLeftRadius,
      style.backgroundColor === 'rgba(0, 0, 0, 0)',
    ]);
  };

  it('gives every variant its own shape, which stays apart once every color is gone', async () => {
    const found = new Set<string>();
    for (const variant of variants) found.add(silhouette(await mount(`variant="${variant}"`)));
    expect(found.size).toBe(variants.length);
  });

  it('keeps them apart under forced colors', async () => {
    await commands.setForcedColors('active');
    const found = new Set<string>();
    for (const variant of variants) found.add(silhouette(await mount(`variant="${variant}"`)));
    expect(found.size).toBe(variants.length);
  });

  it('draws an unknown variant as info', async () => {
    expect(silhouette(await mount('variant="broken"'))).toBe(
      silhouette(await mount('variant="info"')),
    );
  });

  it('draws the text in the text color for every variant, never in the variant color', async () => {
    const text = rgb(
      getComputedStyle(document.documentElement).getPropertyValue('--punk-color-text').trim(),
    );
    for (const variant of variants) {
      const toast = await mount(`variant="${variant}" heading="Heading"`);
      expect(getComputedStyle(part(toast, 'toast')).color, variant).toBe(text);
      expect(getComputedStyle(part(toast, 'heading')).color, variant).toBe(text);
    }
  });

  it('puts the shape in an inset lens, and draws a plain border under forced colors', async () => {
    await commands.setForcedColors('active');
    const toast = await mount();
    expect(getComputedStyle(part(toast, 'toast')).borderTopStyle).toBe('solid');
    expect(getComputedStyle(part(toast, 'indicator')).borderTopStyle).toBe('solid');
  });

  it('still draws the dismiss glyph under forced colors', async () => {
    await commands.setForcedColors('active');
    const button = dismissButton(await mount());
    const glyph = button.querySelector('.glyph') as Element;
    // The glyph is a background, so it only shows when it is not the button's own face color.
    expect(getComputedStyle(glyph).backgroundColor).not.toBe(
      getComputedStyle(button).backgroundColor,
    );
  });

  it('wraps a long word, and has no horizontal scroll at 187px', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.style.inlineSize = '187px';
    wrapper.innerHTML =
      '<punk-toast heading="Überwachungsstation"><span>Fertigungsgeschwindigkeitsüberschreitung</span></punk-toast>';
    const toast = wrapper.querySelector('punk-toast') as PunkToast;
    await toast.updateComplete;
    expect(toast.getBoundingClientRect().width).toBeLessThanOrEqual(187);
    expect(part(toast, 'toast').scrollWidth).toBeLessThanOrEqual(part(toast, 'toast').clientWidth);
  });

  it('keeps the dismiss button reachable beside a long message', async () => {
    const toast = await mount(
      '',
      'A message long enough to wrap onto several lines of text in a narrow toast',
    );
    const button = dismissButton(toast).getBoundingClientRect();
    const surface = part(toast, 'toast').getBoundingClientRect();
    expect(button.right).toBeLessThanOrEqual(surface.right);
    expect(button.width).toBeGreaterThan(0);
  });
});
