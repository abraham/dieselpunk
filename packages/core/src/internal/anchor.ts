import { uid } from './ids.ts';

export type PopupKind = 'menu' | 'dialog' | 'true';

/**
 * ARIA that an anchor cannot be given by an id reference, because its focus target is inside a
 * shadow root. `description` is the description's text, not an id.
 */
export interface ExternalAria {
  description?: string | null;
  expanded?: boolean | null;
  haspopup?: PopupKind | null;
}

/** An anchor, such as `punk-button`, that writes this ARIA to its own inner control. */
export interface ExternalAriaAnchor extends HTMLElement {
  setExternalAria(aria: ExternalAria): void;
}

export function isExternalAriaAnchor(element: Element): element is ExternalAriaAnchor {
  return typeof (element as Partial<ExternalAriaAnchor>).setExternalAria === 'function';
}

/** The element with id `forId` in `host`'s root, else the previous sibling. */
export function resolveAnchor(host: HTMLElement, forId: string): HTMLElement | null {
  if (forId) {
    const root = host.getRootNode() as Document | ShadowRoot;
    return root.getElementById(forId);
  }
  const previous = host.previousElementSibling;
  return previous instanceof HTMLElement ? previous : null;
}

function tokens(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Makes `host`'s text the accessible description of `anchor`, and returns the function that
 * takes it away again, removing only what it added. `retry` is called when the anchor is a
 * custom element that was not defined yet and now is.
 */
export function describeAnchor(
  host: HTMLElement,
  anchor: HTMLElement,
  retry: () => void,
): (() => void) | undefined {
  if (isExternalAriaAnchor(anchor)) {
    const push = (): void =>
      anchor.setExternalAria({ description: host.textContent?.trim() ?? '' });
    push();
    const observer = new MutationObserver(push);
    observer.observe(host, { childList: true, characterData: true, subtree: true });
    return () => {
      observer.disconnect();
      anchor.setExternalAria({ description: null });
    };
  }

  if (anchor.localName.includes('-') && !customElements.get(anchor.localName)) {
    void customElements.whenDefined(anchor.localName).then(retry);
    return undefined;
  }

  const ownedId = !host.id;
  if (ownedId) host.id = uid(host.localName);
  const ownedRole = !host.hasAttribute('role');
  if (ownedRole) host.setAttribute('role', 'tooltip');
  const id = host.id;
  anchor.setAttribute(
    'aria-describedby',
    [...tokens(anchor.getAttribute('aria-describedby')), id].join(' '),
  );

  return () => {
    const remaining = tokens(anchor.getAttribute('aria-describedby')).filter(
      (token) => token !== id,
    );
    if (remaining.length > 0) anchor.setAttribute('aria-describedby', remaining.join(' '));
    else anchor.removeAttribute('aria-describedby');
    if (ownedRole) host.removeAttribute('role');
    if (ownedId) host.removeAttribute('id');
  };
}

export interface AnchorState {
  /** Tells the anchor whether the popup it opens is showing. */
  setExpanded(expanded: boolean): void;
  /** Gives the anchor back what it had before. */
  unwire(): void;
}

/**
 * Marks `anchor` as the trigger of a popup: `aria-expanded`, and `aria-haspopup` for a menu or
 * dialog. Values the author already set on a native anchor are kept and restored.
 */
export function wireAnchorState(anchor: HTMLElement, haspopup: PopupKind | null): AnchorState {
  if (isExternalAriaAnchor(anchor)) {
    anchor.setExternalAria({ expanded: false, haspopup });
    return {
      setExpanded: (expanded) => anchor.setExternalAria({ expanded }),
      unwire: () => anchor.setExternalAria({ expanded: null, haspopup: null }),
    };
  }

  const previous = {
    expanded: anchor.getAttribute('aria-expanded'),
    haspopup: anchor.getAttribute('aria-haspopup'),
  };
  anchor.setAttribute('aria-expanded', 'false');
  if (haspopup && previous.haspopup === null) anchor.setAttribute('aria-haspopup', haspopup);
  const ownsHaspopup = Boolean(haspopup) && previous.haspopup === null;

  return {
    setExpanded: (expanded) => anchor.setAttribute('aria-expanded', String(expanded)),
    unwire() {
      if (previous.expanded === null) anchor.removeAttribute('aria-expanded');
      else anchor.setAttribute('aria-expanded', previous.expanded);
      if (ownsHaspopup) anchor.removeAttribute('aria-haspopup');
    },
  };
}
