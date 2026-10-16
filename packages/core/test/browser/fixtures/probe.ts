import { css, html } from 'lit';
import { PunkElement } from '../../../src/internal/punk-element.ts';
import { token, tokenNames, tokenValue } from '../../../src/tokens/token.ts';

/**
 * Stand-in for a real component: built with `PunkElement` and `token()` exactly as components
 * will be, and exposes every token's resolved value so tests can read what a component would see.
 */
export class PunkProbe extends PunkElement {
  static override styles = css`
    :host {
      display: block;
      height: ${token('control-height-md')};
      padding: ${token('space-3')};
      border: ${token('border-width')} solid ${token('color-edge-dark')};
      border-radius: ${token('radius')};
      background: ${token('color-panel')};
    }
  `;

  /** Counts connections so tests can prove an element was restyled, not re-created. */
  connections = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.connections++;
  }

  protected override render() {
    return html`${tokenNames.map(
      (name) => html`<i data-token=${name} style="--probe: ${tokenValue(name)}"></i>`,
    )}`;
  }
}

if (!customElements.get('punk-probe')) {
  customElements.define('punk-probe', PunkProbe);
}
