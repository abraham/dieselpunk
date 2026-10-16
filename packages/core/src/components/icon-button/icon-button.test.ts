import { commands, page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { density } from '../../tokens/density.ts';
import { themes } from '../../tokens/themes.ts';
import {
  addStylesheets,
  cleanup,
  focusWithKeyboard,
  rgb,
  track,
} from '../../../test/browser/helpers.ts';
import '../../../test/browser/commands.ts';
import './register.ts';
import { resetTooltipWarmup } from '../tooltip/tooltip.ts';
import type { PunkTooltip, TooltipPlacement } from '../tooltip/index.ts';
import type { ButtonSize, ButtonVariant } from '../button/index.ts';
import type { PunkIconButton } from './index.ts';

interface IconButtonOptions {
  label?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  placement?: TooltipPlacement;
  parent?: Element;
  withIcon?: boolean;
}

const dark = themes.industrial.tokens;
let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await userEvent.unhover(document.body);
  vi.restoreAllMocks();
  resetTooltipWarmup();
  await commands.setReducedMotion(null);
});

function icon(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  return svg;
}

async function mount(options: IconButtonOptions = {}): Promise<PunkIconButton> {
  const element = document.createElement('punk-icon-button');
  if (options.label !== undefined) element.label = options.label;
  else element.label = 'Save';
  if (options.size) element.size = options.size;
  if (options.variant) element.variant = options.variant;
  if (options.disabled) element.disabled = true;
  if (options.loading) element.loading = true;
  if (options.placement) element.tooltipPlacement = options.placement;
  if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel);
  if (options.withIcon !== false) element.append(icon());
  track(element, options.parent);
  await element.updateComplete;
  return element;
}

function inner(button: PunkIconButton): HTMLButtonElement {
  const found = button.shadowRoot?.querySelector('button');
  if (!found) throw new Error('Missing inner button');
  return found;
}

function tooltipOf(button: PunkIconButton): PunkTooltip {
  const found = button.shadowRoot?.querySelector('punk-tooltip');
  if (!found) throw new Error('Missing tooltip');
  return found;
}

function surfaceOf(tooltip: PunkTooltip): HTMLElement {
  const found = tooltip.shadowRoot?.querySelector<HTMLElement>('[part="surface"]');
  if (!found) throw new Error('Missing tooltip surface');
  return found;
}

function iconButtonWarnings(): unknown[][] {
  return warn.mock.calls.filter(([message]) => String(message).includes('<punk-icon-button>'));
}

function container(attributes: Record<string, string> = {}): HTMLElement {
  const element = track(document.createElement('div'));
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

describe('accessible name (12.5.1)', () => {
  it('is the label', async () => {
    await mount({ label: 'Save document' });
    expect(page.getByRole('button', { name: 'Save document', exact: true }).query()).not.toBeNull();
  });

  it('follows the label as it changes', async () => {
    const button = await mount({ label: 'Save' });
    button.label = 'Save all';
    await button.updateComplete;
    expect(page.getByRole('button', { name: 'Save all', exact: true }).query()).not.toBeNull();
    expect(page.getByRole('button', { name: 'Save', exact: true }).query()).toBeNull();
  });

  it('reflects the label to an attribute', async () => {
    const button = await mount({ label: 'Save' });
    expect(button.getAttribute('label')).toBe('Save');
  });

  it('falls back to a host aria-label when there is no label', async () => {
    await mount({ label: '', ariaLabel: 'From aria' });
    expect(page.getByRole('button', { name: 'From aria', exact: true }).query()).not.toBeNull();
    expect(iconButtonWarnings()).toHaveLength(0);
  });

  it('prefers the label over a host aria-label', async () => {
    await mount({ label: 'Label wins', ariaLabel: 'Ignored' });
    expect(page.getByRole('button', { name: 'Label wins', exact: true }).query()).not.toBeNull();
  });

  it('warns once when the label is missing', async () => {
    await mount({ label: '' });
    expect(iconButtonWarnings()).toHaveLength(1);
    expect(String(iconButtonWarnings()[0]?.[0])).toContain('label');
  });

  it('warns for a label that was never set', async () => {
    const element = document.createElement('punk-icon-button');
    track(element);
    await element.updateComplete;
    expect(iconButtonWarnings()).toHaveLength(1);
  });

  it('does not warn when named, and warns again if the name is removed', async () => {
    const button = await mount({ label: 'Save' });
    expect(iconButtonWarnings()).toHaveLength(0);

    button.label = '';
    await button.updateComplete;
    expect(iconButtonWarnings()).toHaveLength(1);
    button.requestUpdate();
    await button.updateComplete;
    expect(iconButtonWarnings()).toHaveLength(1);

    button.label = 'Back';
    await button.updateComplete;
    button.label = '';
    await button.updateComplete;
    expect(iconButtonWarnings()).toHaveLength(2);
  });
});

describe('tooltip (12.5.2)', () => {
  it('shows the label on hover', async () => {
    const button = await mount({ label: 'Save document' });
    await userEvent.hover(button);
    await vi.waitFor(() => expect(tooltipOf(button).open).toBe(true), { timeout: 2000 });
    expect(tooltipOf(button).textContent).toBe('Save document');
    expect(surfaceOf(tooltipOf(button)).matches(':popover-open')).toBe(true);
  });

  it('shows the label at once on keyboard focus', async () => {
    const button = await mount();
    await focusWithKeyboard(button);
    expect(tooltipOf(button).open).toBe(true);
  });

  it('hides again when the pointer leaves', async () => {
    const button = await mount();
    await userEvent.hover(button);
    await vi.waitFor(() => expect(tooltipOf(button).open).toBe(true), { timeout: 2000 });
    await userEvent.unhover(button);
    await vi.waitFor(() => expect(tooltipOf(button).open).toBe(false), { timeout: 2000 });
  });

  it('closes on Escape without moving focus', async () => {
    const button = await mount();
    await focusWithKeyboard(button);
    await userEvent.keyboard('{Escape}');
    await tooltipOf(button).updateComplete;
    expect(tooltipOf(button).open).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('is not duplicated in the accessible description', async () => {
    const button = await mount({ label: 'Save document' });
    const tooltip = tooltipOf(button);
    await tooltip.updateComplete;

    expect(tooltip.describe).toBe(false);
    expect(inner(button).hasAttribute('aria-describedby')).toBe(false);
    expect(button.hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip.hasAttribute('role')).toBe(false);
    expect(button.shadowRoot?.getElementById('description')).toBeNull();
  });

  it('anchors to the inner button, which is its previous sibling', async () => {
    const button = await mount();
    expect(tooltipOf(button).previousElementSibling).toBe(inner(button));
  });

  it('follows the label text and the placement', async () => {
    const button = await mount({ label: 'One', placement: 'bottom' });
    expect(tooltipOf(button).placement).toBe('bottom');
    expect(button.getAttribute('tooltip-placement')).toBe('bottom');

    button.label = 'Two';
    button.tooltipPlacement = 'end';
    await button.updateComplete;
    expect(tooltipOf(button).textContent).toBe('Two');
    expect(tooltipOf(button).placement).toBe('end');
  });

  it('places the tooltip on the requested side', async () => {
    const wrapper = container({ style: 'padding: 120px' });
    const button = await mount({ placement: 'bottom', parent: wrapper });
    await userEvent.hover(button);
    await vi.waitFor(() => expect(tooltipOf(button).open).toBe(true), { timeout: 2000 });
    const surface = surfaceOf(tooltipOf(button)).getBoundingClientRect();
    expect(surface.top).toBeGreaterThan(button.getBoundingClientRect().bottom);
  });

  it('defaults to a top tooltip with a 400ms delay', async () => {
    const button = await mount();
    expect(tooltipOf(button).placement).toBe('top');
    expect(tooltipOf(button).delay).toBe(400);
  });

  it('still shows the label while loading', async () => {
    const button = await mount({ loading: true });
    await focusWithKeyboard(button);
    expect(tooltipOf(button).open).toBe(true);
    expect(tooltipOf(button).textContent).toBe('Save');
  });
});

describe('shape (12.5.3)', () => {
  it('is square at every size, in both densities', async () => {
    addStylesheets();
    for (const mode of ['compact', 'low'] as const) {
      const wrapper = container({ 'data-punk-density': mode });
      for (const size of ['sm', 'md', 'lg'] as const) {
        const button = await mount({ size, parent: wrapper });
        const expected = parseFloat(density[mode][`control-height-${size}`] ?? '36');
        const box = inner(button).getBoundingClientRect();
        expect(box.height, `${mode} ${size} height`).toBe(expected);
        expect(box.width, `${mode} ${size} width`).toBe(expected);
        expect(button.getBoundingClientRect().width, `${mode} ${size} host`).toBe(expected);
      }
    }
  });

  it('stays square whatever the icon is', async () => {
    const wide = await mount({ withIcon: false });
    const svg = icon();
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '10');
    wide.append(svg);
    await wide.updateComplete;
    const box = inner(wide).getBoundingClientRect();
    expect(box.width).toBe(box.height);
  });

  it('sizes the icon from the icon-size tokens', async () => {
    const small = await mount({ size: 'sm' });
    const medium = await mount({ size: 'md' });
    const large = await mount({ size: 'lg' });
    const width = (button: PunkIconButton) =>
      button.querySelector('svg')?.getBoundingClientRect().width;
    expect(width(small)).toBe(16);
    expect(width(medium)).toBe(20);
    expect(width(large)).toBe(24);
  });

  it('centers the icon', async () => {
    const button = await mount();
    const box = inner(button).getBoundingClientRect();
    const svg = button.querySelector('svg')?.getBoundingClientRect();
    if (!svg) throw new Error('Missing icon');
    expect(Math.abs(svg.left + svg.width / 2 - (box.left + box.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(svg.top + svg.height / 2 - (box.top + box.height / 2))).toBeLessThanOrEqual(1);
  });

  it('renders the default dark, compact appearance with no stylesheet (12.1.3)', async () => {
    const button = await mount();
    const style = getComputedStyle(inner(button));
    expect(style.color).toBe(rgb(dark['color-text']));
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(inner(button).getBoundingClientRect().height).toBe(36);
  });
});

describe('loading (12.5.4)', () => {
  it('hides the icon, shows the spinner, and keeps the name', async () => {
    const button = await mount();
    const content = button.shadowRoot?.querySelector('.content') as HTMLElement;
    expect(getComputedStyle(content).opacity).toBe('1');
    expect(button.shadowRoot?.querySelector('[part="spinner"]')).toBeNull();

    button.loading = true;
    await button.updateComplete;
    expect(getComputedStyle(content).opacity).toBe('0');
    expect(button.shadowRoot?.querySelector('[part="spinner"]')).not.toBeNull();
    expect(page.getByRole('button', { name: 'Save', exact: true }).query()).not.toBeNull();
  });

  it('keeps its size while loading', async () => {
    const button = await mount();
    const before = button.getBoundingClientRect();
    button.loading = true;
    await button.updateComplete;
    const after = button.getBoundingClientRect();
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
  });

  it('stays focusable while loading', async () => {
    const button = await mount({ loading: true });
    button.focus();
    expect(button.shadowRoot?.activeElement).toBe(inner(button));
    expect(inner(button).getAttribute('aria-busy')).toBe('true');
  });

  it('announces the loading string through a status element outside the button', async () => {
    const button = await mount({ loading: true });
    const status = button.shadowRoot?.querySelector('[role="status"]');
    expect(status?.textContent).toBe('Loading');
    expect(status?.closest('button')).toBeNull();
  });

  it('stops the spinner under reduced motion', async () => {
    const button = await mount({ loading: true });
    const spinner = button.shadowRoot?.querySelector('[part="spinner"]') as HTMLElement;
    expect(getComputedStyle(spinner).animationName).toBe('punk-spin');
    await commands.setReducedMotion('reduce');
    expect(getComputedStyle(spinner).animationName).toBe('none');
  });
});

describe('inherited button behavior', () => {
  it('blocks clicks while disabled or loading', async () => {
    for (const state of ['disabled', 'loading'] as const) {
      const button = await mount({ [state]: true });
      const clicks = vi.fn();
      button.addEventListener('click', clicks);
      button.click();
      inner(button).click();
      expect(clicks, state).not.toHaveBeenCalled();
    }
  });

  it('activates with a click and the keyboard', async () => {
    const button = await mount();
    const clicks = vi.fn();
    button.addEventListener('click', clicks);
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks).toHaveBeenCalledTimes(2);
  });

  it('submits the enclosing form', async () => {
    const form = track(document.createElement('form'));
    const submitted = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submitted);
    const button = document.createElement('punk-icon-button');
    button.label = 'Go';
    button.type = 'submit';
    form.append(button);
    await button.updateComplete;
    await userEvent.click(button);
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it('applies the variants', async () => {
    const primary = getComputedStyle(inner(await mount({ variant: 'primary' })));
    expect(primary.color).toBe(rgb(dark['color-accent-text']));
    const danger = getComputedStyle(inner(await mount({ variant: 'danger' })));
    expect(danger.backgroundColor).toBe(rgb(dark['color-danger']));
  });

  it('flattens when disabled', async () => {
    const style = getComputedStyle(inner(await mount({ disabled: true })));
    expect(style.backgroundColor).toBe(rgb(dark['color-disabled-fill']));
  });

  it('draws the focus ring for keyboard focus', async () => {
    const button = await mount();
    await focusWithKeyboard(button);
    expect(getComputedStyle(inner(button), '::after').content).toBe('""');
  });

  it('accepts an external description from another tooltip', async () => {
    const button = await mount();
    button.setExternalDescription('Extra detail');
    await button.updateComplete;
    const id = inner(button).getAttribute('aria-describedby') ?? '';
    expect(button.shadowRoot?.getElementById(id)?.textContent).toBe('Extra detail');
  });
});
