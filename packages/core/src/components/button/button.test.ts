import { commands, page, server, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { density } from '../../tokens/density.ts';
import { themeNames, themes } from '../../tokens/themes.ts';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  rgb,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { ButtonSize, ButtonType, ButtonVariant, PunkButton } from './index.ts';

interface ButtonOptions {
  variant?: ButtonVariant | string;
  size?: ButtonSize | string;
  type?: ButtonType;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  id?: string;
  parent?: Element;
}

const dark = themes.dark.tokens;
let pointerHeld = false;

afterEach(async () => {
  cleanup();
  await setLocale('en');
  if (pointerHeld) {
    pointerHeld = false;
    await commands.releasePointer();
  }
  // Park the real pointer so a later test is not left hovering at the same spot.
  await userEvent.unhover(document.body);
  vi.restoreAllMocks();
});

async function mount(options: ButtonOptions = {}): Promise<PunkButton> {
  const element = document.createElement('punk-button');
  if (options.variant) element.setAttribute('variant', options.variant);
  if (options.size) element.setAttribute('size', options.size);
  if (options.type) element.type = options.type;
  if (options.disabled) element.disabled = true;
  if (options.loading) element.loading = true;
  if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
  if (options.id) element.id = options.id;
  element.textContent = options.label ?? 'Save';
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function inner(button: PunkButton): HTMLButtonElement {
  const found = button.shadowRoot?.querySelector('button');
  if (!found) throw new Error('Missing inner button');
  return found;
}

function part(button: PunkButton, name: string): HTMLElement {
  const found = button.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (!found) throw new Error(`Missing part "${name}"`);
  return found;
}

function countClicks(element: Element): () => number {
  let count = 0;
  element.addEventListener('click', () => count++);
  return () => count;
}

function shadowCount(boxShadow: string): number {
  return (boxShadow.match(/inset/g) ?? []).length;
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = track(document.createElement('div'));
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

/** Padding keeps an element away from the viewport edge so a point just above it can be hit-tested. */
function padded(): HTMLElement {
  const element = container();
  element.style.padding = '30px';
  return element;
}

describe('activation (12.4.1)', () => {
  it('activates with Enter and Space', async () => {
    const button = await mount();
    const clicks = countClicks(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks()).toBe(1);
    await userEvent.keyboard(' ');
    expect(clicks()).toBe(2);
  });

  it('activates with a pointer click', async () => {
    const button = await mount();
    const clicks = countClicks(button);
    await userEvent.click(button);
    expect(clicks()).toBe(1);
  });

  it('focus() on the host focuses the inner button', async () => {
    const button = await mount();
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.shadowRoot?.activeElement).toBe(inner(button));
  });

  // WebKit on macOS skips buttons when tabbing unless a system setting is enabled.
  it.skipIf(server.browser === 'webkit')(
    'follows tab order, skipping a disabled button but not a loading one',
    async () => {
      const wrapper = container();
      const first = await mount({ parent: wrapper, label: 'First' });
      const skipped = await mount({ parent: wrapper, label: 'Skipped', disabled: true });
      const busy = await mount({ parent: wrapper, label: 'Busy', loading: true });
      const last = await mount({ parent: wrapper, label: 'Last' });

      await userEvent.tab();
      expect(document.activeElement).toBe(first);
      await userEvent.tab();
      expect(document.activeElement).toBe(busy);
      await userEvent.tab();
      expect(document.activeElement).toBe(last);
      expect(skipped.shadowRoot?.activeElement ?? null).toBeNull();
    },
  );
});

describe('disabled and loading (12.4.2)', () => {
  for (const state of ['disabled', 'loading'] as const) {
    it(`${state} blocks clicks from every path`, async () => {
      const button = await mount({ [state]: true });
      const clicks = countClicks(button);

      button.click();
      inner(button).click();
      // A click on the host itself, as when a consumer gives it padding.
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(clicks()).toBe(0);
    });

    it(`${state} blocks form actions`, async () => {
      const form = track(document.createElement('form'));
      const submitted = vi.fn((event: Event) => event.preventDefault());
      form.addEventListener('submit', submitted);
      const button = await mount({ [state]: true, type: 'submit', parent: form });

      inner(button).click();
      expect(submitted).not.toHaveBeenCalled();
    });
  }

  it('sets the native disabled state when disabled', async () => {
    const button = await mount({ disabled: true });
    expect(inner(button).disabled).toBe(true);
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('follows a disabled fieldset ancestor', async () => {
    const fieldset = track(document.createElement('fieldset'));
    const button = await mount({ parent: fieldset });
    const clicks = countClicks(button);
    expect(inner(button).disabled).toBe(false);

    fieldset.disabled = true;
    await vi.waitFor(() => expect(inner(button).disabled).toBe(true));
    inner(button).click();
    button.click();
    expect(clicks()).toBe(0);

    fieldset.disabled = false;
    await vi.waitFor(() => expect(inner(button).disabled).toBe(false));
  });

  it('works again once re-enabled', async () => {
    const button = await mount({ disabled: true });
    const clicks = countClicks(button);
    button.disabled = false;
    await button.updateComplete;
    await userEvent.click(button);
    expect(clicks()).toBe(1);
  });
});

describe('loading (12.4.3)', () => {
  it('keeps its width and accessible name', async () => {
    const button = await mount();
    const before = button.getBoundingClientRect().width;
    expect(page.getByRole('button', { name: 'Save', exact: true }).query()).not.toBeNull();

    button.loading = true;
    await button.updateComplete;
    expect(button.getBoundingClientRect().width).toBe(before);
    expect(page.getByRole('button', { name: 'Save', exact: true }).query()).not.toBeNull();
  });

  it('stays focusable, and is marked busy rather than disabled', async () => {
    const button = await mount({ loading: true });
    const element = inner(button);
    expect(element.disabled).toBe(false);
    expect(element.getAttribute('aria-busy')).toBe('true');
    expect(element.getAttribute('aria-disabled')).toBe('true');

    button.focus();
    expect(button.shadowRoot?.activeElement).toBe(element);
  });

  it('announces through a status element outside the button', async () => {
    const button = await mount();
    const status = button.shadowRoot?.querySelector('[role="status"]');
    if (!status) throw new Error('Missing status element');
    expect(status.closest('button')).toBeNull();
    expect(status.textContent).toBe('');

    button.loading = true;
    await button.updateComplete;
    expect(status.textContent).toBe('Loading');
    button.loading = false;
    await button.updateComplete;
    expect(status.textContent).toBe('');
  });

  it('announces a translated string', async () => {
    await setLocale('de');
    const button = await mount({ loading: true });
    expect(button.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe('Laden');
  });

  it('hides the label and shows a spinner, without moving the layout', async () => {
    const button = await mount({ loading: true });
    expect(getComputedStyle(part(button, 'label').parentElement as HTMLElement).opacity).toBe('0');
    expect(part(button, 'spinner')).toBeTruthy();

    button.loading = false;
    await button.updateComplete;
    expect(button.shadowRoot?.querySelector('[part="spinner"]')).toBeNull();
  });

  it('animates the spinner while loading', async () => {
    const button = await mount({ loading: true });
    expect(getComputedStyle(part(button, 'spinner')).animationName).toBe('punk-spin');
  });
});

describe('type (12.4.4)', () => {
  function formWith(button: PunkButton, input: HTMLInputElement): HTMLFormElement {
    const form = track(document.createElement('form'));
    form.append(input, button);
    return form;
  }

  it('defaults to button and reflects the type', async () => {
    const button = await mount();
    expect(button.type).toBe('button');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('submits the enclosing form for type=submit', async () => {
    const form = track(document.createElement('form'));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submitted);
    const button = await mount({ type: 'submit', parent: form });

    await userEvent.click(button);
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it('resets the enclosing form for type=reset', async () => {
    const input = Object.assign(document.createElement('input'), { defaultValue: 'start' });
    const button = await mount({ type: 'reset' });
    formWith(button, input);
    input.value = 'changed';

    await userEvent.click(button);
    expect(input.value).toBe('start');
  });

  it('does neither for type=button', async () => {
    const form = track(document.createElement('form'));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submitted);
    const input = Object.assign(document.createElement('input'), { defaultValue: 'start' });
    form.append(input);
    const button = await mount({ parent: form });
    input.value = 'changed';

    await userEvent.click(button);
    expect(submitted).not.toHaveBeenCalled();
    expect(input.value).toBe('changed');
  });

  it('does nothing outside a form', async () => {
    const button = await mount({ type: 'submit' });
    await expect(userEvent.click(button)).resolves.not.toThrow();
  });

  it('is form-associated', () => {
    expect(customElements.get('punk-button')).toHaveProperty('formAssociated', true);
  });
});

describe('aria-label and description (12.4.5, 12.4.6)', () => {
  it('copies the host aria-label to the inner button', async () => {
    const button = await mount({ ariaLabel: 'Save document' });
    expect(inner(button).getAttribute('aria-label')).toBe('Save document');

    button.setAttribute('aria-label', 'Save all');
    await button.updateComplete;
    expect(inner(button).getAttribute('aria-label')).toBe('Save all');

    button.removeAttribute('aria-label');
    await button.updateComplete;
    expect(inner(button).hasAttribute('aria-label')).toBe(false);
  });

  it('exposes an external description through aria-describedby', async () => {
    const button = await mount();
    expect(inner(button).hasAttribute('aria-describedby')).toBe(false);

    button.setExternalAria({ description: 'Saves the file' });
    await button.updateComplete;
    const id = inner(button).getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(button.shadowRoot?.getElementById(id ?? '')?.textContent).toBe('Saves the file');

    button.setExternalAria({ description: null });
    await button.updateComplete;
    expect(inner(button).hasAttribute('aria-describedby')).toBe(false);
    expect(button.shadowRoot?.getElementById('description')).toBeNull();
  });
});

describe('appearance, unstyled (12.1.3)', () => {
  it('renders the default dark, compact appearance with no stylesheet', async () => {
    const button = await mount();
    const style = getComputedStyle(inner(button));
    expect(style.color).toBe(rgb(dark['color-text']));
    expect(style.fontFamily).toContain('Chakra Petch');
    expect(style.paddingLeft).toBe('12px');
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(inner(button).getBoundingClientRect().height).toBe(36);
  });
});

describe('variants, sizes, and states', () => {
  it('renders primary and danger fills with their text colors', async () => {
    const primary = getComputedStyle(inner(await mount({ variant: 'primary' })));
    expect(primary.color).toBe(rgb(dark['color-accent-text']));
    expect(primary.backgroundImage).toContain('linear-gradient');

    const danger = getComputedStyle(inner(await mount({ variant: 'danger' })));
    expect(danger.color).toBe(rgb(dark['color-danger-text']));
    expect(danger.backgroundColor).toBe(rgb(dark['color-danger']));
  });

  it('renders an unknown variant or size as the default', async () => {
    const button = await mount({ variant: 'banana', size: 'huge' });
    expect(getComputedStyle(inner(button)).color).toBe(rgb(dark['color-text']));
    expect(inner(button).getBoundingClientRect().height).toBe(36);
  });

  it('sizes each step from the control-height tokens, in both densities', async () => {
    addStylesheets();
    const heights = { sm: 'sm', md: 'md', lg: 'lg' } as const;
    for (const mode of ['compact', 'low'] as const) {
      const wrapper = container({ 'data-punk-density': mode });
      for (const size of Object.keys(heights) as Array<keyof typeof heights>) {
        const button = await mount({ size, parent: wrapper });
        const expected = parseFloat(density[mode][`control-height-${size}`] ?? '36');
        expect(inner(button).getBoundingClientRect().height, `${mode} ${size}`).toBe(expected);
      }
    }
  });

  it('flattens when disabled and keeps the label readable', async () => {
    const style = getComputedStyle(inner(await mount({ disabled: true })));
    expect(style.backgroundColor).toBe(rgb(dark['color-disabled-fill']));
    expect(style.color).toBe(rgb(dark['color-disabled-text']));
    expect(style.backgroundImage).toBe('none');
  });

  it('strengthens its edges on hover', async () => {
    const button = await mount();
    const idle = getComputedStyle(inner(button)).boxShadow;
    await userEvent.hover(button);
    const hovered = getComputedStyle(inner(button)).boxShadow;
    expect(shadowCount(hovered)).toBeGreaterThan(shadowCount(idle));
  });

  it('does not react to hover while disabled or loading', async () => {
    for (const state of ['disabled', 'loading'] as const) {
      const button = await mount({ [state]: true });
      const idle = getComputedStyle(inner(button)).boxShadow;
      await userEvent.hover(button);
      expect(getComputedStyle(inner(button)).boxShadow, state).toBe(idle);
    }
  });

  it('turns inset and moves its content 1px when pressed (12.4.7)', async () => {
    const button = await mount({ id: 'subject' });
    const idle = getComputedStyle(inner(button));
    expect(idle.boxShadow.startsWith(rgb(dark['color-edge-light']))).toBe(true);
    expect(getComputedStyle(part(button, 'label').parentElement as HTMLElement).top).toBe('0px');

    pointerHeld = true;
    await commands.holdPointer('#subject');
    const pressed = getComputedStyle(inner(button));
    const content = getComputedStyle(part(button, 'label').parentElement as HTMLElement);
    expect(pressed.boxShadow.startsWith(rgb(dark['color-edge-dark']))).toBe(true);
    expect(pressed.backgroundColor).toBe(rgb(dark['color-panel-inset']));
    expect(content.top).toBe('1px');
    expect(content.left).toBe('1px');
  });

  it('keeps the filled fill when a primary button is pressed', async () => {
    const button = await mount({ variant: 'primary', id: 'subject' });
    pointerHeld = true;
    await commands.holdPointer('#subject');
    const pressed = getComputedStyle(inner(button));
    expect(pressed.boxShadow.startsWith(rgb(dark['color-edge-dark']))).toBe(true);
    expect(pressed.backgroundImage).toContain('linear-gradient');
  });
});

describe('focus ring (12.4.7)', () => {
  const ring = (button: PunkButton) => getComputedStyle(inner(button), '::after');

  it('is drawn for keyboard focus on every variant in every theme', async () => {
    addStylesheets();
    for (const theme of themeNames) {
      for (const variant of ['default', 'primary', 'danger'] as const) {
        const wrapper = container({ 'data-punk-theme': theme });
        const button = await mount({ variant, parent: wrapper });
        await focusWithKeyboard(button);

        const style = ring(button);
        const label = `${theme}/${variant}`;
        expect(style.content, label).toBe('""');
        expect(style.boxShadow, label).toContain(rgb(themes[theme].tokens['color-focus']));
        expect(style.boxShadow, label).toContain(rgb(themes[theme].tokens['color-focus-inner']));
        button.remove();
      }
    }
  });

  it('is not drawn after a pointer click', async () => {
    const button = await mount();
    await userEvent.click(button);
    expect(ring(button).content).not.toBe('""');
  });

  it('replaces the default outline instead of removing focus indication', async () => {
    const button = await mount();
    await focusWithKeyboard(button);
    expect(getComputedStyle(inner(button)).outlineStyle).toBe('none');
    expect(ring(button).boxShadow).not.toBe('none');
  });
});

describe('coarse-pointer hit area (12.4.8)', () => {
  /** The component's own `(pointer: coarse)` rules, copied out so they can be applied on a mouse. */
  function coarseRules(button: PunkButton): { condition: string; css: string } {
    const rules = (button.shadowRoot?.adoptedStyleSheets ?? []).flatMap((sheet) =>
      Array.from(sheet.cssRules),
    );
    const media = rules.find(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && /pointer:\s*coarse/.test(rule.conditionText),
    );
    if (!media) throw new Error('No (pointer: coarse) rule found');
    return {
      condition: media.conditionText,
      css: Array.from(media.cssRules)
        .map((rule) => rule.cssText)
        .join('\n'),
    };
  }

  function hitsHost(button: PunkButton, offsetFromEdge: number): boolean {
    const rect = inner(button).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    return document.elementFromPoint(x, rect.top - offsetFromEdge) === button;
  }

  async function withCoarseRules(size: ButtonSize) {
    const button = await mount({ size, parent: padded() });
    const { condition, css } = coarseRules(button);
    expect(hitsHost(button, 1)).toBe(false);

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    button.shadowRoot?.adoptedStyleSheets.push(sheet);
    return { button, condition };
  }

  it('is gated on (pointer: coarse)', async () => {
    const { condition } = await withCoarseRules('md');
    expect(condition).toMatch(/pointer:\s*coarse/);
  });

  it('extends a 36px compact button to 40px', async () => {
    const { button } = await withCoarseRules('md');
    expect(hitsHost(button, 1)).toBe(true);
    expect(hitsHost(button, 1.9)).toBe(true);
    expect(hitsHost(button, 3)).toBe(false);
    expect(inner(button).getBoundingClientRect().height).toBe(36);
  });

  it('extends a 28px small button to 40px', async () => {
    const { button } = await withCoarseRules('sm');
    expect(hitsHost(button, 5.5)).toBe(true);
    expect(hitsHost(button, 7)).toBe(false);
  });

  it('leaves a 44px large button alone', async () => {
    const { button } = await withCoarseRules('lg');
    expect(hitsHost(button, 1)).toBe(false);
  });
});

describe('icons', () => {
  function icon(slot: string): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('slot', slot);
    svg.setAttribute('viewBox', '0 0 24 24');
    return svg;
  }

  it('hides empty icon wrappers so they add no gap', async () => {
    const button = await mount();
    expect(part(button, 'icon-start').hidden).toBe(true);
    expect(part(button, 'icon-end').hidden).toBe(true);
  });

  it('shows and sizes icons from the icon-size tokens', async () => {
    const button = document.createElement('punk-button');
    button.textContent = 'Save';
    const start = button.appendChild(icon('icon-start'));
    button.appendChild(icon('icon-end'));
    track(button);
    await button.updateComplete;

    expect(part(button, 'icon-start').hidden).toBe(false);
    expect(part(button, 'icon-end').hidden).toBe(false);
    expect(start.getBoundingClientRect().width).toBe(20);
  });

  it('reacts to an icon added later', async () => {
    const button = await mount();
    button.append(icon('icon-end'));
    await vi.waitFor(() => expect(part(button, 'icon-end').hidden).toBe(false));
  });
});

describe('forced colors', () => {
  it.skipIf(server.browser !== 'chromium')('uses a plain system-color border', async () => {
    const button = await mount();
    expect(getComputedStyle(inner(button)).borderTopWidth).toBe('0px');

    await commands.setForcedColors('active');
    try {
      expect(getComputedStyle(inner(button)).borderTopWidth).toBe('2px');
      await focusWithKeyboard(button);
      expect(getComputedStyle(inner(button)).outlineStyle).toBe('solid');
      expect(getComputedStyle(inner(button), '::after').display).toBe('none');
    } finally {
      await commands.setForcedColors(null);
    }
  });

  it.skipIf(server.browser !== 'chromium')(
    'tells the variants apart by border, since colors are unavailable',
    async () => {
      const buttons = await Promise.all(
        (['default', 'primary', 'danger'] as const).map((variant) => mount({ variant })),
      );
      await commands.setForcedColors('active');
      try {
        const borders = buttons.map((button) => {
          const style = getComputedStyle(inner(button));
          return `${style.borderTopWidth} ${style.borderTopStyle}`;
        });
        expect(new Set(borders).size).toBe(3);
      } finally {
        await commands.setForcedColors(null);
      }
    },
  );

  it.skipIf(server.browser !== 'chromium')(
    'keeps the same height as without forced colors',
    async () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      const buttons = await Promise.all(sizes.map((size) => mount({ size })));
      const normal = buttons.map((button) => button.getBoundingClientRect().height);
      await commands.setForcedColors('active');
      try {
        expect(buttons.map((button) => button.getBoundingClientRect().height)).toEqual(normal);
      } finally {
        await commands.setForcedColors(null);
      }
    },
  );
});
