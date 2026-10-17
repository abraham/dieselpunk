import { css } from 'lit';
import { focusRing } from '../../styles/focus.ts';
import { visuallyHidden } from '../../styles/visually-hidden.ts';
import { token } from '../../tokens/token.ts';

// The separator is a slash drawn as a shape, so it needs no text and mirrors in right-to-left text.
const separator = css`
  .separator {
    flex: none;
    display: inline-block;
    inline-size: 6px;
    block-size: 12px;
    margin-inline: ${token('space-1')};
    background: ${token('color-text-muted')};
    clip-path: polygon(80% 0, 100% 0, 20% 100%, 0 100%);
  }

  :host(:dir(rtl)) .separator {
    transform: scaleX(-1);
  }

  @media (forced-colors: active) {
    .separator {
      background: CanvasText;
    }
  }
`;

export const breadcrumbStyles = css`
  :host {
    display: block;
    max-inline-size: 100%;
  }

  [hidden] {
    display: none !important;
  }

  ${visuallyHidden}
  ${separator}

  .list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    row-gap: ${token('space-1')};
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ::slotted(:first-child) {
    --_separator: none;
  }

  .more-item {
    display: inline-flex;
    align-items: center;
  }

  .more {
    position: relative;
    min-inline-size: 24px;
    min-block-size: 24px;
    padding: 0 ${token('space-1')};
    border: 1px solid ${token('color-control-edge')};
    border-radius: ${token('radius')};
    background: ${token('color-panel')};
    color: ${token('color-text')};
    font: inherit;
    cursor: pointer;
  }

  ${focusRing('.more')}
`;

export const breadcrumbItemStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    min-inline-size: 0;
    max-inline-size: 100%;
  }

  ${separator}

  .separator {
    display: var(--_separator, inline-block);
  }

  .link {
    position: relative;
    min-inline-size: 0;
    border-radius: ${token('radius')};
    color: ${token('color-text')};
    overflow-wrap: anywhere;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .text,
  [aria-current] {
    text-decoration: none;
    font-weight: 600;
  }

  ${focusRing('.link')}
`;
