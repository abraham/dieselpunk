import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { overlayStack } from '../../internal/overlays.ts';
import './register.ts';
import type { PunkCloseDetail, PunkDialog } from './index.ts';

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
const body = '<p>Discard the run?</p><button id="keep">Keep</button>';

async function mount(attributes = 'heading="Confirm"', content = body, parent?: Element) {
  const element = document.createElement('punk-dialog');
  for (const match of attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
    element.setAttribute(match[1] as string, match[2] ?? '');
  }
  element.innerHTML = content;
  track(element, parent);
  await element.updateComplete;
  return element;
}

async function open(attributes?: string, content?: string) {
  const element = await mount(attributes, content);
  element.open = true;
  await element.updateComplete;
  return element;
}

const dialogOf = (element: PunkDialog) =>
  element.shadowRoot?.querySelector('dialog') as HTMLDialogElement;
const deepActive = (): Element | null => {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
};
const events = (element: PunkDialog) => {
  const opened = vi.fn();
  const closed = vi.fn<(detail: PunkCloseDetail) => void>();
  element.addEventListener('punk-open', opened);
  element.addEventListener('punk-close', (event) => closed(event.detail));
  return { opened, closed };
};

describe('structure', () => {
  it('is a closed dialog that shows nothing until it is opened', async () => {
    const element = await mount();
    const dialog = dialogOf(element);
    expect(dialog.open).toBe(false);
    expect(getComputedStyle(dialog).display).toBe('none');
    element.open = true;
    await element.updateComplete;
    expect(dialog.open).toBe(true);
    expect(getComputedStyle(dialog).display).not.toBe('none');
  });

  it('is a modal dialog named by its heading', async () => {
    const element = await open();
    const dialog = dialogOf(element);
    expect(dialog.matches(':modal')).toBe(true);
    const title = element.shadowRoot?.getElementById(dialog.getAttribute('aria-labelledby') ?? '');
    expect(title?.textContent?.trim()).toBe('Confirm');
    expect(dialog.hasAttribute('role')).toBe(false);
  });

  it('is an alertdialog described by its content with `alert`', async () => {
    const element = await open('heading="Confirm" alert');
    const dialog = dialogOf(element);
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(element.shadowRoot?.getElementById(dialog.getAttribute('aria-describedby') ?? '')).toBe(
      element.shadowRoot?.querySelector('[part="body"]'),
    );
  });

  it('is named by aria-label when it has no heading, and warns once when it has neither', async () => {
    const labeled = await open('aria-label="Confirm"');
    expect(dialogOf(labeled).getAttribute('aria-label')).toBe('Confirm');
    expect(warn).not.toHaveBeenCalled();
    const bare = await open('');
    bare.open = false;
    await bare.updateComplete;
    bare.open = true;
    await bare.updateComplete;
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('no name'))).toHaveLength(1);
  });

  it('hides the header without a heading and the footer without content', async () => {
    const element = await open('aria-label="x"');
    expect(element.shadowRoot?.querySelector<HTMLElement>('[part="header"]')?.hidden).toBe(true);
    expect(element.shadowRoot?.querySelector<HTMLElement>('[part="footer"]')?.hidden).toBe(true);
    const withFooter = await open('heading="x"', `${body}<button slot="footer">OK</button>`);
    await flush();
    await withFooter.updateComplete;
    expect(withFooter.shadowRoot?.querySelector<HTMLElement>('[part="footer"]')?.hidden).toBe(
      false,
    );
  });

  it('opens when `open` is there from the start', async () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = '<punk-dialog heading="Confirm" open><button>Go</button></punk-dialog>';
    const element = wrapper.querySelector('punk-dialog') as PunkDialog;
    await element.updateComplete;
    expect(dialogOf(element).open).toBe(true);
  });
});

describe('opening and closing', () => {
  it('sends punk-open once on opening, and punk-close once with the reason', async () => {
    const element = await mount();
    const { opened, closed } = events(element);
    element.show();
    await element.updateComplete;
    expect(opened).toHaveBeenCalledOnce();
    element.close();
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'method', returnValue: undefined });
    expect(element.open).toBe(false);
    await element.updateComplete;
    expect(closed).toHaveBeenCalledOnce();
  });

  it('closes with the reason method when `open` is cleared from code', async () => {
    const element = await open();
    const { closed } = events(element);
    element.open = false;
    await element.updateComplete;
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'method', returnValue: undefined });
    expect(dialogOf(element).open).toBe(false);
  });

  it('does nothing when it is opened or closed twice', async () => {
    const element = await mount();
    const { opened, closed } = events(element);
    element.show();
    element.show();
    await element.updateComplete;
    element.close();
    element.close();
    expect(opened).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('stays open when it is opened again before the platform reports the last close', async () => {
    const element = await open();
    const { closed } = events(element);
    element.close();
    element.show();
    await element.updateComplete;
    // The <dialog>'s close event for the first closing arrives a task later.
    await flush();
    await flush();
    expect([element.open, dialogOf(element).open]).toEqual([true, true]);
    expect(closed).toHaveBeenCalledOnce();
  });

  it('closes with the value of a data-punk-close element, reason action', async () => {
    const element = await open(
      'heading="Confirm"',
      `${body}<button slot="footer" data-punk-close="discard"><span id="inner">Discard</span></button>`,
    );
    const { closed } = events(element);
    await userEvent.click(element.querySelector('#inner') as HTMLElement);
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'action', returnValue: 'discard' });
    expect(element.returnValue).toBe('discard');
    expect(element.open).toBe(false);
  });

  it('reports the value given to close()', async () => {
    const element = await open();
    const { closed } = events(element);
    element.close('later');
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'method', returnValue: 'later' });
    expect(element.returnValue).toBe('later');
  });

  it('ignores clicks on elements without data-punk-close', async () => {
    const element = await open();
    const { closed } = events(element);
    await userEvent.click(element.querySelector('#keep') as HTMLElement);
    expect(closed).not.toHaveBeenCalled();
  });

  it('closes on Escape with the reason escape', async () => {
    const element = await open();
    const { closed } = events(element);
    await userEvent.keyboard('{Escape}');
    expect(closed).toHaveBeenCalledExactlyOnceWith({ reason: 'escape', returnValue: undefined });
    expect(element.open).toBe(false);
  });

  it('does not close on Escape when persistent, and keeps Escape from the page beneath', async () => {
    const element = await open('heading="Confirm" persistent');
    const { closed } = events(element);
    const page = vi.fn();
    document.addEventListener('keydown', page);
    await userEvent.keyboard('{Escape}');
    document.removeEventListener('keydown', page);
    expect(closed).not.toHaveBeenCalled();
    expect(element.open).toBe(true);
    expect(page).not.toHaveBeenCalled();
  });

  it('closes nothing when the backdrop is clicked', async () => {
    const element = await open();
    const { closed } = events(element);
    dialogOf(element).click();
    expect(closed).not.toHaveBeenCalled();
    expect(element.open).toBe(true);
  });
});

describe('modal behavior', () => {
  it('starts focus on the first content, and on the dialog itself when there is none', async () => {
    await open();
    expect(deepActive()?.id).toBe('keep');
    const empty = await open('heading="x" persistent', '<p>Text only</p>');
    expect(deepActive()).toBe(dialogOf(empty));
  });

  it('starts focus on an autofocus element in the footer', async () => {
    const element = await open(
      'heading="Confirm"',
      `${body}<button slot="footer" id="yes" autofocus>Yes</button>`,
    );
    expect(deepActive()).toBe(element.querySelector('#yes'));
  });

  it('gives focus back to what opened it', async () => {
    const opener = track(document.createElement('button'));
    opener.textContent = 'Open';
    opener.focus();
    const element = await open();
    element.close();
    expect(document.activeElement).toBe(opener);
  });

  it('traps Tab and Shift+Tab inside', async () => {
    const outside = track(document.createElement('button'));
    outside.textContent = 'Outside';
    const element = await open(
      'heading="Confirm"',
      '<button id="a">A</button><button id="b">B</button>',
    );
    expect(deepActive()?.id).toBe('a');
    await userEvent.tab();
    expect(deepActive()?.id).toBe('b');
    await userEvent.tab();
    expect(deepActive()).not.toBe(outside);
    await userEvent.tab({ shift: true });
    expect(deepActive()).not.toBe(outside);
    expect(element.open).toBe(true);
  });

  it('holds the scroll lock while open and gives back what the author set', async () => {
    document.documentElement.style.overflow = 'scroll';
    const element = await open();
    expect(document.documentElement.style.overflow).toBe('hidden');
    element.close();
    expect(document.documentElement.style.overflow).toBe('scroll');
  });

  it('adds one Escape listener while open and none after', async () => {
    expect(overlayStack.size).toBe(0);
    const element = await open();
    expect(overlayStack.size).toBe(1);
    element.close();
    expect(overlayStack.size).toBe(0);
  });

  it('lets go of the lock and the stack without events when it is removed while open', async () => {
    document.documentElement.style.overflow = 'auto';
    const element = await open();
    const { closed } = events(element);
    element.remove();
    expect(document.documentElement.style.overflow).toBe('auto');
    expect(overlayStack.size).toBe(0);
    expect(closed).not.toHaveBeenCalled();
  });

  it('opens again when it is put back while `open` is still set', async () => {
    const wrapper = track(document.createElement('div'));
    const element = await mount('heading="Confirm"', body, wrapper);
    element.open = true;
    await element.updateComplete;
    element.remove();
    wrapper.append(element);
    await element.updateComplete;
    expect(dialogOf(element).open).toBe(true);
    expect(overlayStack.size).toBe(1);
  });
});

describe('fallback without showModal', () => {
  it('is fixed above the page and still closes on Escape', async () => {
    const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      value: undefined,
      configurable: true,
    });
    try {
      const element = await open();
      const dialog = dialogOf(element);
      const style = getComputedStyle(dialog);
      expect([dialog.hasAttribute('data-fallback'), style.position, style.zIndex]).toEqual([
        true,
        'fixed',
        '1100',
      ]);
      await userEvent.keyboard('{Escape}');
      expect(element.open).toBe(false);
      expect(dialog.hasAttribute('open')).toBe(false);
    } finally {
      if (original) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original);
    }
  });
});

describe('layout', () => {
  it('stacks the footer actions at 480px and below, in order', async () => {
    const footer = '<button slot="footer">One</button><button slot="footer">Two</button>';
    const element = await open('heading="x"', body + footer);
    await flush();
    const direction = getComputedStyle(
      element.shadowRoot?.querySelector('[part="footer"]') as Element,
    ).flexDirection;
    expect(direction).toBe('column');
    const [one, two] = [...element.querySelectorAll('button[slot="footer"]')].map((button) =>
      button.getBoundingClientRect(),
    );
    expect(one?.width).toBe(two?.width);
    expect(two?.top).toBeGreaterThan(one?.top ?? 0);
  });

  it('is a focusable scroll region only while its content overflows', async () => {
    const element = await open(
      'heading="Confirm"',
      '<div style="block-size: 3000px">Tall</div><button>Go</button>',
    );
    await flush();
    await element.updateComplete;
    const bodyElement = element.shadowRoot?.querySelector('[part="body"]') as HTMLElement;
    expect([bodyElement.getAttribute('tabindex'), bodyElement.getAttribute('role')]).toEqual([
      '0',
      'region',
    ]);
    const short = await open('heading="Confirm"');
    await flush();
    await short.updateComplete;
    const shortBody = short.shadowRoot?.querySelector('[part="body"]') as HTMLElement;
    expect(shortBody.hasAttribute('tabindex')).toBe(false);
  });

  it('keeps a modal dialog inside the viewport', async () => {
    const element = await open('heading="Confirm"', '<div style="block-size: 3000px">Tall</div>');
    const rect = dialogOf(element).getBoundingClientRect();
    expect(rect.height).toBeLessThanOrEqual(document.documentElement.clientHeight);
    expect(rect.width).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  it('has no resize listener once closed', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const element = await open();
    element.close();
    const added = add.mock.calls.filter((call) => call[0] === 'resize').length;
    const removed = remove.mock.calls.filter((call) => call[0] === 'resize').length;
    expect(added).toBe(removed);
  });
});

describe('warnings', () => {
  it('warns once when it has nothing to focus and is not persistent, and not when persistent', async () => {
    const element = await open('heading="x"', '<p>Text only</p>');
    element.close();
    element.show();
    await element.updateComplete;
    expect(
      warn.mock.calls.filter((call) => String(call[0]).includes('nothing to focus')),
    ).toHaveLength(1);
    warn.mockClear();
    await open('heading="x" persistent', '<p>Text only</p>');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('appearance', () => {
  it('is a bordered box under forced colors', async () => {
    await commands.setForcedColors('active');
    const element = await open();
    const style = getComputedStyle(dialogOf(element));
    expect([style.borderTopStyle, style.borderTopWidth]).toEqual(['solid', '2px']);
  });
});
