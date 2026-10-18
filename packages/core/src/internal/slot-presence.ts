import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { serverValues } from './server-values.ts';

/**
 * Tracks which slots have light-DOM content, so empty regions can be hidden.
 * The empty name `''` is the default slot, which also counts non-blank text.
 */
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
    return !serverValues() && this.#present.has(name);
  }

  /** Bind to `@slotchange` on each tracked slot. */
  readonly handleSlotChange = (): void => {
    this.#refresh();
  };

  #has(name: string): boolean {
    return Array.from(this.#host.childNodes).some((node) => {
      if (node instanceof Element) return (node.getAttribute('slot') ?? '') === name;
      return name === '' && node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim());
    });
  }

  #refresh(): void {
    const next = new Set(this.#names.filter((name) => this.#has(name)));
    const unchanged =
      next.size === this.#present.size && [...next].every((n) => this.#present.has(n));
    if (unchanged) return;
    this.#present = next;
    this.#host.requestUpdate();
  }
}
