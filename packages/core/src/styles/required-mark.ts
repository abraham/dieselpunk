import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

/** The mark a required control shows after its label text. */
export const requiredMarkStyles = css`
  .required-mark {
    font-weight: 700;
  }
`;

// `aria-required` already tells assistive technology, so the mark is for sight alone and hidden
// from the accessibility tree, which keeps it out of the control's name in every engine and tool.
// Generated content with an empty alternative did that in browsers, but not in every test tool.
export function requiredMark(required: boolean): TemplateResult | typeof nothing {
  return required ? html`<span class="required-mark" aria-hidden="true"> *</span>` : nothing;
}
