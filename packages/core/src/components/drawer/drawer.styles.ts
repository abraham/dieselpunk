import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// `--_from` is where the slide starts, as a translation, set per edge; not API.
export const drawerStyles = css`
  :host {
    display: contents;
  }

  [hidden] {
    display: none !important;
  }

  .drawer {
    ${raisedSurface}
    position: fixed;
    inset: 0;
    z-index: ${token('z-modal')};
    box-sizing: border-box;
    container-type: inline-size;
    inline-size: auto;
    block-size: auto;
    max-inline-size: none;
    max-block-size: none;
    margin: 0;
    padding: 0;
    border: 0;
    color: ${token('color-text')};
    font: inherit;
    overflow: visible;
    animation: punk-drawer-in ${token('duration-normal')} ease-out;
  }

  .drawer[open] {
    display: flex;
    flex-direction: column;
  }

  .start,
  .end {
    inline-size: min(var(--punk-drawer-size, 320px), 100% - 2 * ${token('space-4')});
  }

  .top,
  .bottom {
    block-size: min(var(--punk-drawer-size, 320px), 100% - 2 * ${token('space-4')});
  }

  .start {
    inset-inline-end: auto;
    --_from: -100% 0;
  }

  .end {
    inset-inline-start: auto;
    --_from: 100% 0;
  }

  :host(:dir(rtl)) .start {
    --_from: 100% 0;
  }

  :host(:dir(rtl)) .end {
    --_from: -100% 0;
  }

  .top {
    inset-block-end: auto;
    --_from: 0 -100%;
  }

  .bottom {
    inset-block-start: auto;
    --_from: 0 100%;
  }

  @keyframes punk-drawer-in {
    from {
      translate: var(--_from);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer {
      animation: none;
    }
  }

  .drawer::backdrop {
    background: color-mix(in srgb, ${token('color-canvas')} 70%, transparent);
  }

  .header {
    flex: none;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    padding: ${token('space-2')} ${token('space-2')} ${token('space-2')} ${token('space-3')};
    border-block-end: 1px solid ${token('color-edge-dark')};
  }

  .title {
    flex: 1 1 auto;
    min-inline-size: 0;
    font-weight: 700;
    overflow-wrap: break-word;
  }

  .body {
    flex: 1 1 auto;
    min-block-size: 0;
    padding: ${token('space-3')};
    overflow: auto;
    overflow-wrap: break-word;
  }

  .body:focus-visible {
    outline: 2px solid ${token('color-focus')};
    outline-offset: -2px;
  }

  .footer {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: ${token('space-2')};
    padding: ${token('space-3')};
  }

  @container (max-inline-size: 480px) {
    .footer {
      flex-direction: column;
      align-items: stretch;
    }

    .footer ::slotted(*) {
      inline-size: 100%;
    }
  }

  ${closeButtonStyles}
  ${forcedColorsSurface('.drawer')}
`;
