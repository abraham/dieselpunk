import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import { registerElement } from '../utilities/register-element.ts';
import { PunkFormControl } from './form-control.ts';
import type { FormValue, Validation } from './form-control.ts';

// The smallest form control: a text value held in the shadow tree, with `value` as its default.
class TestField extends PunkFormControl {
  @property() value = '';
  @property() label = '';

  protected override formValue(): FormValue {
    return this.value;
  }

  protected override resetToDefault(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  protected override restoreState(state: FormValue): void {
    this.value = typeof state === 'string' ? state : '';
  }

  protected override validate(): Validation | null {
    if (this.required && this.value === '') {
      return { flags: { valueMissing: true }, message: 'Fill this in', anchor: this.input };
    }
    return null;
  }

  get input(): HTMLInputElement {
    return this.renderRoot.querySelector('input') as HTMLInputElement;
  }

  get name_(): string | null {
    const name = this.resolveName(this.label);
    this.warnIfUnnamed(name);
    return name;
  }

  get showsMessage(): boolean {
    return this.messageVisible;
  }

  protected override render() {
    return html`<input
      .value=${this.value}
      @input=${(event: Event) => {
        this.value = (event.target as HTMLInputElement).value;
        this.commit();
      }}
    />`;
  }
}
registerElement('punk-test-field', TestField);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function form(...children: Array<Element | string>): HTMLFormElement {
  const element = track(document.createElement('form'));
  for (const child of children) {
    if (typeof child === 'string') element.insertAdjacentHTML('beforeend', child);
    else element.append(child);
  }
  return element;
}

async function field(
  attributes: Record<string, string> = {},
  parent: Element = document.body,
): Promise<TestField> {
  const element = document.createElement('punk-test-field') as TestField;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  track(element, parent);
  await element.updateComplete;
  return element;
}

const entries = (owner: HTMLFormElement) => [...new FormData(owner).entries()];

describe('submission', () => {
  it('adds its value under its name', async () => {
    const owner = form();
    const element = await field({ name: 'speed' }, owner);
    element.value = 'fast';
    await element.updateComplete;
    expect(entries(owner)).toEqual([['speed', 'fast']]);
  });

  it('adds nothing without a name, or while disabled', async () => {
    const owner = form();
    const unnamed = await field({}, owner);
    unnamed.value = 'x';
    const disabled = await field({ name: 'off', disabled: '' }, owner);
    disabled.value = 'y';
    await Promise.all([unnamed.updateComplete, disabled.updateComplete]);
    expect(entries(owner)).toEqual([]);
  });

  it('is in the form named by its form attribute, from outside it', async () => {
    const owner = form();
    owner.id = 'owner';
    const element = await field({ name: 'outside', form: 'owner' });
    element.value = 'in';
    await element.updateComplete;
    expect(element.form).toBe(owner);
    expect(entries(owner)).toEqual([['outside', 'in']]);
  });

  it('is current straight after commit, without waiting for an update', async () => {
    const owner = form();
    const element = await field({ name: 'speed' }, owner);
    element.value = 'now';
    element.input.value = 'typed';
    element.input.dispatchEvent(new Event('input'));
    expect(entries(owner)).toEqual([['speed', 'typed']]);
  });
});

describe('disabled', () => {
  it('follows a disabled fieldset ancestor without changing its own property', async () => {
    const owner = form('<fieldset id="group"></fieldset>');
    const group = owner.querySelector('fieldset') as HTMLFieldSetElement;
    const element = await field({ name: 'speed' }, group);
    element.value = 'x';
    await element.updateComplete;
    expect(element.isDisabled).toBe(false);
    group.disabled = true;
    expect(element.isDisabled).toBe(true);
    expect(element.disabled).toBe(false);
    expect(entries(owner)).toEqual([]);
    group.disabled = false;
    expect(entries(owner)).toEqual([['speed', 'x']]);
  });

  it('keeps a control inside the first legend of a disabled fieldset enabled', async () => {
    const owner = form('<fieldset disabled><legend></legend></fieldset>');
    const legend = owner.querySelector('legend') as HTMLElement;
    const element = await field({ name: 'speed' }, legend);
    expect(element.isDisabled).toBe(false);
  });
});

describe('reset and restore', () => {
  it('goes back to the authored default, not the current value', async () => {
    const owner = form();
    const element = await field({ name: 'speed', value: 'authored' }, owner);
    element.value = 'changed';
    await element.updateComplete;
    owner.reset();
    await element.updateComplete;
    expect(element.value).toBe('authored');
    expect(entries(owner)).toEqual([['speed', 'authored']]);
  });

  it('forgets that the user touched it', async () => {
    const owner = form();
    const element = await field({ name: 'speed', required: '' }, owner);
    element.reportValidity();
    await element.updateComplete;
    expect(element.showsMessage).toBe(true);
    owner.reset();
    await element.updateComplete;
    expect(element.showsMessage).toBe(false);
  });

  it('restores the state the browser kept', async () => {
    const owner = form();
    const element = await field({ name: 'speed' }, owner);
    element.formStateRestoreCallback('kept');
    await element.updateComplete;
    expect(element.value).toBe('kept');
    expect(entries(owner)).toEqual([['speed', 'kept']]);
  });
});

describe('validation', () => {
  it('reports a missing required value, and clears it when filled', async () => {
    const element = await field({ required: '' }, form());
    expect(element.validity.valueMissing).toBe(true);
    expect(element.validationMessage).toBe('Fill this in');
    expect(element.checkValidity()).toBe(false);
    element.value = 'ok';
    await element.updateComplete;
    expect(element.checkValidity()).toBe(true);
  });

  it('waits for the user before a message shows', async () => {
    const element = await field({ required: '' }, form());
    expect(element.showsMessage).toBe(false);
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await element.updateComplete;
    expect(element.showsMessage).toBe(true);
  });

  it('shows the message once validity is reported, and focuses the anchor', async () => {
    const element = await field({ required: '' }, form());
    const invalid = vi.fn();
    element.addEventListener('invalid', invalid);
    expect(element.reportValidity()).toBe(false);
    await element.updateComplete;
    expect(invalid).toHaveBeenCalledOnce();
    expect(element.showsMessage).toBe(true);
    expect(element.shadowRoot?.activeElement).toBe(element.input);
  });

  it('puts a custom error before the constraints of the control, and clears it with an empty message', async () => {
    const element = await field({ required: '' }, form());
    element.setCustomValidity('Taken');
    expect(element.validity.customError).toBe(true);
    expect(element.validationMessage).toBe('Taken');
    element.setCustomValidity('');
    expect(element.validity.customError).toBe(false);
    expect(element.validity.valueMissing).toBe(true);
  });

  it('blocks form submission while invalid', async () => {
    const owner = form();
    await field({ name: 'speed', required: '' }, owner);
    expect(owner.checkValidity()).toBe(false);
  });
});

describe('name', () => {
  it('prefers its own label, then aria-label, then the text of a label element', async () => {
    const owner = form('<label for="speed">From label</label>');
    const element = await field({ id: 'speed' }, owner);
    expect(element.name_).toBe('From label');
    element.setAttribute('aria-label', 'From aria');
    await element.updateComplete;
    expect(element.name_).toBe('From aria');
    element.label = 'Own';
    expect(element.name_).toBe('Own');
  });

  it('reads a label that was added after it was first checked, once it has focus', async () => {
    const owner = form();
    const element = await field({ id: 'late' }, owner);
    expect(element.name_).toBeNull();
    owner.insertAdjacentHTML('beforeend', '<label for="late">Added later</label>');
    element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await element.updateComplete;
    expect(element.name_).toBe('Added later');
  });

  it('warns once when it has no name, and not when it has one', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unnamed = await field({}, form());
    expect(unnamed.name_).toBeNull();
    expect(unnamed.name_).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockClear();
    const named = await field({ 'aria-label': 'Speed' }, form());
    expect(named.name_).toBe('Speed');
    expect(warn).not.toHaveBeenCalled();
  });
});
