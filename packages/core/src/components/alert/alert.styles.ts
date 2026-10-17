import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { statusLensStyles, statusShapeStyles } from '../../styles/status-shape.ts';
import { flatSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// A flat surface in the flow of the page, with the variant's color as a bar on the start edge. The
// bar is decoration: the shape and the text carry the meaning, so it needs no contrast of its own.
export const alertStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  ${statusLensStyles}
  ${statusShapeStyles}

  .alert {
    ${flatSurface}
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: ${token('space-2')};
    padding: ${token('space-2')} ${token('space-3')};
    border-inline-start: 4px solid var(--_c);
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    overflow-wrap: anywhere;
  }

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

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: ${token('space-2')};
  }

  ${closeButtonStyles}
  ${forcedColorsSurface('.alert')}

  @media (forced-colors: active) {
    .alert {
      border-inline-start-width: 4px;
    }
  }
`;
