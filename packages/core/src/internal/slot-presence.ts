import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** Tracks which named slots have a light-DOM child, so empty regions can be hidden. */
export class SlotPresence implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  readonly #names: readonly string[];
  #present = new Set<string>();

  constructor(host: ReactiveControllerHost & HTMLElement, names: readonly string[]) {
    this.#host = host;
    this.#names = names;
    host.addController(this);
  }

  hostConnected(): void {
    this.#refresh();
  }

  has(name: string): boolean {
    return this.#present.has(name);
  }

  /** Bind to `@slotchange` on each tracked slot. */
  readonly handleSlotChange = (): void => {
    this.#refresh();
  };

  #refresh(): void {
    const children = Array.from(this.#host.children);
    const next = new Set(
      this.#names.filter((name) => children.some((child) => child.getAttribute('slot') === name)),
    );
    const unchanged =
      next.size === this.#present.size && [...next].every((n) => this.#present.has(n));
    if (unchanged) return;
    this.#present = next;
    this.#host.requestUpdate();
  }
}
