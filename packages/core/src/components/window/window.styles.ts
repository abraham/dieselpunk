import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { insetShadow } from '../../styles/surfaces.ts';
import { modalSurfaceStyles } from '../../styles/modal-surface.ts';
import { token } from '../../tokens/token.ts';

export const windowStyles = css`
  ${modalSurfaceStyles('--punk-window-max-width', '640px')}
  ${closeButtonStyles}

  /* A focused movable window sits above its siblings, as far as a stacking context allows. */
  :host([movable]:focus-within:not([modal])) {
    position: relative;
    z-index: 1;
  }

  .titlebar {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: ${token('space-2')};
    min-block-size: calc(${token('control-height-sm')} + 2 * ${token('space-2')});
    padding: ${token('space-2')} ${token('space-3')};
    border-start-start-radius: ${token('radius')};
    border-start-end-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    box-shadow: ${insetShadow};
    box-sizing: border-box;
  }

  :host([movable]) .titlebar {
    cursor: move;
    touch-action: none;
    user-select: none;
  }

  .icon[hidden] {
    display: none;
  }

  /* Where the title and its buttons cannot share a row, the buttons wrap below it. */
  .title {
    flex: 1 1 9ch;
    min-inline-size: 0;
    font-weight: 700;
    overflow-wrap: break-word;
  }

  /* A four-way arrow: a plus would read as "add". */
  .move-button .glyph {
    clip-path: polygon(
      50% 0,
      70% 20%,
      58% 20%,
      58% 42%,
      80% 42%,
      80% 30%,
      100% 50%,
      80% 70%,
      80% 58%,
      58% 58%,
      58% 80%,
      70% 80%,
      50% 100%,
      30% 80%,
      42% 80%,
      42% 58%,
      20% 58%,
      20% 70%,
      0 50%,
      20% 30%,
      20% 42%,
      42% 42%,
      42% 20%,
      30% 20%
    );
  }

  .move-button[aria-pressed='true'] {
    background: ${token('color-accent')};
    color: ${token('color-accent-text')};
  }

  .body:focus-visible {
    outline: 2px solid ${token('color-focus')};
    outline-offset: -2px;
  }

  .status {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (forced-colors: active) {
    .titlebar {
      border-block-end: 2px solid CanvasText;
      box-shadow: none;
    }

    .move-button[aria-pressed='true'] {
      border: 2px solid Highlight;
      background: Highlight;
      color: HighlightText;
    }

    .move-button[aria-pressed='true'] .glyph {
      background: HighlightText;
    }
  }
`;
