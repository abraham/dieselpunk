import { css } from 'lit';
import { token } from '../../tokens/token.ts';

// `--_columns` is a private cap set from `columns`, not API.
export const slotGridStyles = css`
  :host {
    display: block;
  }

  /* Fixed tracks, so a narrower container drops columns instead of squeezing slots. */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, ${token('slot-size')});
    gap: var(--punk-slot-gap, ${token('space-1')});
    justify-content: start;
    justify-items: center;
    align-items: center;
    max-inline-size: calc(
      var(--_columns, 1000) *
        (${token('slot-size')} + var(--punk-slot-gap, ${token('space-1')})) - var(
          --punk-slot-gap,
          ${token('space-1')}
        )
    );
  }
`;
