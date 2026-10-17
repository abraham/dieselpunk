import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { AlertVariant, PunkAlert } from './index.ts';

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
  await setLocale('en');
});

const variants: AlertVariant[] = ['info', 'success', 'warning', 'danger'];

async function mount(attributes = '', content = 'Belt 3 is blocked.'): Promise<PunkAlert> {
  const wrapper = track(document.createElement('div'));
  wrapper.innerHTML = `<punk-alert ${attributes}>${content}</punk-alert>`;
  const element = wrapper.firstElementChild as PunkAlert;
  await element.updateComplete;
  return element;
}

const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const shape = (element: Element) => element.shadowRoot?.querySelector('.shape') as HTMLElement;
const silhouette = (element: Element) => {
  const style = getComputedStyle(shape(element));
  return JSON.stringify([style.clipPath, style.borderTopLeftRadius]);
};

describe('variants', () => {
  it('gives each variant its own shape, also under forced colors', async () => {
    for (const forced of [false, true]) {
      if (forced) await commands.setForcedColors('active');
      const found = new Set<string>();
      for (const variant of variants) found.add(silhouette(await mount(`variant="${variant}"`)));
      expect(found.size).toBe(variants.length);
    }
    expect(getComputedStyle(part(await mount(), 'alert')).borderTopStyle).toBe('solid');
  });

  it('uses info for an unknown variant, and hides the shape from assistive technology', async () => {
    const element = await mount('variant="broken"');
    expect(silhouette(element)).toBe(silhouette(await mount('variant="info"')));
    expect(part(element, 'indicator').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('announcing', () => {
  it('has no role unless it announces, and then alert or status by variant', async () => {
    const element = await mount('variant="danger"');
    expect(element.hasAttribute('role')).toBe(false);
    element.announce = true;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('alert');
    element.variant = 'success';
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('status');
    element.removeAttribute('announce');
    await element.updateComplete;
    expect(element.hasAttribute('role')).toBe(false);
  });

  it('gives back a role the author set', async () => {
    const element = await mount('role="note" announce');
    expect(element.getAttribute('role')).toBe('status');
    element.announce = false;
    await element.updateComplete;
    expect(element.getAttribute('role')).toBe('note');
  });
});

describe('content', () => {
  it('shows the heading and actions only when they have content', async () => {
    const plain = await mount();
    expect(part(plain, 'heading').hidden).toBe(true);
    expect(part(plain, 'actions').hidden).toBe(true);
    const full = await mount(
      'heading="Belt blocked"',
      'Clear it.<button slot="actions">Open belt</button>',
    );
    expect(part(full, 'heading').hidden).toBe(false);
    expect(part(full, 'heading').textContent).toBe('Belt blocked');
    expect(part(full, 'actions').hidden).toBe(false);
  });

  it('warns once when it has neither text nor heading', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('', '');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('<punk-alert> It has no text');
    element.heading = 'Belt blocked';
    await element.updateComplete;
    await mount('heading="Only a heading"', '');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('dismissing', () => {
  it('has a localized dismiss button only while dismissible', async () => {
    const element = await mount();
    expect(part(element, 'dismiss-button')).toBeNull();
    element.dismissible = true;
    await element.updateComplete;
    expect(page.getByRole('button', { name: 'Dismiss' }).element()).toBe(
      part(element, 'dismiss-button'),
    );
    await setLocale('de');
    await element.updateComplete;
    expect(part(element, 'dismiss-button').getAttribute('aria-label')).toBe('Schließen');
  });

  it('sends punk-dismiss with the user reason, then hides', async () => {
    const element = await mount('dismissible');
    const reasons: string[] = [];
    element.addEventListener('punk-dismiss', (event) => reasons.push(event.detail.reason));
    await userEvent.click(part(element, 'dismiss-button'));
    expect(reasons).toEqual(['user']);
    expect(element.hidden).toBe(true);
    expect(element.getBoundingClientRect().height).toBe(0);
  });

  it('stays when the event is cancelled, and reports method for dismiss()', async () => {
    const element = await mount('dismissible');
    const reasons: string[] = [];
    element.addEventListener('punk-dismiss', (event) => {
      reasons.push(event.detail.reason);
      event.preventDefault();
    });
    element.dismiss();
    expect(reasons).toEqual(['method']);
    expect(element.hidden).toBe(false);
  });
});
