import { commands, server, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addStylesheets, cleanup, track } from './helpers.ts';
import './commands.ts';
import '../../src/components/checkbox/register.ts';
import '../../src/components/switch/register.ts';
import '../../src/components/slider/register.ts';
import '../../src/components/text-field/register.ts';
import '../../src/components/textarea/register.ts';
import '../../src/components/radio-group/register.ts';
import '../../src/components/combobox/register.ts';
import '../../src/components/number-field/register.ts';
import '../../src/components/select/register.ts';
import type { PunkFormControl } from '../../src/internal/form-control.ts';
import type { PunkSlider } from '../../src/components/slider/index.ts';

// What a native control does in a form, asked of each of ours. A control is described by how to
// give it a value other than its default, and what it submits then.
interface Control {
  tag: string;
  /** Attributes for a control in its default state. */
  base: string;
  /** Content between the tags. */
  content: string;
  /** Changes it as a user would, to a state that differs from `base`. */
  change(element: PunkFormControl): void;
  /** What it submits under its name in the default state, or null for nothing. */
  submittedDefault: string | null;
  /** What it submits once changed. */
  submittedChanged: string | null;
  /** An attribute that makes it required and, in its default state, missing a value; or null. */
  required: string | null;
  /** A state, passed to `formStateRestoreCallback`, and what it submits afterward. */
  restore: [state: string | null, submitted: string | null];
  /** A default of the other kind, which the markup writes, and a way off it. */
  authored: {
    base: string;
    attributes: string;
    content?: string;
    change(element: PunkFormControl): void;
  };
  /** What a click on a `<label for>` does to it. */
  labelClick: 'checked' | 'focus';
}

/** Types into the native control of a field, as a user does. */
function typeInto(element: PunkFormControl, text: string): void {
  const input = element.shadowRoot?.querySelector('input, textarea') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

const options =
  '<option value="">Choose</option><option value="a">Alpha</option><option value="b">Beta</option>';

/** Whether focus is on the control, or on one of its own children, as a radio group's radios. */
const focusedIn = (element: Element): boolean =>
  document.activeElement === element || element.contains(document.activeElement);

/** Picks an option in the native select, as a user does. */
function pick(element: PunkFormControl, index: number): void {
  const select = element.shadowRoot?.querySelector('select') as HTMLSelectElement;
  select.selectedIndex = index;
  select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const controls: Control[] = [
  {
    tag: 'punk-checkbox',
    base: '',
    content: 'Fuel',
    change: (element) => {
      element.click();
    },
    submittedDefault: null,
    submittedChanged: 'on',
    required: 'required',
    restore: ['on', 'on'],
    authored: {
      base: '',
      attributes: 'checked',
      change: (element) => {
        element.click();
      },
    },
    labelClick: 'checked',
  },
  {
    tag: 'punk-switch',
    base: '',
    content: 'Fuel',
    change: (element) => {
      element.click();
    },
    submittedDefault: null,
    submittedChanged: 'on',
    required: 'required',
    restore: ['on', 'on'],
    authored: {
      base: '',
      attributes: 'checked',
      change: (element) => {
        element.click();
      },
    },
    labelClick: 'checked',
  },
  {
    tag: 'punk-slider',
    base: 'label="Speed" value="20"',
    content: '',
    change: (element) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    },
    submittedDefault: '20',
    submittedChanged: '100',
    required: null,
    restore: ['70', '70'],
    authored: {
      base: 'label="Speed"',
      attributes: 'value="60"',
      change: (element) => {
        (element as PunkSlider).value = 5;
      },
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-text-field',
    base: 'label="Callsign"',
    content: '',
    change: (element) => typeInto(element, 'Foxtrot'),
    submittedDefault: '',
    submittedChanged: 'Foxtrot',
    required: 'required',
    restore: ['Golf', 'Golf'],
    authored: {
      base: 'label="Callsign"',
      attributes: 'value="Echo"',
      change: (element) => typeInto(element, 'Hotel'),
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-textarea',
    base: 'label="Log"',
    content: '',
    change: (element) => typeInto(element, 'Belt 3\nblocked'),
    submittedDefault: '',
    submittedChanged: 'Belt 3\nblocked',
    required: 'required',
    restore: ['Golf', 'Golf'],
    authored: {
      base: 'label="Log"',
      attributes: 'value="Echo"',
      change: (element) => typeInto(element, 'Hotel'),
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-radio-group',
    base: 'label="Source"',
    content: '<punk-radio value="a">Alpha</punk-radio><punk-radio value="b">Beta</punk-radio>',
    change: (element) => {
      (element.querySelector('[value="b"]') as HTMLElement).click();
    },
    submittedDefault: null,
    submittedChanged: 'b',
    required: 'required',
    restore: ['a', 'a'],
    authored: {
      base: 'label="Source"',
      attributes: '',
      content:
        '<punk-radio value="a" checked>Alpha</punk-radio><punk-radio value="b">Beta</punk-radio>',
      change: (element) => {
        (element.querySelector('[value="b"]') as HTMLElement).click();
      },
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-combobox',
    base: 'label="Squadron"',
    content: '<option value="a">Alpha</option><option value="b">Beta</option>',
    change: (element) => {
      typeInto(element, 'Beta');
      element.dispatchEvent(new FocusEvent('focusout'));
    },
    submittedDefault: '',
    submittedChanged: 'b',
    required: 'required',
    restore: ['a', 'a'],
    authored: {
      base: 'label="Squadron"',
      attributes: 'value="a"',
      change: (element) => {
        typeInto(element, 'Beta');
        element.dispatchEvent(new FocusEvent('focusout'));
      },
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-number-field',
    base: 'label="Thrust"',
    content: '',
    change: (element) => typeInto(element, '8'),
    submittedDefault: '',
    submittedChanged: '8',
    required: 'required',
    restore: ['6', '6'],
    authored: {
      base: 'label="Thrust"',
      attributes: 'value="5"',
      change: (element) => typeInto(element, '9'),
    },
    labelClick: 'focus',
  },
  {
    tag: 'punk-select',
    base: 'label="Squadron"',
    content: options,
    change: (element) => pick(element, 2),
    submittedDefault: '',
    submittedChanged: 'b',
    required: 'required',
    restore: ['b', 'b'],
    authored: {
      base: 'label="Squadron"',
      attributes: '',
      content:
        '<option value="a">Alpha</option><option value="b" selected>Beta</option><option value="c">Gamma</option>',
      change: (element) => pick(element, 0),
    },
    labelClick: 'focus',
  },
];

beforeEach(addStylesheets);

afterEach(async () => {
  cleanup();
  await commands.setForcedColors(null);
  vi.restoreAllMocks();
});

async function mountForm(control: Control, attributes = '') {
  const form = track(document.createElement('form'));
  form.innerHTML = `<${control.tag} name="field" ${control.base} ${attributes}>${control.content}</${control.tag}>`;
  const element = form.firstElementChild as PunkFormControl;
  await element.updateComplete;
  return { form, element };
}

describe.each(controls)('$tag in a form', (control) => {
  it('submits its value under its name, and nothing before it has one to give', async () => {
    const { form, element } = await mountForm(control);
    expect(new FormData(form).get('field')).toBe(control.submittedDefault);
    control.change(element);
    await element.updateComplete;
    expect(new FormData(form).get('field')).toBe(control.submittedChanged);
  });

  it('reads current straight after the change, before the next update', async () => {
    const { form, element } = await mountForm(control);
    control.change(element);
    expect(new FormData(form).get('field')).toBe(control.submittedChanged);
  });

  it('adds nothing when it has no name', async () => {
    const { form, element } = await mountForm(control);
    element.removeAttribute('name');
    control.change(element);
    await element.updateComplete;
    expect([...new FormData(form).keys()]).toEqual([]);
  });

  it('adds nothing when it is disabled', async () => {
    const { form } = await mountForm(control, 'disabled');
    expect([...new FormData(form).keys()]).toEqual([]);
  });

  it('is found by a form attribute from outside the form', async () => {
    const holder = track(document.createElement('div'));
    holder.innerHTML = `<form id="outer"></form><${control.tag} name="field" form="outer" ${control.base}>${control.content}</${control.tag}>`;
    const element = holder.querySelector(control.tag) as PunkFormControl;
    await element.updateComplete;
    const form = holder.querySelector('form') as HTMLFormElement;
    expect(element.form).toBe(form);
    control.change(element);
    expect(new FormData(form).get('field')).toBe(control.submittedChanged);
  });

  it('is disabled for submission by a disabled fieldset, without its own disabled changing', async () => {
    const form = track(document.createElement('form'));
    form.innerHTML = `<fieldset disabled><${control.tag} name="field" ${control.base}>${control.content}</${control.tag}></fieldset>`;
    const element = form.querySelector(control.tag) as PunkFormControl;
    await element.updateComplete;
    expect(element.disabled).toBe(false);
    expect(element.isDisabled).toBe(true);
    expect([...new FormData(form).keys()]).toEqual([]);
    (form.querySelector('fieldset') as HTMLFieldSetElement).disabled = false;
    await element.updateComplete;
    expect(element.isDisabled).toBe(false);
    expect(new FormData(form).has('field')).toBe(control.submittedDefault !== null);
  });

  it('goes back to the default the markup wrote when the form is reset, not to the live value', async () => {
    const { form, element } = await mountForm(control);
    control.change(element);
    await element.updateComplete;
    form.reset();
    await element.updateComplete;
    expect(new FormData(form).get('field')).toBe(control.submittedDefault);
  });

  it('is reset to a default of the other kind too', async () => {
    const { authored } = control;
    const { form, element } = await mountForm(
      { ...control, base: authored.base, content: authored.content ?? control.content },
      authored.attributes,
    );
    const expected = new FormData(form).get('field');
    expect(expected).not.toBeNull();
    authored.change(element);
    await element.updateComplete;
    expect(new FormData(form).get('field')).not.toBe(expected);
    form.reset();
    await element.updateComplete;
    expect(new FormData(form).get('field')).toBe(expected);
  });

  it('is restored from the state the browser kept', async () => {
    const { form, element } = await mountForm(control);
    element.formStateRestoreCallback(control.restore[0]);
    await element.updateComplete;
    expect(new FormData(form).get('field')).toBe(control.restore[1]);
  });

  it('is named by a label element, and a click on the label reaches the control', async () => {
    const holder = track(document.createElement('div'));
    holder.innerHTML = `<label for="x" id="caption">Caption</label><${control.tag} id="x" name="field" ${control.base}>${control.content}</${control.tag}>`;
    const element = holder.querySelector(control.tag) as PunkFormControl;
    await element.updateComplete;
    expect([...element.labels]).toEqual([holder.querySelector('label')]);
    await userEvent.click(holder.querySelector('#caption') as HTMLElement);
    if (control.labelClick === 'focus') expect(focusedIn(element)).toBe(true);
    else expect((element as unknown as { checked: boolean }).checked).toBe(true);
  });

  it.runIf(control.required !== null)(
    'is missing a value until it has one, when required',
    async () => {
      const { form, element } = await mountForm(control, control.required ?? '');
      expect(element.validity.valueMissing).toBe(true);
      expect(form.checkValidity()).toBe(false);
      expect(element.willValidate).toBe(true);
      control.change(element);
      await element.updateComplete;
      expect(element.validity.valid).toBe(true);
      expect(form.checkValidity()).toBe(true);
    },
  );

  it.runIf(control.required !== null)('is focused when its validity is reported', async () => {
    const { element } = await mountForm(control, control.required ?? '');
    expect(element.reportValidity()).toBe(false);
    expect(focusedIn(element)).toBe(true);
  });

  it.runIf(control.required !== null)('is invalid for the form submission it blocks', async () => {
    const { form, element } = await mountForm(control, control.required ?? '');
    const invalid = vi.fn();
    element.addEventListener('invalid', invalid);
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', submit);
    form.requestSubmit();
    expect(invalid).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it('takes a custom error, and clears it', async () => {
    const { form, element } = await mountForm(control);
    element.setCustomValidity('Not now');
    expect(element.validity.customError).toBe(true);
    expect(element.validationMessage).toBe('Not now');
    expect(form.checkValidity()).toBe(false);
    element.setCustomValidity('');
    expect(element.validity.valid).toBe(true);
    expect(form.checkValidity()).toBe(true);
  });

  it('exposes its form, name, and whether it validates, as a native control does', async () => {
    const { form, element } = await mountForm(control);
    expect(element.form).toBe(form);
    expect(element.name).toBe('field');
    expect(element.willValidate).toBe(true);
  });
});

// A native range is the reference for every key it handles, in each engine and each direction.
describe('punk-slider keys against a native range', () => {
  const ranges = [
    { min: 0, max: 100, step: 1 },
    { min: 0, max: 1, step: 0.1 },
    { min: -5, max: 5, step: 0.5 },
    { min: 0, max: 10, step: 3 },
    { min: 10, max: 20, step: 5 },
  ];
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

  async function nativeAfter(
    range: (typeof ranges)[number],
    start: number,
    key: string,
    dir: string,
  ): Promise<number> {
    const holder = track(document.createElement('div'));
    holder.dir = dir;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(range.min);
    input.max = String(range.max);
    input.step = String(range.step);
    input.value = String(start);
    holder.append(input);
    input.focus();
    await userEvent.keyboard(`{${key}}`);
    const value = Number(input.value);
    holder.remove();
    return value;
  }

  async function ours(
    range: (typeof ranges)[number],
    start: number,
    key: string,
    dir: string,
  ): Promise<number> {
    const holder = track(document.createElement('div'));
    holder.dir = dir;
    holder.innerHTML = `<punk-slider label="Speed" min="${range.min}" max="${range.max}" step="${range.step}"></punk-slider>`;
    const slider = holder.firstElementChild as PunkSlider;
    await slider.updateComplete;
    slider.value = start;
    await slider.updateComplete;
    slider.focus();
    await userEvent.keyboard(`{${key}}`);
    const value = slider.value;
    holder.remove();
    return value;
  }

  // WebKit's native range does not swap Left and Right in right-to-left text, though it draws the
  // range reversed, so those two keys follow Chromium and Firefox and the other keys follow all three.
  const keysFor = (dir: string) =>
    dir === 'rtl' && server.browser === 'webkit'
      ? keys.filter((key) => key !== 'ArrowLeft' && key !== 'ArrowRight')
      : keys;

  for (const dir of ['ltr', 'rtl']) {
    it(`gives what a native range gives for the arrows, Home, and End, in ${dir}`, async () => {
      const differences: string[] = [];
      for (const range of ranges) {
        const starts = [range.min, (range.min + range.max) / 2, range.max, range.min + range.step];
        for (const start of starts) {
          for (const key of keysFor(dir)) {
            const native = await nativeAfter(range, start, key, dir);
            const mine = await ours(range, start, key, dir);
            if (native !== mine) {
              differences.push(
                `${JSON.stringify(range)} from ${start}, ${key}: native ${native}, ours ${mine}`,
              );
            }
          }
        }
      }
      expect(differences).toEqual([]);
    });
  }
});
