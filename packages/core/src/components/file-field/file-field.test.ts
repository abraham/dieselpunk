import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../../test/browser/helpers.ts';
import { setLocale } from '../../../test/browser/locale.ts';
import './register.ts';
import type { PunkFileField } from './index.ts';

afterEach(async () => {
  cleanup();
  await setLocale('en');
  vi.restoreAllMocks();
});

async function mount(attributes = 'label="Plans"', parent?: HTMLElement): Promise<PunkFileField> {
  const wrapper = parent ?? track(document.createElement('div'));
  wrapper.insertAdjacentHTML('beforeend', `<punk-file-field ${attributes}></punk-file-field>`);
  const element = wrapper.lastElementChild as PunkFileField;
  await element.updateComplete;
  return element;
}

const input = (element: Element) => element.shadowRoot?.querySelector('input') as HTMLInputElement;
const part = (element: Element, name: string) =>
  element.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement;
const zone = (element: Element) => element.shadowRoot?.querySelector('.box') as HTMLElement;

const plan = () => new File(['x'.repeat(1540)], 'plan.pdf', { type: 'application/pdf' });
const photo = () => new File(['y'.repeat(20)], 'belt.jpg', { type: 'image/jpeg' });

function transfer(...files: File[]): DataTransfer {
  const data = new DataTransfer();
  for (const file of files) data.items.add(file);
  return data;
}

/** Chooses files as the platform's chooser does. */
function choose(element: PunkFileField, ...files: File[]): void {
  input(element).files = transfer(...files).files;
  input(element).dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input(element).dispatchEvent(new Event('change', { bubbles: true }));
}

function drag(element: PunkFileField, type: 'dragover' | 'drop', ...files: File[]): DragEvent {
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    dataTransfer: transfer(...files),
  });
  zone(element).dispatchEvent(event);
  return event;
}

const listed = (element: PunkFileField) =>
  [...part(element, 'list').querySelectorAll('li')].map((item) =>
    item.textContent?.replace(/\s+/g, ' ').trim(),
  );

describe('choosing', () => {
  it('is a native file input named by its label, with accept and multiple passed through', async () => {
    const element = await mount('label="Plans" accept=".pdf,image/*" multiple');
    expect(input(element).type).toBe('file');
    expect(input(element).labels?.[0]?.textContent).toBe('Plans');
    expect(input(element).accept).toBe('.pdf,image/*');
    expect(input(element).multiple).toBe(true);
    expect(part(element, 'list').hidden).toBe(true);
    expect(part(element, 'drop')).toBeNull();
  });

  it('lists the chosen files with their sizes, and sends input and a change from the host', async () => {
    const element = await mount('label="Plans" multiple');
    const events: string[] = [];
    element.addEventListener('input', () => events.push('input'));
    element.addEventListener('change', () => events.push('change'));
    choose(element, plan(), photo());
    await element.updateComplete;
    expect(events).toEqual(['input', 'change']);
    expect(element.files?.length).toBe(2);
    expect(part(element, 'list').hidden).toBe(false);
    expect(listed(element)).toEqual(['plan.pdf 1.5 kB', 'belt.jpg 20 byte']);
  });

  it('formats sizes for the page language', async () => {
    const holder = track(document.createElement('div'));
    holder.lang = 'de';
    const element = await mount('label="Pläne"', holder);
    choose(element, plan());
    await element.updateComplete;
    expect(listed(element)).toEqual(['plan.pdf 1,5 kB']);
  });
});

describe('form', () => {
  async function inForm(attributes: string) {
    const form = track(document.createElement('form'));
    form.innerHTML = `<punk-file-field ${attributes}></punk-file-field>`;
    const element = form.firstElementChild as PunkFileField;
    await element.updateComplete;
    return { form, element };
  }

  it('submits each chosen file under its name, and nothing before', async () => {
    const { form, element } = await inForm('label="Plans" name="plans" multiple');
    expect(new FormData(form).getAll('plans')).toEqual([]);
    choose(element, plan());
    expect((new FormData(form).getAll('plans') as File[]).map((file) => file.name)).toEqual([
      'plan.pdf',
    ]);
    choose(element, plan(), photo());
    expect((new FormData(form).getAll('plans') as File[]).map((file) => file.name)).toEqual([
      'plan.pdf',
      'belt.jpg',
    ]);
  });

  it('submits nothing without a name, and clears the choice on reset', async () => {
    const { form, element } = await inForm('label="Plans"');
    choose(element, plan());
    expect([...new FormData(form).keys()]).toEqual([]);
    form.reset();
    await element.updateComplete;
    expect(element.files?.length ?? 0).toBe(0);
    expect(part(element, 'list').hidden).toBe(true);
  });

  it('is missing a value while required and empty', async () => {
    const { element } = await inForm('label="Plans" name="plans" required');
    expect(element.validity.valueMissing).toBe(true);
    choose(element, plan());
    expect(element.validity.valid).toBe(true);
  });

  it('focuses its input when its validity is reported, and is disabled by a fieldset', async () => {
    const { form, element } = await inForm('label="Plans" name="plans" required');
    expect(element.reportValidity()).toBe(false);
    expect(element.shadowRoot?.activeElement).toBe(input(element));
    const fieldset = document.createElement('fieldset');
    form.append(fieldset);
    fieldset.append(element);
    fieldset.disabled = true;
    await element.updateComplete;
    expect(input(element).disabled).toBe(true);
    choose(element, plan());
    expect([...new FormData(form).keys()]).toEqual([]);
  });
});

describe('drop zone', () => {
  it('says files can be dropped, in the page locale', async () => {
    const element = await mount('label="Plans" drop-zone');
    expect(part(element, 'drop').textContent?.trim()).toBe('or drop files here');
    await setLocale('de');
    await vi.waitFor(() =>
      expect(part(element, 'drop').textContent?.trim()).toBe('oder Dateien hier ablegen'),
    );
  });

  it('takes dragged files, shows that it does, and keeps them when dropped', async () => {
    const element = await mount('label="Plans" drop-zone multiple');
    const events: string[] = [];
    element.addEventListener('change', () => events.push('change'));
    expect(drag(element, 'dragover', plan()).defaultPrevented).toBe(true);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.dragging')).toBeTruthy();
    expect(drag(element, 'drop', plan(), photo()).defaultPrevented).toBe(true);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.dragging')).toBeNull();
    expect(listed(element)).toEqual(['plan.pdf 1.5 kB', 'belt.jpg 20 byte']);
    expect(events).toEqual(['change']);
  });

  it('leaves out kinds that accept does not name, and keeps one file unless multiple', async () => {
    const single = await mount('label="Plans" drop-zone accept=".pdf"');
    drag(single, 'drop', photo(), plan(), plan());
    await single.updateComplete;
    expect(listed(single)).toEqual(['plan.pdf 1.5 kB']);
    const none = await mount('label="Plans" drop-zone accept=".pdf"');
    expect(drag(none, 'drop', photo()).defaultPrevented).toBe(true);
    expect(none.files?.length ?? 0).toBe(0);
  });

  it('takes nothing without drop-zone, or while disabled', async () => {
    const plain = await mount();
    expect(drag(plain, 'dragover', plan()).defaultPrevented).toBe(false);
    expect(drag(plain, 'drop', plan()).defaultPrevented).toBe(false);
    expect(plain.files?.length ?? 0).toBe(0);
    const disabled = await mount('label="Plans" drop-zone disabled');
    expect(drag(disabled, 'drop', plan()).defaultPrevented).toBe(false);
    expect(disabled.files?.length ?? 0).toBe(0);
  });
});

describe('layout', () => {
  it('fits a long file name and the drop words inside a narrow container', async () => {
    const holder = track(document.createElement('div'));
    holder.style.inlineSize = '187px';
    const element = await mount('label="Zeichnungen für das Nordwerk" drop-zone', holder);
    choose(element, new File(['z'], 'Zwischenproduktverarbeitungsanlage-Nordwerk.pdf'));
    await element.updateComplete;
    expect(holder.scrollWidth).toBeLessThanOrEqual(188);
  });
});
