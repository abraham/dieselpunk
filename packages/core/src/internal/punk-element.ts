import { LitElement, adoptStyles } from 'lit';
import type { CSSResultGroup, CSSResultOrNative } from 'lit';
import { baseStyles } from '../styles/base.ts';

export abstract class PunkElement extends LitElement {
  // Prepends the shared base styles so subclasses only declare their own `static styles`.
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return [baseStyles, ...super.finalizeStyles(styles)];
  }

  /** Keeps what the user did in a server-rendered tree before the upgrade (specs/ssr.md §4). */
  protected keepServerInput?(root: ShadowRoot): void;

  // A server-rendered root is replaced, never hydrated (specs/ssr.md §4). Not calling super keeps
  // Lit's hydration support, which patches it, from hydrating.
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = this.shadowRoot;
    if (!root) return super.createRenderRoot();
    if (root.activeElement) void this.updateComplete.then(() => this.focus());
    this.keepServerInput?.(root);
    root.replaceChildren();
    adoptStyles(root, (this.constructor as typeof LitElement).elementStyles);
    return root;
  }

  protected emit<T = undefined>(name: `punk-${string}`, detail?: T): CustomEvent<T | undefined> {
    const event = new CustomEvent(name, { bubbles: true, composed: true, detail });
    this.dispatchEvent(event);
    return event;
  }
}
