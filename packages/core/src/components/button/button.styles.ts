import { css } from 'lit';

export const buttonStyles = css`
  .icon {
    display: inline-flex;
    align-items: center;
  }

  .icon ::slotted(*) {
    flex: none;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }
`;
