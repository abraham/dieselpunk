import { readdirSync, readFileSync } from 'node:fs';
import { locales as shipped } from '../src/locales.ts';
import type { LocaleInfo } from '../src/locales.ts';
import { parseXliff, placeholdersOf, textOf } from '@dieselpunk/testing/xliff';
import type { XliffFile } from '@dieselpunk/testing/xliff';

// specs/localization.md §6: the rules a translation must meet, as pure functions so each can be tested on
// a fixture that breaks it.

// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
// Bidirectional overrides and isolates would leak into the page around the message.
const BIDI = /[\u202a-\u202e\u2066-\u2069]/;

/** What is wrong with one locale's XLIFF, against the ids the source has. */
export function translationProblems(
  code: string,
  file: XliffFile,
  referenceIds: readonly string[],
): string[] {
  const problems: string[] = [];
  const ids = file.units.map((unit) => unit.id);
  for (const id of referenceIds)
    if (!ids.includes(id)) problems.push(`${code}: has no unit "${id}"`);
  for (const id of ids) {
    if (!referenceIds.includes(id))
      problems.push(`${code}: has a unit "${id}" that the source has not`);
  }
  if (file.targetLanguage !== code) {
    problems.push(`${code}: target-language is "${file.targetLanguage ?? ''}"`);
  }
  for (const unit of file.units) {
    const where = `${code}.${unit.id}`;
    if (unit.target === undefined || textOf(unit.target).trim() === '') {
      problems.push(`${where}: has no target`);
      continue;
    }
    const wanted = placeholdersOf(unit.source).sort().join(' ');
    const found = placeholdersOf(unit.target).sort().join(' ');
    if (wanted !== found) {
      problems.push(`${where}: placeholders are [${found}], and the source's are [${wanted}]`);
    }
    const text = textOf(unit.target);
    if (text !== text.trim()) problems.push(`${where}: starts or ends with whitespace`);
    if (CONTROL.test(text)) problems.push(`${where}: has a control character`);
    if (BIDI.test(text)) problems.push(`${where}: has a bidirectional override or isolate`);
  }
  return problems;
}

/** What `Intl` says the writing direction of a language is, where the engine can tell. */
export function directionOf(code: string): string | undefined {
  const locale = new Intl.Locale(code) as Intl.Locale & {
    getTextInfo?(): { direction: string };
    textInfo?: { direction: string };
  };
  return (locale.getTextInfo?.() ?? locale.textInfo)?.direction;
}

/** What is wrong with the `locales` list, against the locales that `lit-localize.json` names. */
export function metadataProblems(
  locales: readonly LocaleInfo[],
  sourceLocale: string,
  targetLocales: readonly string[],
  xliffNames: readonly string[],
  direction: (code: string) => string | undefined = directionOf,
): string[] {
  const problems: string[] = [];
  for (const code of targetLocales) {
    if (!locales.some((locale) => locale.code === code)) {
      problems.push(`${code}: is a target locale and is not in locales`);
    }
  }
  for (const locale of locales) {
    const { code } = locale;
    let canonical: string | undefined;
    try {
      canonical = Intl.getCanonicalLocales(code)[0];
    } catch {
      // Reported below as a code that is not canonical.
    }
    if (canonical !== code) problems.push(`${code}: is not a canonical language tag`);
    if (locale.status !== 'draft' && locale.status !== 'reviewed') {
      problems.push(`${code}: has the status "${String(locale.status)}"`);
    }
    if (canonical === code) {
      const expected = direction(code);
      if (expected !== undefined && expected !== locale.dir) {
        problems.push(`${code}: dir is "${locale.dir}", and Intl says "${expected}"`);
      }
    }
    if (code === sourceLocale) continue;
    if (!targetLocales.includes(code))
      problems.push(`${code}: is in locales and is not a target locale`);
    if (!xliffNames.includes(`${code}.xlf`)) problems.push(`${code}: has no XLIFF file`);
  }
  return problems;
}

/** Reads the package's own files and applies every rule. */
export function shippedProblems(root: string): { problems: string[]; count: number } {
  const config = JSON.parse(readFileSync(`${root}lit-localize.json`, 'utf8')) as {
    sourceLocale: string;
    targetLocales: string[];
  };
  const names = readdirSync(`${root}xliff`).filter((name) => name.endsWith('.xlf'));
  const files = new Map(
    names.map((name) => [
      name.replace(/\.xlf$/, ''),
      parseXliff(readFileSync(`${root}xliff/${name}`, 'utf8')),
    ]),
  );
  const reference = [
    ...new Set([...files.values()].flatMap((file) => file.units.map((u) => u.id))),
  ];
  const problems = metadataProblems(shipped, config.sourceLocale, config.targetLocales, names);
  for (const [code, file] of files) problems.push(...translationProblems(code, file, reference));
  return { problems, count: reference.length };
}
