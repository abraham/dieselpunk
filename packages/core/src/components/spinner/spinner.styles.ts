import { css } from 'lit';
import { visuallyHidden } from '../../styles/visually-hidden.ts';
import { token } from '../../tokens/token.ts';

// The same dashed ring as a loading button's, so a busy region and a busy button look alike.
export const spinnerStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-2')};
    max-inline-size: 100%;
    vertical-align: middle;
  }

  [hidden] {
    display: none !important;
  }

  ${visuallyHidden}

  .spinner {
    flex: none;
    box-sizing: border-box;
    inline-size: var(--_s);
    block-size: var(--_s);
    border: 3px dashed currentColor;
    border-radius: 50%;
    color: ${token('color-text')};
    animation: punk-spin 1s linear infinite;
  }

  .size-sm {
    --_s: ${token('icon-size-sm')};
    border-width: 2px;
  }

  .size-md {
    --_s: ${token('icon-size-md')};
  }

  .size-lg {
    --_s: ${token('icon-size-lg')};
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  @keyframes punk-spin {
    to {
      transform: rotate(1turn);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }

  @media (forced-colors: active) {
    .spinner {
      color: CanvasText;
    }
  }
`;
