import xliff from '../../../../packages/locales/xliff/de.xlf?raw';
import { parseXliff, textOf } from '../../../../packages/locales/scripts/xliff.ts';

/** Every message of the library, as the XLIFF of the locales package has it: the id, the English, and the note. */
export const messages = parseXliff(xliff).units.map((unit) => ({
  id: unit.id,
  english: textOf(unit.source),
  description: unit.note ?? '',
}));
