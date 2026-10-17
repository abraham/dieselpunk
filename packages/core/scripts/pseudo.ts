import { textOf } from '../../locales/scripts/xliff.ts';
import type { XliffUnit } from '../../locales/scripts/xliff.ts';

// The test-only pseudo-locale of SPEC-PHASE-4 §13.5: each source wrapped in markers and made about
// 40% longer, with its placeholders as they were, so a test can tell translated text from a literal.

export const OPEN = '⟦';
export const CLOSE = '⟧';
export const LOCALE = 'en-x-pseudo';
const FILLER = '·';

/** The source of a unit, in markers and lengthened. Placeholders are not counted as text. */
export function pseudoFragment(source: string): string {
  const length = [...textOf(source.replace(/<x\b[^>]*\/>/g, ''))].length;
  return `${OPEN}${source}${FILLER.repeat(Math.ceil(length * 0.4))}${CLOSE}`;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** An XLIFF 1.2 file of the shape `lit-localize` reads, with the pseudo-locale as the target. */
export function pseudoXliff(units: readonly XliffUnit[]): string {
  const body = units
    .map(
      (unit) =>
        `<trans-unit id="${unit.id}">\n  <source>${unit.source}</source>\n  <target>${pseudoFragment(unit.source)}</target>\n  <note from="lit-localize">${escape(unit.note ?? '')}</note>\n</trans-unit>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
<file target-language="${LOCALE}" source-language="en" original="lit-localize-inputs" datatype="plaintext">
<body>
${body}
</body>
</file>
</xliff>
`;
}
