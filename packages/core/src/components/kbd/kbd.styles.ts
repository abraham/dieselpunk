import { css } from 'lit';
import { raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The keycap is the raised surface with a deeper bottom edge, so a key reads as pressable
// without color, and its text is `text` on `panel`, a pair the contrast gate covers.
export const kbdStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
    vertical-align: baseline;
  }

  .key {
    ${raisedSurface}
    display: inline-block;
    min-inline-size: 1.75em;
    max-inline-size: 100%;
    padding: 0 ${token('space-1')};
    border-block-end: 2px solid ${token('color-edge-dark')};
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font-family: ${token('font-mono')};
    font-size: 0.8125em;
    line-height: 1.5;
    text-align: center;
    overflow-wrap: anywhere;
  }

  @media (forced-colors: active) {
    .key {
      border: 1px solid CanvasText;
      border-block-end-width: 2px;
    }
  }
`;
