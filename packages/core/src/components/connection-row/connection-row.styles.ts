import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { readoutStyles } from '../../styles/readout.ts';
import { statusLensStyles, statusShapeStyles } from '../../styles/status-shape.ts';
import { outlineShadow } from '../../styles/surfaces.ts';
import { visuallyHidden } from '../../styles/visually-hidden.ts';
import { token } from '../../tokens/token.ts';

export const connectionRowStyles = css`
  ${readoutStyles}
  ${statusLensStyles}
  ${statusShapeStyles}
  ${closeButtonStyles}
  ${visuallyHidden}

  /* The host is the container, so the query sees the width of the whole row. */
  :host {
    display: block;
    container-type: inline-size;
  }

  [hidden] {
    display: none !important;
  }

  .row {
    display: flex;
    align-items: center;
    gap: ${token('space-3')};
  }

  .nodes {
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
  }

  .source,
  .destination {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .direction {
    flex: none;
    display: inline-flex;
  }

  .details,
  .status {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-2')};
  }

  .status-label {
    min-inline-size: 0;
  }

  /* One square, turned by the direction and the writing direction. */
  .arrow {
    inline-size: 16px;
    block-size: 16px;
    background: currentColor;
    clip-path: polygon(0 42%, 55% 42%, 55% 15%, 100% 50%, 55% 85%, 55% 58%, 0 58%);
    rotate: var(--_turn, 0deg);
  }

  .both {
    clip-path: polygon(
      0 50%,
      30% 15%,
      30% 42%,
      70% 42%,
      70% 15%,
      100% 50%,
      70% 85%,
      70% 58%,
      30% 58%,
      30% 85%
    );
  }

  .backward {
    --_turn: 180deg;
  }

  :host(:dir(rtl)) .forward {
    --_turn: 180deg;
  }

  :host(:dir(rtl)) .backward {
    --_turn: 0deg;
  }

  .close-button:disabled {
    background: ${token('color-disabled-fill')};
    box-shadow: ${outlineShadow};
    color: ${token('color-disabled-text')};
    cursor: not-allowed;
  }

  /* The nodes stack, the arrow points down or up, and the details and status take their own lines. */
  @container (inline-size < 360px) {
    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: ${token('space-2')} ${token('space-3')};
    }

    /* Only the source shares its line with the button; the grid places the rest in order. */
    .nodes {
      display: contents;
    }

    .direction {
      grid-row: 2;
    }

    .close-button {
      grid-row: 1;
      grid-column: 2;
    }

    .destination,
    .details,
    .status {
      grid-column: 1 / -1;
    }

    .both,
    .forward,
    :host(:dir(rtl)) .forward {
      --_turn: 90deg;
    }

    .backward,
    :host(:dir(rtl)) .backward {
      --_turn: -90deg;
    }
  }

  @media (forced-colors: active) {
    .arrow {
      forced-color-adjust: none;
      background: ButtonText;
    }

    .close-button:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
