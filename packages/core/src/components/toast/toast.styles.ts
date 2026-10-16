import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { statusLensStyles, statusShapeStyles } from '../../styles/status-shape.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const toastStyles = css`
  :host {
    display: block;
    /* The stack lets clicks through itself, and each toast takes them back. */
    pointer-events: auto;
  }

  [hidden] {
    display: none !important;
  }

  @keyframes punk-toast-in {
    from {
      opacity: 0;
    }
  }

  @keyframes punk-toast-out {
    to {
      opacity: 0;
    }
  }

  .toast {
    ${raisedSurface}
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    padding: ${token('space-2')} ${token('space-3')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    overflow-wrap: anywhere;
    animation: punk-toast-in ${token('duration-normal')} ease-out;
  }

  .toast.leaving {
    pointer-events: none;
    animation: punk-toast-out ${token('duration-fast')} ease-in forwards;
  }

  @media (prefers-reduced-motion: reduce) {
    .toast,
    .toast.leaving {
      animation: none;
    }
  }

  ${statusLensStyles}
  ${statusShapeStyles}

  .main {
    flex: 1 1 0;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    gap: ${token('space-1')};
    padding-block: 1px;
  }

  .heading {
    font-weight: 700;
  }

  .action {
    display: flex;
    flex-wrap: wrap;
    gap: ${token('space-2')};
  }

  ${closeButtonStyles}
  ${forcedColorsSurface('.toast')}
`;

export const toastStackStyles = css`
  /* Keeps the host out of layout while its shadow content still renders. */
  :host {
    display: contents;
  }

  [hidden] {
    display: none !important;
  }

  /* In the top layer, and fixed with a z-index where the Popover API is missing. */
  .stack {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0;
    border: 0;
    box-sizing: border-box;
    overflow: visible;
    background: transparent;
    z-index: ${token('z-toast')};
    display: flex;
    inline-size: min(24rem, calc(100vw - 2 * ${token('space-3')}));
    pointer-events: none;
  }

  .stack.bottom {
    flex-direction: column;
    inset-block-end: ${token('space-3')};
  }

  .stack.top {
    flex-direction: column-reverse;
    inset-block-start: ${token('space-3')};
  }

  .stack.start {
    inset-inline-start: ${token('space-3')};
  }

  .stack.end {
    inset-inline-end: ${token('space-3')};
  }

  /* The newest toast is nearest the screen edge, so a stack that grows from the top reverses. */
  .region {
    display: flex;
    flex-direction: column;
  }

  .top .region {
    flex-direction: column-reverse;
  }

  ::slotted(punk-toast) {
    margin-block: calc(${token('space-2')} / 2);
  }
`;
