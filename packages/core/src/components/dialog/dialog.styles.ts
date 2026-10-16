import { css } from 'lit';
import { token } from '../../tokens/token.ts';
import { modalSurfaceStyles } from '../../styles/modal-surface.ts';

export const dialogStyles = css`
  ${modalSurfaceStyles('--punk-dialog-max-width', '480px')}

  .header {
    flex: none;
    padding: ${token('space-3')} ${token('space-3')} 0;
  }

  .title {
    font-weight: 700;
    overflow-wrap: break-word;
  }

  .body:focus-visible {
    outline: 2px solid ${token('color-focus')};
    outline-offset: -2px;
  }
`;
