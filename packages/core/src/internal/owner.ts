// The protocol between a container and the light-DOM children it manages (specs/component-model.md
// §8). The members are keyed by symbols, so an application cannot call them by accident.

/** On a child: the container that manages it, set and cleared by that container. */
export const owner = Symbol('punk.owner');

/** On an owner: something it depends on changed on `child`. */
export const childChanged = Symbol('punk.childChanged');

/** On an owner: `child` leaves; stop managing it and give back what was written to it. */
export const release = Symbol('punk.release');

export interface Owner<Child extends Element = Element> {
  /** Called with the properties that changed, as Lit reports them. */
  [childChanged](child: Child, changed: ReadonlyMap<PropertyKey, unknown>): void;
  [release](child: Child): void;
}

export interface Owned<Child extends Element = Element> {
  [owner]: Owner<Child> | null;
}

type Disableable = Element & { disabled: boolean };

function setAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

/**
 * What an owner wrote to elements it does not own: each attribute's value before the first write,
 * and the elements it disabled, so it gives back exactly what the author had.
 */
export class Ledger {
  readonly #attributes = new Map<Element, Map<string, string | null>>();
  readonly #disabled = new Set<Disableable>();

  /** Sets `name`, or removes it for `null`, remembering the author's value the first time. */
  write(element: Element, name: string, value: string | null): void {
    let authored = this.#attributes.get(element);
    if (!authored) this.#attributes.set(element, (authored = new Map()));
    if (!authored.has(name)) authored.set(name, element.getAttribute(name));
    if (element.getAttribute(name) !== value) setAttribute(element, name, value);
  }

  /** The author's value of `name`: what it was before the first write, or what it is now. */
  authored(element: Element, name: string): string | null {
    const authored = this.#attributes.get(element);
    return authored?.has(name) ? (authored.get(name) ?? null) : element.getAttribute(name);
  }

  /** Disables `element` unless it already is, and remembers that it did. */
  disable(element: Disableable): void {
    if (element.disabled) return;
    element.disabled = true;
    this.#disabled.add(element);
  }

  /** Enables `element` again if this ledger disabled it. */
  enable(element: Disableable): void {
    if (this.#disabled.delete(element)) element.disabled = false;
  }

  /** Gives back everything written to `element`. */
  restore(element: Element): void {
    for (const [name, value] of this.#attributes.get(element) ?? []) {
      setAttribute(element, name, value);
    }
    this.#attributes.delete(element);
    this.enable(element as Disableable);
  }

  /** Gives back everything written to every element not in `keep`. */
  restoreAll(keep: ReadonlySet<Element> = new Set()): void {
    for (const element of new Set([...this.#attributes.keys(), ...this.#disabled])) {
      if (!keep.has(element)) this.restore(element);
    }
  }
}
