import { commands, page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import { themeNames } from '../../tokens/themes.ts';
import './register.ts';
import type { PunkStep, PunkSteps } from './index.ts';

afterEach(async () => {
  cleanup();
  await setLocale('en');
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const three =
  '<punk-step>Drivers</punk-step><punk-step>Network</punk-step><punk-step>Account</punk-step>';

async function mount(attributes = '', content = three, parent?: HTMLElement): Promise<PunkSteps> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-steps ${attributes}>${content}</punk-steps>`);
  const element = wrapper.lastElementChild as PunkSteps;
  await settle(element);
  return element;
}

async function settle(element: PunkSteps): Promise<void> {
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve));
  await Promise.all([...element.children].map((step) => (step as PunkStep).updateComplete));
}

const steps = (element: PunkSteps) => [...element.querySelectorAll('punk-step')];
const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
/** What a screen reader would hear of each step: its text and its hidden word. */
const spoken = (step: Element) =>
  `${step.textContent} ${step.shadowRoot?.querySelector('.visually-hidden')?.textContent?.trim() ?? ''}`.trim();
const states = (element: PunkSteps) =>
  steps(element).map(
    (step) => (part(step, 'marker').className.match(/complete|current|upcoming/) ?? [''])[0],
  );

describe('semantics', () => {
  it('is an ordered list named Steps, of list items', async () => {
    const element = await mount();
    const list = part(element, 'list');
    expect(list.localName).toBe('ol');
    expect(list.getAttribute('aria-label')).toBe('Steps');
    expect(steps(element).every((step) => step.getAttribute('role') === 'listitem')).toBe(true);
    expect(page.getByRole('list', { name: 'Steps' }).element()).toBe(list);
    expect(page.getByRole('listitem').elements()).toHaveLength(3);
  });

  it('takes label as the name', async () => {
    const element = await mount('label="Setup"');
    expect(part(element, 'list').getAttribute('aria-label')).toBe('Setup');
  });

  it('marks the current step, and says a word for the others', async () => {
    const element = await mount('current="2"');
    const [first, second, third] = steps(element) as [PunkStep, PunkStep, PunkStep];
    expect(second.getAttribute('aria-current')).toBe('step');
    expect(first.hasAttribute('aria-current')).toBe(false);
    expect(spoken(first)).toBe('Drivers completed');
    expect(spoken(second)).toBe('Network');
    expect(spoken(third)).toBe('Account not started');
    for (const step of steps(element)) {
      expect(part(step, 'marker').getAttribute('aria-hidden')).toBe('true');
      expect(part(step, 'connector')?.getAttribute('aria-hidden') ?? 'true').toBe('true');
    }
  });

  it('says its words in the page locale, and changes with it', async () => {
    const element = await mount('current="2"');
    await setLocale('de');
    await vi.waitFor(() =>
      expect(spoken(steps(element)[0] as PunkStep)).toBe('Drivers abgeschlossen'),
    );
    expect(part(element, 'list').getAttribute('aria-label')).toBe('Schritte');
    await setLocale('en');
    await vi.waitFor(() => expect(spoken(steps(element)[0] as PunkStep)).toBe('Drivers completed'));
  });
});

describe('current', () => {
  it('starts at the first step, and follows current both ways', async () => {
    const element = await mount();
    expect(element.current).toBe(1);
    expect(states(element)).toEqual(['current', 'upcoming', 'upcoming']);
    element.current = 3;
    await settle(element);
    expect(states(element)).toEqual(['complete', 'complete', 'current']);
    expect(element.getAttribute('current')).toBe('3');
    element.setAttribute('current', '2');
    await settle(element);
    expect(states(element)).toEqual(['complete', 'current', 'upcoming']);
  });

  it('has no current step before the first or past the last', async () => {
    const before = await mount('current="0"');
    expect(states(before)).toEqual(['upcoming', 'upcoming', 'upcoming']);
    const done = await mount('current="4"');
    expect(states(done)).toEqual(['complete', 'complete', 'complete']);
    expect(steps(done).some((step) => step.hasAttribute('aria-current'))).toBe(false);
  });

  it('numbers the steps for the page language, and draws a check for a completed one', async () => {
    const holder = track(document.createElement('div'));
    holder.lang = 'ar-EG';
    const element = await mount('current="2"', three, holder);
    const [first, second, third] = steps(element).map((step) => part(step, 'marker'));
    expect(first?.querySelector('.check')).toBeTruthy();
    expect(first?.textContent?.trim()).toBe('');
    expect(second?.textContent?.trim()).toBe('٢');
    expect(third?.textContent?.trim()).toBe('٣');
  });

  it('places a step that is added, and lets go of one that leaves', async () => {
    const element = await mount('current="2"');
    const added = document.createElement('punk-step');
    added.textContent = 'Welcome';
    element.prepend(added);
    await settle(element);
    expect(states(element)).toEqual(['complete', 'current', 'upcoming', 'upcoming']);
    const leaving = steps(element)[1] as PunkStep;
    leaving.remove();
    await settle(element);
    await leaving.updateComplete;
    expect(leaving.hasAttribute('aria-current')).toBe(false);
    expect(states(element)).toEqual(['complete', 'current', 'upcoming']);
  });
});

describe('appearance', () => {
  it('keeps the states apart without color', async () => {
    await commands.setForcedColors('active');
    const element = await mount('current="2"');
    const [complete, current, upcoming] = steps(element).map((step) =>
      getComputedStyle(part(step, 'marker')),
    ) as [CSSStyleDeclaration, CSSStyleDeclaration, CSSStyleDeclaration];
    expect(complete.backgroundColor).not.toBe(upcoming.backgroundColor);
    expect(parseFloat(current.borderTopWidth)).toBeGreaterThan(parseFloat(upcoming.borderTopWidth));
    const labels = steps(element).map((step) => getComputedStyle(part(step, 'label')).fontWeight);
    expect(Number(labels[1])).toBeGreaterThan(Number(labels[2]));
  });

  it('draws a connector before every step but the first, and none outside the steps', async () => {
    const element = await mount();
    const [first, second] = steps(element).map((step) => part(step, 'connector'));
    expect(first).toBeNull();
    expect(getComputedStyle(second as HTMLElement).display).not.toBe('none');
    const holder = track(document.createElement('div'));
    holder.innerHTML = '<punk-step>Alone</punk-step>';
    const alone = holder.firstElementChild as PunkStep;
    await alone.updateComplete;
    expect(part(alone, 'connector')).toBeNull();
  });

  it('wraps onto more lines inside a narrow container, in every theme', async () => {
    addStylesheets();
    for (const theme of themeNames) {
      const holder = track(document.createElement('div'));
      holder.setAttribute('data-punk-theme', theme);
      holder.style.inlineSize = '187px';
      await mount(
        'current="2"',
        `${three}<punk-step>Zwischenproduktverarbeitungsanlage</punk-step>`,
        holder,
      );
      expect(holder.scrollWidth, theme).toBeLessThanOrEqual(188);
    }
  });
});

describe('warnings', () => {
  it('warns once about a child that is not a step', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const element = await mount('', `${three}<div>Extra</div>`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      '<punk-steps> It contains elements that are not `punk-step`.',
    );
    element.current = 2;
    await settle(element);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
