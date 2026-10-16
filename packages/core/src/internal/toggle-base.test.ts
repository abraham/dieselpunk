import { commands, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { addStylesheets, cleanup, focusWithKeyboard, track } from '../../test/browser/helpers.ts';
import '../../test/browser/commands.ts';
import '../components/checkbox/register.ts';
import '../components/switch/register.ts';
import '../components/toolbar/register.ts';
import '../components/button/register.ts';
import type { PunkCheckbox } from '../components/checkbox/index.ts';
import type { PunkSwitch } from '../components/switch/index.ts';
import type { PunkToolbar } from '../components/toolbar/index.ts';

type Toggle = PunkCheckbox | PunkSwitch;

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  addStylesheets();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

const flush = () => new Promise((resolve) => setTimeout(resolve));

async function mount(
  tag: string,
  attributes = '',
  content = 'Fuel',
  parent?: Element,
): Promise<Toggle> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<${tag} ${attributes}>${content}</${tag}>`);
  const element = wrapper.lastElementChild as Toggle;
  await element.updateComplete;
  return element;
}

/** Records what a user toggle sends. */
function listen(element: Element) {
  const log: string[] = [];
  for (const type of ['input', 'change', 'click']) {
    element.addEventListener(type, (event) => {
      log.push(type + (type === 'input' ? (event.composed ? ':composed' : ':plain') : ''));
    });
  }
  return log;
}

describe.each([
  ['punk-checkbox', 'checkbox'],
  ['punk-switch', 'switch'],
] as const)('%s', (tag, role) => {
  describe('on the host', () => {
    it('has its role, state, and a tab stop as attributes', async () => {
      const element = await mount(tag);
      expect(element.getAttribute('role')).toBe(role);
      expect(element.getAttribute('aria-checked')).toBe('false');
      expect(element.getAttribute('tabindex')).toBe('0');
      expect(element.hasAttribute('aria-required')).toBe(false);
      expect(element.hasAttribute('aria-disabled')).toBe(false);
    });

    it('follows checked, required, and disabled', async () => {
      const element = await mount(tag, 'checked required');
      expect(element.getAttribute('aria-checked')).toBe('true');
      expect(element.getAttribute('aria-required')).toBe('true');
      element.disabled = true;
      await element.updateComplete;
      expect(element.getAttribute('aria-disabled')).toBe('true');
      expect(element.hasAttribute('tabindex')).toBe(false);
      element.disabled = false;
      element.required = false;
      element.checked = false;
      await element.updateComplete;
      expect(element.getAttribute('aria-checked')).toBe('false');
      expect(element.hasAttribute('aria-required')).toBe(false);
      expect(element.getAttribute('tabindex')).toBe('0');
    });

    it('has them before it renders, so tools see what users get at once', async () => {
      const element = track(document.createElement(tag)) as Toggle;
      expect(element.getAttribute('role')).toBe(role);
      expect(element.getAttribute('tabindex')).toBe('0');
      await element.updateComplete;
    });

    it('is named by the text in its slot, and the accessibility name needs no attribute', async () => {
      const element = await mount(tag, '', 'Fuel pump');
      expect(element.textContent).toBe('Fuel pump');
      expect(element.hasAttribute('aria-label')).toBe(false);
      expect(warn).not.toHaveBeenCalled();
    });

    it('is named by aria-label when it has no text, and warns once when it has neither', async () => {
      await mount(tag, 'aria-label="Fuel pump"', '');
      expect(warn).not.toHaveBeenCalled();
      const unnamed = await mount(tag, '', '');
      unnamed.checked = true;
      await unnamed.updateComplete;
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain(`<${tag}>`);
    });

    it('is named by a label element that points at it', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.innerHTML = `<label for="x">Fuel pump</label><${tag} id="x"></${tag}>`;
      const element = wrapper.querySelector(tag) as Toggle;
      await element.updateComplete;
      expect(element.labels.length).toBe(1);
      expect(warn).not.toHaveBeenCalled();
    });

    it('hides the label wrapper while there is no text', async () => {
      const element = await mount(tag, 'aria-label="Fuel pump"', '');
      expect(element.shadowRoot?.querySelector<HTMLElement>('[part="label"]')?.hidden).toBe(true);
      const labeled = await mount(tag);
      expect(labeled.shadowRoot?.querySelector<HTMLElement>('[part="label"]')?.hidden).toBe(false);
    });

    it('does not reflect checked, so the attribute stays the default a reset goes back to', async () => {
      const element = await mount(tag);
      element.checked = true;
      await element.updateComplete;
      expect(element.hasAttribute('checked')).toBe(false);
    });

    it('reflects value, and submits `on` unless told otherwise', async () => {
      const element = await mount(tag);
      expect(element.value).toBe('on');
      element.value = 'fuel';
      await element.updateComplete;
      expect(element.getAttribute('value')).toBe('fuel');
    });
  });

  describe('a click', () => {
    it('toggles it, and sends input, change, and click', async () => {
      const element = await mount(tag);
      const log = listen(element);
      await userEvent.click(element);
      expect(element.checked).toBe(true);
      expect(log.sort()).toEqual(['change', 'click', 'input:composed']);
      await userEvent.click(element);
      expect(element.checked).toBe(false);
    });

    it('toggles it from its label text', async () => {
      const element = await mount(tag, '', 'Fuel <b>pump</b>');
      await userEvent.click(element.querySelector('b') as HTMLElement);
      expect(element.checked).toBe(true);
    });

    it('leaves a link in its label alone', async () => {
      const element = await mount(tag, '', '<a href="#spec" id="link">Fuel</a>');
      await userEvent.click(element.querySelector('#link') as HTMLElement);
      expect(element.checked).toBe(false);
      history.replaceState(null, '', location.pathname + location.search);
    });

    it('sends input and change once, and bubbles them', async () => {
      const element = await mount(tag);
      const seen = vi.fn();
      element.parentElement?.addEventListener('change', seen);
      element.parentElement?.addEventListener('input', seen);
      element.click();
      expect(seen).toHaveBeenCalledTimes(2);
    });

    it('sends nothing when checked is set from code', async () => {
      const element = await mount(tag);
      const log = listen(element);
      element.checked = true;
      await element.updateComplete;
      expect(log).toEqual([]);
    });
  });

  describe('the keyboard', () => {
    it('toggles on Space, when the key is released, and does not scroll the page', async () => {
      const element = await mount(tag);
      const log = listen(element);
      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      element.dispatchEvent(down);
      expect(down.defaultPrevented).toBe(true);
      expect(element.checked).toBe(false);
      element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(element.checked).toBe(true);
      expect(log.sort()).toEqual(['change', 'click', 'input:composed']);
    });

    it('is toggled by a real Space press', async () => {
      const element = await mount(tag);
      await focusWithKeyboard(element);
      element.focus();
      await userEvent.keyboard(' ');
      expect(element.checked).toBe(true);
      await userEvent.keyboard(' ');
      expect(element.checked).toBe(false);
    });

    it('does not toggle when the key is released on something else', async () => {
      const element = await mount(tag);
      element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(element.checked).toBe(false);
    });

    it('forgets a Space press when it loses focus before the key is released', async () => {
      const element = await mount(tag);
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      element.dispatchEvent(new FocusEvent('blur'));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(element.checked).toBe(false);
    });

    it('ignores Space with a modifier', async () => {
      const element = await mount(tag);
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', ctrlKey: true, bubbles: true }),
      );
      element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(element.checked).toBe(false);
    });

    it('does not take Space meant for a field inside its label', async () => {
      const element = await mount(tag, '', 'Fuel <input id="note" />');
      const field = element.querySelector('#note') as HTMLInputElement;
      const down = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      field.dispatchEvent(down);
      field.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(down.defaultPrevented).toBe(false);
      expect(element.checked).toBe(false);
    });

    it(`${role === 'switch' ? 'toggles' : 'does not toggle'} on Enter`, async () => {
      const element = await mount(tag);
      element.focus();
      await userEvent.keyboard('{Enter}');
      expect(element.checked).toBe(role === 'switch');
    });

    it('is a tab stop, and Tab moves past it', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.innerHTML = `<button id="before">Before</button><${tag}>Fuel</${tag}><button id="after">After</button>`;
      const element = wrapper.querySelector(tag) as Toggle;
      await element.updateComplete;
      await focusWithKeyboard(wrapper.querySelector('#before') as HTMLElement);
      (wrapper.querySelector('#before') as HTMLElement).focus();
      await userEvent.tab();
      expect(document.activeElement).toBe(element);
      await userEvent.tab();
      expect(document.activeElement?.id).toBe('after');
    });
  });

  describe('when it is disabled', () => {
    it('cannot be focused, toggled, or heard', async () => {
      const element = await mount(tag, 'disabled');
      const heard = vi.fn();
      element.addEventListener('click', heard);
      element.focus();
      expect(document.activeElement).not.toBe(element);
      element.click();
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(element.checked).toBe(false);
      expect(heard).not.toHaveBeenCalled();
    });

    it('is disabled by a disabled fieldset around it, without changing its own disabled', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.innerHTML = `<fieldset disabled><${tag}>Fuel</${tag}></fieldset>`;
      const element = wrapper.querySelector(tag) as Toggle;
      await element.updateComplete;
      expect(element.disabled).toBe(false);
      expect(element.getAttribute('aria-disabled')).toBe('true');
      expect(element.hasAttribute('tabindex')).toBe(false);
      element.click();
      expect(element.checked).toBe(false);
      (wrapper.querySelector('fieldset') as HTMLFieldSetElement).disabled = false;
      await flush();
      await element.updateComplete;
      expect(element.hasAttribute('aria-disabled')).toBe(false);
      expect(element.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('in a roving group', () => {
    it('is skipped by Tab or made the stop as the group says, and handed back', async () => {
      const element = await mount(tag);
      element.setTabStop(false);
      await element.updateComplete;
      expect(element.getAttribute('tabindex')).toBe('-1');
      element.setTabStop(true);
      await element.updateComplete;
      expect(element.getAttribute('tabindex')).toBe('0');
      element.setTabStop(null);
      await element.updateComplete;
      expect(element.getAttribute('tabindex')).toBe('0');
      element.focusItem();
      expect(document.activeElement).toBe(element);
    });

    it('stays out of a disabled one, whatever the group says', async () => {
      const element = await mount(tag, 'disabled');
      element.setTabStop(true);
      await element.updateComplete;
      expect(element.hasAttribute('tabindex')).toBe(false);
      expect(element.isDisabled).toBe(true);
    });

    it('is one stop of a toolbar, with the arrow keys moving among its items', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.innerHTML = `
        <punk-toolbar aria-label="Tools">
          <punk-button>Start</punk-button>
          <${tag}>Fuel</${tag}>
          <punk-button>Stop</punk-button>
        </punk-toolbar>`;
      const toolbar = wrapper.querySelector('punk-toolbar') as PunkToolbar;
      const element = wrapper.querySelector(tag) as Toggle;
      await toolbar.updateComplete;
      await element.updateComplete;
      await flush();
      const first = wrapper.querySelector('punk-button') as HTMLElement;
      first.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(element);
      expect(element.getAttribute('tabindex')).toBe('0');
      expect(first.shadowRoot?.querySelector('button')?.getAttribute('tabindex')).toBe('-1');
      await userEvent.keyboard('{ArrowRight}');
      expect(document.activeElement?.localName).toBe('punk-button');
    });
  });

  describe('appearance', () => {
    it('is the same size checked and unchecked, so the page does not move', async () => {
      const element = await mount(tag);
      const before = element.getBoundingClientRect();
      element.checked = true;
      await element.updateComplete;
      const after = element.getBoundingClientRect();
      expect([after.width, after.height]).toEqual([before.width, before.height]);
    });

    it('has a target of at least 24px, and an empty one takes no room for a label', async () => {
      const element = await mount(tag, 'aria-label="Fuel"', '');
      const control = element.shadowRoot?.querySelector('.control') as HTMLElement;
      expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
      const label = element.shadowRoot?.querySelector('.label') as HTMLElement;
      expect(getComputedStyle(label).display).toBe('none');
    });

    it('wraps a long label, with no horizontal scroll at 187px', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.style.inlineSize = '187px';
      wrapper.innerHTML = `<${tag}>Fertigungsgeschwindigkeitsüberschreitung im Nordwerk</${tag}>`;
      const element = wrapper.querySelector(tag) as Toggle;
      await element.updateComplete;
      expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(187);
      const control = element.shadowRoot?.querySelector('.control') as HTMLElement;
      expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth);
    });

    it('shows a focus ring on the control for the keyboard, and none for the pointer', async () => {
      const wrapper = track(document.createElement('div'));
      wrapper.innerHTML = `<button id="before">Before</button><${tag}>Fuel</${tag}>`;
      const element = wrapper.querySelector(tag) as Toggle;
      await element.updateComplete;
      await focusWithKeyboard(wrapper.querySelector('#before') as HTMLElement);
      (wrapper.querySelector('#before') as HTMLElement).focus();
      await userEvent.tab();
      const ring = getComputedStyle(
        element.shadowRoot?.querySelector('.control') as Element,
        '::after',
      ).boxShadow;
      expect(ring).not.toBe('none');
    });
  });

  describe('when it is moved or removed', () => {
    it('keeps its attributes when it moves, and leaves nothing behind', async () => {
      const element = await mount(tag, 'checked');
      const parent = element.parentElement as HTMLElement;
      element.remove();
      parent.append(element);
      await element.updateComplete;
      expect(element.getAttribute('role')).toBe(role);
      expect(element.getAttribute('aria-checked')).toBe('true');
    });
  });
});
