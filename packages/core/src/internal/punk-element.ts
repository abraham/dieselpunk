import { LitElement, adoptStyles } from 'lit';
import type { CSSResultGroup, CSSResultOrNative, PropertyValues } from 'lit';
import { baseStyles } from '../styles/base.ts';
import { hydration, setHydrating } from './server-values.ts';

export abstract class PunkElement extends LitElement {
  // Prepends the shared base styles so subclasses only declare their own `static styles`.
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return [baseStyles, ...super.finalizeStyles(styles)];
  }

  /** Keeps what the user did in a server-rendered tree before the upgrade (specs/ssr.md §4). */
  protected keepServerInput?(root: ShadowRoot): void;

  // A server-rendered root is replaced (specs/ssr.md §4), unless `hydrate.js` claims it (§5).
  // Replacing does not call super, which Lit's hydration support patches to hydrate.
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    const root = this.shadowRoot;
    if (!root) return super.createRenderRoot();
    this.keepServerInput?.(root);
    const hydrating = hydration?.claim(this, root);
    if (!hydrating) {
      if (root.activeElement) void this.updateComplete.then(() => this.focus());
      root.replaceChildren();
    }
    adoptStyles(root, (this.constructor as typeof LitElement).elementStyles);
    return hydrating ? super.createRenderRoot() : root;
  }

  protected override performUpdate(): void {
    if (hydration) hydration.update(this, () => super.performUpdate());
    else super.performUpdate();
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    // `updated()` sees the page, not the server.
    setHydrating(false);
  }

  protected emit<T = undefined>(name: `punk-${string}`, detail?: T): CustomEvent<T | undefined> {
    const event = new CustomEvent(name, { bubbles: true, composed: true, detail });
    this.dispatchEvent(event);
    return event;
  }
}
