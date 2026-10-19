import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';
import { token } from '../../tokens/token.ts';

export const textareaStyles = css`
  ${fieldStyles}

  .box {
    align-items: stretch;
    padding-block: ${token('space-1')};
  }

  .control {
    display: block;
    min-block-size: calc(var(--_rows) * 1lh);
    resize: vertical;
    line-height: 1.4;
  }

  /* Two etched grooves in the library's color where the engine lets the grip be drawn (Chromium,
     WebKit); Firefox keeps its own. */
  .control::-webkit-resizer {
    background: linear-gradient(
      135deg,
      transparent 0 50%,
      ${token('color-control-edge')} 50% 58%,
      transparent 58% 70%,
      ${token('color-control-edge')} 70% 78%,
      transparent 78%
    );
  }

  :host([autogrow]) .control {
    field-sizing: content;
    max-block-size: var(--punk-textarea-max-height, 20lh);
    resize: none;
  }

  :host([monospace]) .control {
    font-family: ${token('font-mono')};
    overflow-wrap: anywhere;
  }

  .count {
    flex: none;
    align-self: flex-end;
    color: ${token('color-text-muted')};
    font-family: ${token('font-mono')};
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  @media (forced-colors: active) {
    .count {
      color: GrayText;
    }
  }
`;
