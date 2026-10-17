// Pure, so node can test it (test/file-kinds.test.ts).
import { formatNumber } from '../../utilities/number-format.ts';

const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** A file size in the largest unit that keeps it at 1 or more, formatted for `lang`. */
export function formatFileSize(bytes: number, lang: string | undefined): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1000 && unit < units.length - 1) {
    size /= 1000;
    unit += 1;
  }
  return formatNumber(size, lang, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  });
}

/** Whether `file` is one of the kinds an `accept` list names: extensions, MIME types, or `type/*`. */
export function acceptsFile(file: { name: string; type: string }, accept: string): boolean {
  const kinds = accept
    .split(',')
    .map((kind) => kind.trim().toLowerCase())
    .filter(Boolean);
  if (kinds.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return kinds.some((kind) =>
    kind.startsWith('.')
      ? name.endsWith(kind)
      : kind.endsWith('/*')
        ? type.startsWith(kind.slice(0, -1))
        : type === kind,
  );
}
