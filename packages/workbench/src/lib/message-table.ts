import { parseXliff, textOf } from '@dieselpunk/testing/xliff';
// The committed XLIFF is the source of the table, and the locales package does not publish it.
// eslint-disable-next-line local/workspace-imports
import xliff from '../../../../packages/locales/xliff/de.xlf?raw';

/** Every message of the library, as the XLIFF of the locales package has it: the id, the English, and the note. */
export const messages = parseXliff(xliff).units.map((unit) => ({
  id: unit.id,
  english: textOf(unit.source),
  description: unit.note ?? '',
}));
