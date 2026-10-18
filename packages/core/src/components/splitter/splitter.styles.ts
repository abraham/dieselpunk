import { css } from 'lit';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The start pane takes its share of the space left after the divider, and the end pane the rest.
// The divider is a raised bar with a grip of three lines, which reads as something to drag
// without color, and gets a 40px target under a coarse pointer.
export const splitterStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  .split {
    --_bar: 8px;
    display: grid;
    grid-template-columns:
      calc((100% - var(--_bar)) * var(--_ratio))
      var(--_bar)
      minmax(0, 1fr);
    inline-size: 100%;
    block-size: 100%;
  }

  .split.vertical {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows:
      calc((100% - var(--_bar)) * var(--_ratio))
      var(--_bar)
      minmax(0, 1fr);
  }

  .pane {
    min-inline-size: 0;
    min-block-size: 0;
    overflow: auto;
  }

  .separator {
    ${raisedSurface}
    position: relative;
    display: grid;
    place-items: center;
    cursor: col-resize;
    touch-action: none;
    outline: none;
  }

  .vertical .separator {
    cursor: row-resize;
  }

  .grip {
    inline-size: 2px;
    block-size: 16px;
    border-inline: 2px solid ${token('color-edge-dark')};
    background: ${token('color-text-muted')};
    background-clip: content-box;
    padding-inline: 1px;
    box-sizing: content-box;
  }

  .vertical .grip {
    inline-size: 16px;
    block-size: 2px;
    border-inline: 0;
    border-block: 2px solid ${token('color-edge-dark')};
    padding: 1px 0;
  }

  .separator:hover .grip,
  .separator:focus-visible .grip {
    background-color: ${token('color-accent')};
  }

  .separator:focus-visible::after {
    content: '';
    position: absolute;
    inset: -2px;
    pointer-events: none;
    box-shadow:
      0 0 0 2px ${token('color-focus-inner')},
      0 0 0 4px ${token('color-focus')};
  }

  @media (pointer: coarse) {
    .separator::before {
      content: '';
      position: absolute;
      inset: 0 calc((var(--_bar) - 40px) / 2);
    }

    .vertical .separator::before {
      inset: calc((var(--_bar) - 40px) / 2) 0;
    }
  }

  @media (forced-colors: active) {
    .separator {
      border: 1px solid ButtonText;
    }

    .grip,
    .separator:hover .grip {
      border-color: ButtonText;
      background-color: ButtonText;
    }

    .separator:focus-visible {
      outline: 2px solid Highlight;
      outline-offset: 1px;
    }

    .separator:focus-visible::after {
      display: none;
    }
  }
`;
