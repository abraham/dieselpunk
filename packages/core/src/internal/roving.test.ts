import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import '../components/button/register.ts';
import type { PunkButton } from '../components/button/index.ts';
import { RovingController, itemDisabled } from './roving.ts';
import type { RovingOptions } from './roving.ts';

afterEach(cleanup);

function group(markup: string, attributes: Record<string, string> = {}) {
  const host = track(document.createElement('div'));
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  host.innerHTML = markup;
  const items = (): HTMLElement[] =>
    [...host.children].filter((child): child is HTMLElement =>
      child.matches('button, punk-button'),
    );
  const roving = (options: Partial<RovingOptions> = {}) =>
    new RovingController({ host, items, ...options });
  return { host, items, roving };
}

const tabindexes = (items: HTMLElement[]) => items.map((item) => item.getAttribute('tabindex'));
const buttons = '<button>One</button><button>Two</button><button>Three</button>';

describe('RovingController', () => {
  it('makes the first item the only tab stop, and gives tabindex back when disconnected', () => {
    const { items, roving } = group(
      '<button tabindex="0">One</button><button>Two</button><button>Three</button>',
    );
    const controller = roving();
    controller.connect();
    expect(tabindexes(items())).toEqual(['0', '-1', '-1']);
    controller.disconnect();
    expect(tabindexes(items())).toEqual(['0', null, null]);
  });

  it('moves focus and the tab stop with the arrow keys, and does not wrap', async () => {
    const { items, roving } = group(buttons);
    roving().connect();
    const [one, two, three] = items() as [HTMLElement, HTMLElement, HTMLElement];
    one.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(two);
    expect(tabindexes(items())).toEqual(['-1', '0', '-1']);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(three);
    await userEvent.keyboard('{ArrowLeft}{Home}{ArrowLeft}');
    expect(document.activeElement).toBe(one);
    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(three);
  });

  it('swaps the horizontal arrows on a right-to-left page', async () => {
    const { items, roving } = group(buttons, { dir: 'rtl' });
    roving().connect();
    const [one, two] = items() as [HTMLElement, HTMLElement];
    one.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(two);
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(one);
  });

  it('uses the vertical arrows for a vertical group', async () => {
    const { items, roving } = group(buttons);
    roving({ orientation: () => 'vertical' }).connect();
    const [one, two] = items() as [HTMLElement, HTMLElement];
    one.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(one);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(two);
  });

  it('skips disabled items, and moves the tab stop off one that becomes disabled', async () => {
    const { items, roving } = group(
      '<button>One</button><button disabled>Two</button><button>Three</button>',
    );
    const controller = roving();
    controller.connect();
    const [one, two, three] = items() as [HTMLElement, HTMLElement, HTMLElement];
    expect(tabindexes(items())).toEqual(['0', '-1', '-1']);
    one.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(three);
    (three as HTMLButtonElement).disabled = true;
    (two as HTMLButtonElement).disabled = false;
    controller.refresh();
    expect(controller.current).toBe(one);
    expect(tabindexes(items())).toEqual(['0', '-1', '-1']);
  });

  it('makes an item the tab stop when it gets focus another way', () => {
    const { items, roving } = group(buttons);
    roving().connect();
    (items()[2] as HTMLElement).focus();
    expect(tabindexes(items())).toEqual(['-1', '-1', '0']);
  });

  it('ignores keys with a modifier, keys already handled, and keys from outside the items', async () => {
    const { host, items, roving } = group(`${buttons}<input />`);
    roving().connect();
    const [one] = items() as [HTMLElement];
    one.focus();
    await userEvent.keyboard('{Control>}{ArrowRight}{/Control}');
    expect(document.activeElement).toBe(one);
    (host.querySelector('input') as HTMLInputElement).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(host.querySelector('input'));
  });

  it('manages a punk-button through its protocol, on the inner button', async () => {
    const { host, items, roving } = group(
      '<punk-button>One</punk-button><punk-button>Two</punk-button>',
    );
    const [one, two] = items() as [PunkButton, PunkButton];
    await Promise.all([one.updateComplete, two.updateComplete]);
    const inner = (button: PunkButton) =>
      button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    const controller = roving();
    controller.connect();
    await Promise.all([one.updateComplete, two.updateComplete]);
    expect([inner(one).getAttribute('tabindex'), inner(two).getAttribute('tabindex')]).toEqual([
      '0',
      '-1',
    ]);
    inner(one).focus();
    await userEvent.keyboard('{ArrowRight}');
    await two.updateComplete;
    expect(two.matches(':focus-within')).toBe(true);
    expect(inner(two).getAttribute('tabindex')).toBe('0');
    expect(inner(one).getAttribute('tabindex')).toBe('-1');
    controller.disconnect();
    await Promise.all([one.updateComplete, two.updateComplete]);
    expect(inner(one).hasAttribute('tabindex')).toBe(false);
    expect(host.isConnected).toBe(true);
  });

  it('treats a disabled punk-button as disabled', async () => {
    const { items, roving } = group(
      '<punk-button>One</punk-button><punk-button disabled>Two</punk-button>',
    );
    const [, two] = items() as [PunkButton, PunkButton];
    await two.updateComplete;
    expect(two[itemDisabled]).toBe(true);
    expect('isDisabled' in two || 'setTabStop' in two || 'focusItem' in two).toBe(false);
    const controller = roving();
    controller.connect();
    expect(controller.current).toBe(items()[0]);
  });
});
