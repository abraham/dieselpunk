import { userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import '../../src/components/button/register.ts';
import '../../src/components/tooltip/register.ts';
import '../../src/components/window/register.ts';
import '../../src/components/dialog/register.ts';
import '../../src/components/popover/register.ts';
import type { PunkDialog } from '../../src/components/dialog/index.ts';
import type { PunkPopover } from '../../src/components/popover/index.ts';
import type { PunkWindow } from '../../src/components/window/index.ts';
import { overlayStack } from '../../src/internal/overlays.ts';

beforeEach(addStylesheets);

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('overflow');
});

type Overlay = PunkWindow | PunkDialog;

async function overlay(markup: string): Promise<Overlay> {
  const holder = track(document.createElement('div'));
  holder.innerHTML = markup;
  const element = holder.firstElementChild as Overlay;
  await element.updateComplete;
  return element;
}

const modalWindow = (extra = '') =>
  overlay(
    `<punk-window heading="W" modal dismissible ${extra}><button class="inside">Inside</button></punk-window>`,
  );
const dialog = (extra = '') =>
  overlay(`<punk-dialog heading="D" ${extra}><button class="inside">Inside</button></punk-dialog>`);

const show = async (element: Overlay) => {
  element.show();
  await element.updateComplete;
};

const deepActive = (): Element | null => {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
};

describe.each([
  ['a modal window', modalWindow],
  ['a dialog', dialog],
] as const)('%s', (_label, make) => {
  it('makes the rest of the page inert', async () => {
    const outside = track(document.createElement('button'));
    outside.textContent = 'Outside';
    const element = await make();
    await show(element);
    outside.focus();
    expect(document.activeElement).not.toBe(outside);
    expect(element.querySelector('.inside')).toBe(document.activeElement);
  });

  it('keeps Tab and Shift+Tab inside', async () => {
    const outside = track(document.createElement('button'));
    outside.textContent = 'Outside';
    const element = await make();
    await show(element);
    for (let press = 0; press < 4; press++) {
      await userEvent.tab();
      expect(document.activeElement).not.toBe(outside);
    }
    for (let press = 0; press < 4; press++) {
      await userEvent.tab({ shift: true });
      expect(document.activeElement).not.toBe(outside);
    }
  });

  it('returns focus to the opener, even after the opener has moved in the page', async () => {
    const first = track(document.createElement('div'));
    const second = track(document.createElement('div'));
    const opener = first.appendChild(document.createElement('button'));
    opener.textContent = 'Open';
    opener.focus();
    const element = await make();
    await show(element);
    second.append(opener);
    element.close();
    expect(document.activeElement).toBe(opener);
  });

  it('puts focus on the page when the opener was removed', async () => {
    const opener = track(document.createElement('button'));
    opener.textContent = 'Open';
    opener.focus();
    const element = await make();
    await show(element);
    opener.remove();
    element.close();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('the scroll lock', () => {
  it('counts, so modals closed in either order leave the page as the author had it', async () => {
    for (const order of [
      [0, 1],
      [1, 0],
    ] as const) {
      document.documentElement.style.overflow = 'scroll';
      const overlays = [await modalWindow(), await dialog()];
      for (const element of overlays) await show(element);
      expect(document.documentElement.style.overflow).toBe('hidden');
      overlays[order[0]]?.close();
      expect(document.documentElement.style.overflow).toBe('hidden');
      overlays[order[1]]?.close();
      expect(document.documentElement.style.overflow).toBe('scroll');
      cleanup();
    }
  });

  it('is not taken by a window that is not modal', async () => {
    const element = await overlay('<punk-window heading="W"><button>Go</button></punk-window>');
    await show(element);
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('Escape closes only the topmost', () => {
  it('closes a tooltip before the window it is in, and the window after', async () => {
    const element = (await overlay(
      `<punk-window heading="W" modal dismissible>
         <punk-button id="anchor">Anchor</punk-button>
         <punk-tooltip for="anchor">Tip</punk-tooltip>
       </punk-window>`,
    )) as PunkWindow;
    await show(element);
    const tooltip = element.querySelector('punk-tooltip') as HTMLElement & {
      show(): void;
      open: boolean;
    };
    tooltip.show();
    await userEvent.keyboard('{Escape}');
    expect(element.open).toBe(true);
    expect(tooltip.hasAttribute('open')).toBe(false);
    await userEvent.keyboard('{Escape}');
    expect(element.open).toBe(false);
  });

  it('closes a tooltip over a popover over a window, then each in turn', async () => {
    const element = (await overlay(
      `<punk-window heading="W" modal dismissible>
         <button id="trigger">Menu</button>
         <punk-popover>
           <punk-button id="anchor">Anchor</punk-button>
           <punk-tooltip for="anchor">Tip</punk-tooltip>
         </punk-popover>
       </punk-window>`,
    )) as PunkWindow;
    await show(element);
    const popover = element.querySelector('punk-popover') as PunkPopover;
    popover.show();
    await popover.updateComplete;
    const tooltip = element.querySelector('punk-tooltip') as HTMLElement & { show(): void };
    tooltip.show();
    await userEvent.keyboard('{Escape}');
    expect([element.open, popover.open, tooltip.hasAttribute('open')]).toEqual([true, true, false]);
    await userEvent.keyboard('{Escape}');
    expect([element.open, popover.open]).toEqual([true, false]);
    await userEvent.keyboard('{Escape}');
    expect(element.open).toBe(false);
  });

  it('closes a popover over a window that is not dismissible only with its own Escape', async () => {
    const element = (await overlay(
      '<punk-window heading="W" modal><button id="trigger">Menu</button><punk-popover><p>Text</p></punk-popover></punk-window>',
    )) as PunkWindow;
    await show(element);
    const popover = element.querySelector('punk-popover') as PunkPopover;
    popover.show();
    await popover.updateComplete;
    await userEvent.keyboard('{Escape}');
    expect([element.open, popover.open]).toEqual([true, false]);
    await userEvent.keyboard('{Escape}');
    expect(element.open).toBe(true);
  });

  it('closes a dialog that opened over a window, then the window', async () => {
    const lower = (await modalWindow()) as PunkWindow;
    await show(lower);
    const upper = (await dialog()) as PunkDialog;
    await show(upper);
    await userEvent.keyboard('{Escape}');
    expect([lower.open, upper.open]).toEqual([true, false]);
    await userEvent.keyboard('{Escape}');
    expect(lower.open).toBe(false);
  });

  it('is absorbed by a persistent dialog, so the window beneath stays open', async () => {
    const lower = (await modalWindow()) as PunkWindow;
    await show(lower);
    const upper = (await dialog('persistent')) as PunkDialog;
    await show(upper);
    await userEvent.keyboard('{Escape}{Escape}');
    expect([lower.open, upper.open]).toEqual([true, true]);
    upper.close();
    await userEvent.keyboard('{Escape}');
    expect(lower.open).toBe(false);
  });

  it('is absorbed by a window that is not dismissible', async () => {
    const lower = (await modalWindow()) as PunkWindow;
    await show(lower);
    const upper = (await overlay(
      '<punk-window heading="U" modal><button>Go</button></punk-window>',
    )) as PunkWindow;
    await show(upper);
    await userEvent.keyboard('{Escape}');
    expect([lower.open, upper.open]).toEqual([true, true]);
  });

  it('leaves no listener behind once everything is closed', async () => {
    const lower = (await modalWindow()) as PunkWindow;
    const upper = (await dialog()) as PunkDialog;
    await show(lower);
    await show(upper);
    expect(overlayStack.size).toBe(2);
    upper.close();
    lower.close();
    expect(overlayStack.size).toBe(0);
  });
});

describe('a popover inside a modal window', () => {
  it('opens from its trigger, can be used, and returns focus to the trigger when it closes', async () => {
    const element = (await overlay(
      `<punk-window heading="W" modal dismissible>
         <button id="trigger">Menu</button>
         <punk-popover mode="menu"><button role="menuitem" id="item">Item</button></punk-popover>
       </punk-window>`,
    )) as PunkWindow;
    await show(element);
    const trigger = element.querySelector('#trigger') as HTMLElement;
    const popover = element.querySelector('punk-popover') as PunkPopover;
    await userEvent.click(trigger);
    await popover.updateComplete;
    expect(popover.open).toBe(true);
    expect(document.activeElement?.id).toBe('item');
    await userEvent.keyboard('{Escape}');
    expect(popover.open).toBe(false);
    expect(element.open).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });
});

describe('a backdrop click', () => {
  it('closes neither a modal window nor a dialog', async () => {
    const windowElement = (await modalWindow()) as PunkWindow;
    await show(windowElement);
    windowElement.shadowRoot?.querySelector('dialog')?.click();
    expect(windowElement.open).toBe(true);
    windowElement.close();
    const dialogElement = (await dialog()) as PunkDialog;
    await show(dialogElement);
    dialogElement.shadowRoot?.querySelector('dialog')?.click();
    expect(dialogElement.open).toBe(true);
    expect(deepActive()).toBeTruthy();
  });
});
