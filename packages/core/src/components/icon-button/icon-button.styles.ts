import { css } from 'lit';

export const iconButtonStyles = css`
  /* Square: the same size in both dimensions, whatever the content. */
  .button {
    flex: none;
    inline-size: var(--_h);
    block-size: var(--_h);
    padding-inline: 0;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .icon ::slotted(*) {
    flex: none;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
`;
