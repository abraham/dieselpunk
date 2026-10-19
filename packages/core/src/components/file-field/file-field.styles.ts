import { css } from 'lit';
import { fieldStyles } from '../../styles/field.ts';
import { outlineShadow, raisedHoverShadow, raisedSurface } from '../../styles/surfaces.ts';
import { token } from '../../tokens/token.ts';

// The input's own button is drawn as a raised button; its text and "No file chosen" are the
// browser's. A drop zone is the field's box, taller, with its words; it turns an `accent` frame
// while files are dragged over it. A dashed boundary means read-only in every field, so the zone
// does not use one.
export const fileFieldStyles = css`
  ${fieldStyles}

  .box {
    flex-wrap: wrap;
    padding-block: ${token('space-1')};
  }

  .control {
    min-inline-size: 0;
    max-inline-size: 100%;
    color: ${token('color-text-muted')};
    cursor: pointer;
  }

  .control::file-selector-button {
    ${raisedSurface}
    margin-inline-end: ${token('space-2')};
    min-block-size: ${token('control-height-sm')};
    padding: 0 ${token('space-3')};
    border: 0;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .control:not(:disabled):hover::file-selector-button {
    box-shadow: ${raisedHoverShadow};
  }

  .control:disabled,
  .control:disabled::file-selector-button {
    cursor: default;
  }

  /* The button is drawn as every disabled control is, so it never looks pressable. */
  .control:disabled::file-selector-button {
    background: ${token('color-disabled-fill')};
    box-shadow: ${outlineShadow};
    color: ${token('color-disabled-text')};
  }

  /* A disabled zone keeps the well's fill: the lighter disabled fill over this much area made it
     look more active than an enabled one. */
  .zone .field.disabled .box {
    background: ${token('color-panel-inset')};
  }

  .drop {
    color: ${token('color-text-muted')};
    overflow-wrap: anywhere;
  }

  .zone .box {
    min-block-size: calc(2 * ${token('control-height-md')});
  }

  .zone.dragging .box {
    --_frame: inset 0 0 0 2px ${token('color-accent')};
  }

  .list {
    flex-basis: 100%;
    display: grid;
    gap: ${token('space-1')};
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list li {
    display: flex;
    flex-wrap: wrap;
    column-gap: ${token('space-2')};
    min-inline-size: 0;
  }

  .name {
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }

  .size {
    color: ${token('color-text-muted')};
    font-variant-numeric: tabular-nums;
  }

  @media (forced-colors: active) {
    .control::file-selector-button {
      border: 1px solid ButtonText;
    }

    .control:disabled::file-selector-button {
      border-color: GrayText;
      color: GrayText;
    }

    .zone.dragging .box {
      outline: 2px solid Highlight;
    }
  }
`;
