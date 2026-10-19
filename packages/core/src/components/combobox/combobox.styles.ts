import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';
import { forcedColorsSurface } from '../../styles/forced-colors.ts';
import { flatSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The active option is inset with an `accent` bar on its start edge, and the chosen one is bold
// with a check, so neither rests on color.
export const comboboxStyles = css`
  ${fieldStyles}

  .toggle {
    flex: none;
    display: grid;
    place-items: center;
    align-self: stretch;
    inline-size: 24px;
    margin-inline-end: calc(-1 * ${token('space-2')});
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .toggle::before {
    content: '';
    inline-size: 10px;
    block-size: 6px;
    background: currentColor;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .toggle:disabled {
    cursor: default;
  }

  .listbox {
    display: none;
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 2px;
    border: 0;
    box-sizing: border-box;
    z-index: ${token('z-overlay')};
    max-block-size: min(var(--punk-combobox-max-height, 240px), calc(100vh - 16px));
    overflow: auto;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    ${flatSurface}
  }

  .listbox.open {
    display: block;
  }

  .option {
    position: relative;
    display: flex;
    align-items: center;
    gap: ${token('space-2')};
    min-block-size: ${token('control-height-sm')};
    padding: 0 ${token('space-2')};
    border-radius: ${token('radius')};
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  .text {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .start,
  .end {
    flex: none;
    display: flex;
    align-items: center;
    gap: ${token('space-1')};
  }

  .group-label {
    padding: ${token('space-2')} ${token('space-2')} ${token('space-1')};
    color: ${token('color-text-muted')};
    font-size: 0.75rem;
    font-weight: 700;
  }

  .option:hover,
  .option[data-active] {
    background: ${token('color-panel-inset')};
  }

  .option[data-active] {
    box-shadow: inset 3px 0 0 ${token('color-accent')};
  }

  .option[aria-selected='true'] {
    font-weight: 700;
  }

  .option[aria-selected='true']::after {
    content: '';
    margin-inline-start: auto;
    padding-inline-start: ${token('space-2')};
    inline-size: 12px;
    block-size: 12px;
    flex: none;
    background: currentColor;
    clip-path: polygon(14% 50%, 0 64%, 36% 100%, 100% 24%, 86% 10%, 36% 72%);
  }

  .option[aria-disabled='true'] {
    color: ${token('color-disabled-text')};
    cursor: default;
  }

  @media (pointer: coarse) {
    .option {
      min-block-size: 40px;
    }
  }

  ${forcedColorsSurface('.listbox')}

  @media (forced-colors: active) {
    .toggle::before,
    .option[aria-selected='true']::after {
      background: FieldText;
    }

    .option[data-active] {
      outline: 2px solid Highlight;
      outline-offset: -2px;
    }

    .option[aria-disabled='true'] {
      color: GrayText;
    }
  }
`;
