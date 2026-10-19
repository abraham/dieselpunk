import { css } from 'lit';

// `aria-required` already tells assistive technology, so the mark is for sight alone and has an
// empty text alternative. An engine without the alternative syntax keeps the first declaration.
export const requiredMarkStyles = css`
  :host([required]) .label::after {
    content: ' *';
    content: ' *' / '';
    font-weight: 700;
  }
`;
