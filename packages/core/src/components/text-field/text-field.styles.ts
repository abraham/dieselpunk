import { css } from 'lit';
import { fieldAffixStyles, fieldStyles } from '../../styles/field.ts';

export const textFieldStyles = css`
  ${fieldStyles}
  ${fieldAffixStyles}

  .control::-webkit-search-cancel-button {
    cursor: pointer;
  }
`;
