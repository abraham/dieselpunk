import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import '../components/button/register.ts';
import type { PunkButton } from '../components/button/index.ts';
import { describeAnchor, resolveAnchor, wireAnchorState } from './anchor.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pair(anchorHtml: string): {
  wrapper: HTMLElement;
  anchor: HTMLElement;
  host: HTMLElement;
} {
  const wrapper = track(document.createElement('div'));
  wrapper.innerHTML = `${anchorHtml}<p id="host">Saves the file</p>`;
  return {
    wrapper,
    anchor: wrapper.firstElementChild as HTMLElement,
    host: wrapper.querySelector('#host') as HTMLElement,
  };
}

describe('resolveAnchor', () => {
  it('is the previous sibling without a for, and the element with that id with one', () => {
    const { wrapper, anchor, host } = pair('<button id="a">A</button>');
    expect(resolveAnchor(host, '')).toBe(anchor);
    wrapper.insertAdjacentHTML('afterbegin', '<button id="far">Far</button>');
    expect(resolveAnchor(host, 'far')?.id).toBe('far');
    expect(resolveAnchor(host, 'missing')).toBeNull();
  });

  it('is null with no previous sibling', () => {
    const wrapper = track(document.createElement('div'));
    wrapper.innerHTML = '<p id="only"></p>';
    expect(resolveAnchor(wrapper.firstElementChild as HTMLElement, '')).toBeNull();
  });

  it('looks in the root of the host, so a for does not reach across a shadow root', () => {
    const outside = track(document.createElement('button'));
    outside.id = 'outside';
    const shadowHost = track(document.createElement('div'));
    const root = shadowHost.attachShadow({ mode: 'open' });
    const host = root.appendChild(document.createElement('p'));
    expect(resolveAnchor(host, 'outside')).toBeNull();
  });
});

describe('describeAnchor', () => {
  it('adds the host to aria-describedby beside what was there, and removes only itself', () => {
    const { anchor, host } = pair('<button aria-describedby="other">A</button>');
    host.removeAttribute('id');
    const unwire = describeAnchor(host, anchor, () => {});
    expect(anchor.getAttribute('aria-describedby')).toBe(`other ${host.id}`);
    expect(host.getAttribute('role')).toBe('tooltip');
    unwire?.();
    expect(anchor.getAttribute('aria-describedby')).toBe('other');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('id')).toBe(false);
  });

  it('keeps an id and a role the author gave the host', () => {
    const { anchor, host } = pair('<button>A</button>');
    host.setAttribute('role', 'note');
    host.id = 'mine';
    describeAnchor(host, anchor, () => {})?.();
    expect(host.id).toBe('mine');
    expect(host.getAttribute('role')).toBe('note');
  });

  it('hands the text to a punk-button, and keeps it current', async () => {
    const { anchor, host } = pair('<punk-button>Save</punk-button>');
    const button = anchor as PunkButton;
    await button.updateComplete;
    const unwire = describeAnchor(host, anchor, () => {});
    await button.updateComplete;
    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    const text = () =>
      button.shadowRoot?.getElementById(inner.getAttribute('aria-describedby') ?? '')?.textContent;
    expect(text()).toBe('Saves the file');
    host.textContent = 'Changed';
    await vi.waitFor(async () => {
      await button.updateComplete;
      expect(text()).toBe('Changed');
    });
    unwire?.();
    await button.updateComplete;
    expect(inner.hasAttribute('aria-describedby')).toBe(false);
  });

  it('waits for an undefined custom element, and asks to try again', async () => {
    const { anchor, host } = pair('<punk-never-defined></punk-never-defined>');
    const retry = vi.fn();
    expect(describeAnchor(host, anchor, retry)).toBeUndefined();
    customElements.define('punk-never-defined', class extends HTMLElement {});
    await vi.waitFor(() => expect(retry).toHaveBeenCalledOnce());
  });
});

describe('wireAnchorState', () => {
  it('sets aria-expanded and aria-haspopup on a native anchor, and gives them back', () => {
    const { anchor } = pair('<button>Menu</button>');
    const state = wireAnchorState(anchor, 'menu');
    expect(anchor.getAttribute('aria-expanded')).toBe('false');
    expect(anchor.getAttribute('aria-haspopup')).toBe('menu');
    state.setExpanded(true);
    expect(anchor.getAttribute('aria-expanded')).toBe('true');
    state.unwire();
    expect(anchor.hasAttribute('aria-expanded')).toBe(false);
    expect(anchor.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('keeps an aria-haspopup the author set, and restores aria-expanded', () => {
    const { anchor } = pair('<button aria-haspopup="listbox" aria-expanded="true">Menu</button>');
    const state = wireAnchorState(anchor, 'menu');
    expect(anchor.getAttribute('aria-haspopup')).toBe('listbox');
    state.unwire();
    expect(anchor.getAttribute('aria-haspopup')).toBe('listbox');
    expect(anchor.getAttribute('aria-expanded')).toBe('true');
  });

  it('leaves aria-haspopup off when there is none to set', () => {
    const { anchor } = pair('<button>Show</button>');
    wireAnchorState(anchor, null);
    expect(anchor.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('writes to the inner button of a punk-button, not to its host', async () => {
    const { anchor } = pair('<punk-button>Menu</punk-button>');
    const button = anchor as PunkButton;
    await button.updateComplete;
    const state = wireAnchorState(anchor, 'menu');
    await button.updateComplete;
    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect(inner.getAttribute('aria-expanded')).toBe('false');
    expect(inner.getAttribute('aria-haspopup')).toBe('menu');
    expect(anchor.hasAttribute('aria-expanded')).toBe(false);
    state.setExpanded(true);
    await button.updateComplete;
    expect(inner.getAttribute('aria-expanded')).toBe('true');
    state.unwire();
    await button.updateComplete;
    expect(inner.hasAttribute('aria-expanded')).toBe(false);
    expect(inner.hasAttribute('aria-haspopup')).toBe(false);
  });
});

describe('PunkButtonBase protocol', () => {
  it('changes only the properties it is given', async () => {
    const { anchor } = pair('<punk-button>Save</punk-button>');
    const button = anchor as PunkButton;
    button.setExternalAria({ expanded: true, haspopup: 'dialog' });
    button.setExternalAria({ expanded: false });
    await button.updateComplete;
    const inner = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect(inner.getAttribute('aria-expanded')).toBe('false');
    expect(inner.getAttribute('aria-haspopup')).toBe('dialog');
  });
});
