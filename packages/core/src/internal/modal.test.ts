import { html } from 'lit';
import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import { registerElement } from '../utilities/register-element.ts';
import { ModalController, acquireScrollLock, firstTabbable } from './modal.ts';
import { overlayStack } from './overlays.ts';
import { PunkElement } from './punk-element.ts';

// The smallest component that uses the controller: chrome in the shadow tree, content slotted.
class TestModal extends PunkElement {
  modal = true;
  dismissible = true;
  closed = vi.fn<(reason: string, value?: string) => void>();
  readonly controller = new ModalController({
    dialog: () => this.renderRoot.querySelector('dialog'),
    modal: () => this.modal,
    dismissible: () => this.dismissible,
    contentRoots: () => [...this.children],
    onClose: (reason, value) => this.closed(reason, value),
  });

  protected override render() {
    return html`<dialog>
      <button class="chrome" type="button">Close</button>
      <slot></slot>
    </dialog>`;
  }

  get dialog(): HTMLDialogElement {
    return this.renderRoot.querySelector('dialog') as HTMLDialogElement;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.controller.dispose();
  }
}
registerElement('punk-test-modal', TestModal);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function mount(
  content = '<button id="first">First</button><button id="second">Second</button>',
) {
  const element = document.createElement('punk-test-modal') as TestModal;
  element.innerHTML = content;
  track(element);
  await element.updateComplete;
  return element;
}

const deepActive = (): Element | null => {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
};

describe('ModalController', () => {
  it('opens as a modal, and closes with the reason and value', async () => {
    const element = await mount();
    element.controller.open();
    expect(element.dialog.open).toBe(true);
    expect(element.dialog.matches(':modal')).toBe(true);
    element.controller.close('method', 'done');
    expect(element.dialog.open).toBe(false);
    expect(element.closed).toHaveBeenCalledExactlyOnceWith('method', 'done');
  });

  it('opens a non-modal dialog without making the page inert', async () => {
    const element = await mount();
    element.modal = false;
    element.controller.open();
    expect(element.dialog.open).toBe(true);
    expect(element.dialog.matches(':modal')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('opens and closes only once however often it is asked', async () => {
    const element = await mount();
    element.controller.open();
    element.controller.open();
    element.controller.close('method');
    element.controller.close('method');
    expect(element.closed).toHaveBeenCalledOnce();
  });

  describe('initial focus', () => {
    it('goes to an element marked autofocus', async () => {
      const element = await mount('<button id="a">A</button><input id="b" autofocus />');
      element.controller.open();
      expect(deepActive()?.id).toBe('b');
    });

    it('goes to the first tabbable content, not the chrome button that comes first', async () => {
      const element = await mount();
      element.controller.open();
      expect(deepActive()?.id).toBe('first');
    });

    it('skips disabled and hidden content', async () => {
      const element = await mount(
        '<button disabled>Off</button><button hidden>Gone</button><button id="third">Third</button>',
      );
      element.controller.open();
      expect(deepActive()?.id).toBe('third');
    });

    it('goes to the dialog itself when there is nothing to focus', async () => {
      const element = await mount('<p>Text only</p>');
      element.controller.open();
      expect(deepActive()).toBe(element.dialog);
      expect(element.dialog.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('focus return', () => {
    it('goes back to the opener', async () => {
      const opener = track(document.createElement('button'));
      opener.textContent = 'Open';
      opener.focus();
      const element = await mount();
      element.controller.open();
      element.controller.close('method');
      expect(document.activeElement).toBe(opener);
    });

    it('goes back to an opener inside another shadow root', async () => {
      const host = track(document.createElement('div'));
      const root = host.attachShadow({ mode: 'open' });
      const opener = root.appendChild(document.createElement('button'));
      opener.focus();
      const element = await mount();
      element.controller.open();
      element.controller.close('method');
      expect(root.activeElement).toBe(opener);
    });

    it('does nothing when the opener has been removed', async () => {
      const opener = track(document.createElement('button'));
      opener.focus();
      const element = await mount();
      element.controller.open();
      opener.remove();
      expect(() => element.controller.close('method')).not.toThrow();
    });
  });

  describe('Escape', () => {
    it('closes a dismissible dialog, with the reason escape', async () => {
      const element = await mount();
      element.controller.open();
      await userEvent.keyboard('{Escape}');
      expect(element.dialog.open).toBe(false);
      expect(element.closed).toHaveBeenCalledExactlyOnceWith('escape', undefined);
    });

    it('does not close a dialog that is not dismissible', async () => {
      const element = await mount();
      element.dismissible = false;
      element.controller.open();
      await userEvent.keyboard('{Escape}');
      expect(element.dialog.open).toBe(true);
      expect(element.closed).not.toHaveBeenCalled();
    });

    it('closes only the topmost overlay', async () => {
      const element = await mount();
      element.controller.open();
      const above = { dismissible: true, close: vi.fn(() => overlayStack.remove(above)) };
      overlayStack.push(above);
      await userEvent.keyboard('{Escape}');
      expect(above.close).toHaveBeenCalledOnce();
      expect(element.dialog.open).toBe(true);
      await userEvent.keyboard('{Escape}');
      expect(element.dialog.open).toBe(false);
    });

    it('treats the native cancel event as Escape, and stops the platform closing it', async () => {
      const element = await mount();
      element.controller.open();
      const event = new Event('cancel', { cancelable: true });
      element.dialog.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(element.closed).toHaveBeenCalledExactlyOnceWith('escape', undefined);
    });

    it('keeps a cancel event from closing a dialog that is not dismissible', async () => {
      const element = await mount();
      element.dismissible = false;
      element.controller.open();
      element.dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      expect(element.dialog.open).toBe(true);
    });
  });

  it('is on the Escape stack only while open', async () => {
    const element = await mount();
    const before = overlayStack.size;
    element.controller.open();
    expect(overlayStack.size).toBe(before + 1);
    element.controller.close('method');
    expect(overlayStack.size).toBe(before);
  });

  it('ignores a click on the dialog itself, which is what a backdrop click is', async () => {
    const element = await mount();
    element.controller.open();
    element.dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(element.dialog.open).toBe(true);
  });

  it('closes when the platform closes the dialog by another route', async () => {
    const element = await mount();
    element.controller.open();
    element.dialog.close();
    await vi.waitFor(() =>
      expect(element.closed).toHaveBeenCalledExactlyOnceWith('method', undefined),
    );
  });

  it('works without showModal, with a fixed-position fallback, and still returns focus', async () => {
    const opener = track(document.createElement('button'));
    opener.focus();
    const element = await mount();
    Object.defineProperty(element.dialog, 'showModal', { value: undefined, configurable: true });
    element.controller.open();
    expect(element.dialog.hasAttribute('open')).toBe(true);
    expect('fallback' in element.dialog.dataset).toBe(true);
    expect(document.activeElement).not.toBe(opener);
    element.controller.close('method');
    expect(element.dialog.hasAttribute('open')).toBe(false);
    expect('fallback' in element.dialog.dataset).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('lets go of everything when disposed, without sending events', async () => {
    const element = await mount();
    const before = overlayStack.size;
    element.controller.open();
    element.controller.dispose();
    expect(overlayStack.size).toBe(before);
    expect(document.documentElement.style.overflow).toBe('');
    expect(element.closed).not.toHaveBeenCalled();
  });
});

describe('scroll lock', () => {
  afterEach(() => document.documentElement.style.removeProperty('overflow'));

  it('is held while a modal is open, and not for a non-modal one', async () => {
    const element = await mount();
    element.controller.open();
    expect(document.documentElement.style.overflow).toBe('hidden');
    element.controller.close('method');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('counts: two locks released in either order leave the author overflow as it was', () => {
    document.documentElement.style.setProperty('overflow', 'scroll', 'important');
    for (const order of [
      [0, 1],
      [1, 0],
    ] as const) {
      const releases = [acquireScrollLock(), acquireScrollLock()];
      expect(document.documentElement.style.overflow).toBe('hidden');
      releases[order[0]]?.();
      expect(document.documentElement.style.overflow).toBe('hidden');
      releases[order[1]]?.();
      expect(document.documentElement.style.overflow).toBe('scroll');
      expect(document.documentElement.style.getPropertyPriority('overflow')).toBe('important');
    }
  });

  it('does nothing when a release is called a second time', () => {
    const first = acquireScrollLock();
    const second = acquireScrollLock();
    first();
    first();
    expect(document.documentElement.style.overflow).toBe('hidden');
    second();
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('firstTabbable', () => {
  it('finds delegating custom elements and tabindex, and skips negative tabindex', () => {
    const host = track(document.createElement('div'));
    host.innerHTML = '<span tabindex="-1">no</span><div id="yes" tabindex="0">yes</div>';
    expect(firstTabbable([host])?.id).toBe('yes');

    const delegating = track(document.createElement('div'));
    delegating.attachShadow({ mode: 'open', delegatesFocus: true });
    delegating.id = 'delegating';
    const wrapper = track(document.createElement('div'));
    wrapper.append(delegating);
    expect(firstTabbable([wrapper])?.id).toBe('delegating');
  });
});
