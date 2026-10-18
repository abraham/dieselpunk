import { css, unsafeCSS } from 'lit';
import { token } from '../tokens/token.ts';
import { fieldStyles } from './field.ts';

const icon = (path: string) =>
  unsafeCSS(
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='${path}'/%3E%3C/svg%3E")`,
  );
const calendar = icon('M4 1h2v2h4V1h2v2h3v12H1V3h3zM3 7v6h10V7z');
const clock = icon(
  'M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 2a5 5 0 1 0 0 10A5 5 0 0 0 8 3zM7 4h2v4h3v2H7z',
);

// The date and time fields are text fields around a native input whose picker is the
// platform's. Chromium draws the picker button as an image in a fixed color, so it is redrawn as
// a mask filled with the text color, which follows the theme and forced colors.
export const dateTimeFieldStyles = css`
  ${fieldStyles}

  .control {
    min-inline-size: 8ch;
  }

  .control::-webkit-calendar-picker-indicator {
    inline-size: ${token('icon-size-sm')};
    block-size: ${token('icon-size-sm')};
    padding: 0;
    background: currentColor;
    mask: ${calendar} center / contain no-repeat;
    cursor: pointer;
  }

  .control[type='time']::-webkit-calendar-picker-indicator {
    mask-image: ${clock};
  }

  .control::-webkit-datetime-edit-fields-wrapper {
    padding: 0;
  }

  @media (forced-colors: active) {
    .control::-webkit-calendar-picker-indicator {
      background: ButtonText;
    }
  }
`;
