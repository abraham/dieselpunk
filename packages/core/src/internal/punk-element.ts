import { LitElement } from 'lit';
import type { CSSResultGroup, CSSResultOrNative } from 'lit';
import { baseStyles } from '../styles/base.ts';

export abstract class PunkElement extends LitElement {
  // Prepends the shared base styles so subclasses only declare their own `static styles`.
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return [baseStyles, ...super.finalizeStyles(styles)];
  }

  protected emit<T = undefined>(name: `punk-${string}`, detail?: T): CustomEvent<T | undefined> {
    const event = new CustomEvent(name, { bubbles: true, composed: true, detail });
    this.dispatchEvent(event);
    return event;
  }
}
