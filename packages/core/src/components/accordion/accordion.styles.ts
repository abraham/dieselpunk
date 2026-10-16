import { css } from 'lit';
import { focusRing } from '../../styles/focus.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import {
  flatSurface,
  insetShadow,
  outlineShadow,
  raisedHoverShadow,
  raisedSurface,
} from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

export const accordionStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  .accordion {
    display: grid;
    gap: ${token('space-1')};
    min-inline-size: 0;
  }
`;

// Expanded is the pressed-in bevel and a minus; collapsed is raised and a plus, so the state is a
// shape and not only a surface.
export const accordionItemStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  .heading {
    margin: 0;
    font: inherit;
  }

  .trigger {
    ${raisedSurface}
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    inline-size: 100%;
    min-block-size: ${token('control-height-md')};
    padding: 0 ${token('space-3')};
    border: 0;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font: inherit;
    font-weight: 600;
    text-align: start;
    cursor: pointer;
  }

  .trigger:hover:not(:disabled) {
    box-shadow: ${raisedHoverShadow};
  }

  .trigger:active:not(:disabled),
  :host([expanded]) .trigger:not(:disabled) {
    background: ${token('color-panel-inset')};
    box-shadow: ${insetShadow};
  }

  .trigger:disabled {
    background: ${token('color-disabled-fill')};
    box-shadow: ${outlineShadow};
    color: ${token('color-disabled-text')};
    cursor: default;
  }

  .label {
    flex: 1 1 auto;
    min-inline-size: 0;
    overflow-wrap: break-word;
  }

  .indicator {
    flex: none;
    position: relative;
    inline-size: ${token('icon-size-sm')};
    block-size: ${token('icon-size-sm')};
  }

  .indicator::before,
  .indicator::after {
    content: '';
    position: absolute;
    background: currentColor;
  }

  .indicator::before {
    inset-inline: 2px;
    inset-block-start: calc(50% - 1px);
    block-size: 2px;
  }

  .indicator::after {
    inset-block: 2px;
    inset-inline-start: calc(50% - 1px);
    inline-size: 2px;
  }

  :host([expanded]) .indicator::after {
    display: none;
  }

  .panel {
    ${flatSurface}
    min-inline-size: 0;
    margin-block-start: ${token('space-1')};
    padding: ${token('space-3')};
    border-radius: ${token('radius')};
    overflow-wrap: break-word;
  }

  @media (pointer: coarse) {
    .trigger {
      min-block-size: max(40px, ${token('control-height-md')});
    }
  }

  ${focusRing('.trigger')}
  ${forcedColorsSurface('.trigger', { face: 'ButtonFace', text: 'ButtonText' })}
  ${forcedColorsSurface('.panel')}

  @media (forced-colors: active) {
    .trigger:disabled {
      border-color: GrayText;
      color: GrayText;
    }
  }
`;
