import { fileURLToPath } from 'node:url';
import { shippedProblems } from './locale-rules.ts';

/**
 * Fails when a translation is missing or empty, changes a placeholder, or has text that would leak
 * into the page, or when `locales` disagrees with the XLIFF files and with `Intl` (specs/localization.md §6).
 */
const { problems, count } = shippedProblems(fileURLToPath(new URL('..', import.meta.url)));
if (problems.length > 0) {
  console.error(`check:locales failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Locales OK: ${count} messages in every locale`);
