import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';

export const textFieldStyles = css`
  ${fieldStyles}

  .control::-webkit-search-cancel-button {
    cursor: pointer;
  }
`;
