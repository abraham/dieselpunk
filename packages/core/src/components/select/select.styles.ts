import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';
import { token } from '../../tokens/token.ts';

// The closed control is themed and the open list is the platform's, which cannot be: the options get
// the panel colors only so a dark theme does not meet a white list.
export const selectStyles = css`
  ${fieldStyles}

  .control {
    appearance: none;
    -moz-appearance: none;
    cursor: pointer;
    text-overflow: ellipsis;
  }

  .control option,
  .control optgroup {
    background: ${token('color-panel')};
    color: ${token('color-text')};
  }

  .field.disabled .control {
    cursor: default;
  }

  .arrow {
    flex: none;
    inline-size: 10px;
    block-size: 6px;
    background: currentColor;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    pointer-events: none;
  }

  .field.disabled .arrow {
    background: ${token('color-disabled-text')};
  }

  @media (forced-colors: active) {
    .arrow {
      background: FieldText;
    }

    .field.disabled .arrow {
      background: GrayText;
    }
  }
`;
