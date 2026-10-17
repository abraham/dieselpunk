import { css } from 'lit';
import { visuallyHidden } from '../../styles/visually-hidden.ts';
import { token } from '../../tokens/token.ts';

export const stepsStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: ${token('space-2')};
    margin: 0;
    padding: 0;
    list-style: none;
  }
`;

// The states differ without color: a check, a ring, or a plain number, and the label's weight.
// Each fill and text pair is one the contrast gate covers: `accent-text` on `accent`, and `text`
// and `text-muted` on `panel-inset`.
export const stepStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  ${visuallyHidden}

  .connector {
    flex: none;
    inline-size: ${token('space-4')};
    block-size: 2px;
    margin-inline: ${token('space-2')};
    background: ${token('color-edge-dark')};
  }

  .marker {
    flex: none;
    display: inline-grid;
    place-items: center;
    inline-size: 24px;
    block-size: 24px;
    margin-inline-end: ${token('space-2')};
    border: 1px solid ${token('color-edge-dark')};
    border-radius: ${token('radius')};
    background: ${token('color-panel-inset')};
    color: ${token('color-text-muted')};
    font-family: ${token('font-mono')};
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  .marker.current {
    border: 2px solid ${token('color-accent')};
    color: ${token('color-text')};
    font-weight: 700;
  }

  .marker.complete {
    border-color: ${token('color-accent')};
    background: ${token('color-accent')};
    color: ${token('color-accent-text')};
  }

  .check {
    inline-size: 12px;
    block-size: 12px;
    background: currentColor;
    clip-path: polygon(0 55%, 15% 40%, 38% 62%, 85% 12%, 100% 27%, 38% 92%);
  }

  .label {
    min-inline-size: 0;
    color: ${token('color-text')};
    overflow-wrap: anywhere;
  }

  .label.current {
    font-weight: 700;
  }

  .label.upcoming {
    color: ${token('color-text-muted')};
  }

  @media (forced-colors: active) {
    .connector {
      background: CanvasText;
    }

    .marker {
      border-color: CanvasText;
    }

    .marker.current {
      border-color: Highlight;
    }

    .marker.complete {
      border-color: CanvasText;
      background: CanvasText;
      color: Canvas;
    }
  }
`;
