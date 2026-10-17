import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkDrawer } from './index.ts';

beforeEach(() => {
  addStylesheets();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  document.documentElement.style.removeProperty('overflow');
  vi.restoreAllMocks();
  await setLocale('en');
});

async function mount(attributes = 'heading="Filters" modal', dir = 'ltr') {
  const holder = track(document.createElement('div'));
  holder.dir = dir;
  holder.innerHTML = `<button id="opener">Open</button><punk-drawer ${attributes}><button id="first">Apply</button></punk-drawer>`;
  const element = holder.querySelector('punk-drawer') as PunkDrawer;
  await element.updateComplete;
  return { holder, element, opener: holder.querySelector('#opener') as HTMLButtonElement };
}

async function open(attributes?: string, dir?: string) {
  const mounted = await mount(attributes, dir);
  mounted.opener.focus();
  mounted.element.open = true;
  await mounted.element.updateComplete;
  // Measurements wait for the slide to end.
  await Promise.all(
    dialogOf(mounted.element)
      .getAnimations()
      .map((animation) => animation.finished),
  );
  return mounted;
}

const dialogOf = (element: PunkDrawer) =>
  element.shadowRoot?.querySelector('dialog') as HTMLDialogElement;

describe('drawer', () => {
  it('is a closed dialog until opened, then a modal dialog named by its heading', async () => {
    const { element } = await mount();
    expect(getComputedStyle(dialogOf(element)).display).toBe('none');
    element.show();
    await element.updateComplete;
    expect(dialogOf(element).matches(':modal')).toBe(true);
    expect(page.getByRole('dialog', { name: 'Filters' }).element()).toBe(dialogOf(element));
  });

  it('stays beside the page without modal', async () => {
    const { element } = await open('heading="Filters"');
    expect(dialogOf(element).open).toBe(true);
    expect(dialogOf(element).matches(':modal')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('starts focus on content, closes on Escape and its button, and gives focus back', async () => {
    const { element, opener } = await open();
    const reasons: string[] = [];
    element.addEventListener('punk-close', (event) => reasons.push(event.detail.reason));
    expect(document.activeElement).toBe(element.querySelector('#first'));
    await userEvent.keyboard('{Escape}');
    await element.updateComplete;
    expect(element.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    element.open = true;
    await element.updateComplete;
    await userEvent.click(page.getByRole('button', { name: 'Close' }));
    await element.updateComplete;
    element.open = true;
    await element.updateComplete;
    element.close();
    await element.updateComplete;
    expect(reasons).toEqual(['escape', 'close-button', 'method']);
  });

  it('names its close button in the current locale', async () => {
    const { element } = await open();
    await setLocale('de');
    await element.updateComplete;
    const button = element.shadowRoot?.querySelector('[part="close-button"]') as HTMLElement;
    expect(button.getAttribute('aria-label')).toBe('Schließen');
  });

  for (const dir of ['ltr', 'rtl']) {
    it(`sits against the start or end edge, following ${dir}`, async () => {
      const width = document.documentElement.clientWidth;
      const start = dialogOf(
        (await open('heading="Filters" modal', dir)).element,
      ).getBoundingClientRect();
      cleanup();
      addStylesheets();
      const end = dialogOf(
        (await open('heading="Filters" modal placement="end"', dir)).element,
      ).getBoundingClientRect();
      if (dir === 'ltr') {
        expect(start.left).toBeCloseTo(0, 0);
        expect(end.right).toBeCloseTo(width, 0);
      } else {
        expect(start.right).toBeCloseTo(width, 0);
        expect(end.left).toBeCloseTo(0, 0);
      }
    });
  }

  it('spans the width at the top and bottom, and takes its size from the property', async () => {
    const { element } = await open(
      'heading="Filters" modal placement="bottom" style="--punk-drawer-size: 200px"',
    );
    const box = dialogOf(element).getBoundingClientRect();
    expect(box.width).toBeCloseTo(document.documentElement.clientWidth, 0);
    expect(box.height).toBeCloseTo(200, 0);
    expect(box.bottom).toBeCloseTo(document.documentElement.clientHeight, 0);
  });

  it('slides in, with an unknown placement as start', async () => {
    const { element } = await mount('heading="Filters" modal placement="sideways"');
    element.open = true;
    await element.updateComplete;
    expect(getComputedStyle(dialogOf(element)).animationName).toBe('punk-drawer-in');
    await Promise.all(
      dialogOf(element)
        .getAnimations()
        .map((animation) => animation.finished),
    );
    expect(dialogOf(element).getBoundingClientRect().left).toBeCloseTo(0, 0);
  });

  it('warns when it has no name', async () => {
    const warn = vi.mocked(console.warn);
    warn.mockClear();
    await open('modal');
    expect(warn).toHaveBeenCalledWith(
      '<punk-drawer> It has no name. Set `heading`, or `aria-label`.',
    );
  });
});
