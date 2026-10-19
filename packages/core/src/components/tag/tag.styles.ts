import { css } from 'lit';
import { closeButtonStyles } from '../../styles/close-button.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { insetSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The plate is `panel-inset` with `text`, as the badge's, so the contrast gate covers it; its
// light lower lip keeps it visible on the canvas. The remove button is the window's close button,
// smaller to sit inside the plate; a coarse pointer still gets its 40px target.
export const tagStyles = css`
  :host {
    display: inline-flex;
    max-inline-size: 100%;
    vertical-align: middle;
  }

  ${closeButtonStyles}

  .tag {
    display: inline-flex;
    align-items: center;
    gap: ${token('space-1')};
    min-inline-size: 0;
    max-inline-size: 100%;
    min-block-size: ${token('control-height-sm')};
    padding: 2px ${token('space-2')};
    border-radius: ${token('radius')};
    ${insetSurface}
    color: ${token('color-text')};
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .tag:has(.close-button) {
    padding-inline-end: 2px;
  }

  .label {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .close-button {
    inline-size: calc(${token('control-height-sm')} - 8px);
    block-size: calc(${token('control-height-sm')} - 8px);
  }

  .close-button .glyph {
    inline-size: 10px;
    block-size: 10px;
  }

  ${forcedColorsSurface('.tag')}
`;
