/** The subset of XLIFF 1.2 that `lit-localize extract` writes, read without a parser dependency. */

export interface XliffUnit {
  id: string;
  /** The inner XML of `<source>`, with its `<x/>` placeholders. */
  source: string;
  /** The inner XML of `<target>`, or undefined when there is none. */
  target: string | undefined;
  /** The text of the `<note>`, which is the description given to `msg()`. */
  note: string | undefined;
}

export interface XliffFile {
  sourceLanguage: string;
  targetLanguage: string | undefined;
  units: XliffUnit[];
}

const entities: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(?:lt|gt|quot|apos|amp);/g, (entity) => entities[entity] as string);

function attribute(attributes: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attributes);
  return match?.[1] === undefined ? undefined : decodeEntities(match[1]);
}

function inner(xml: string, tag: string): string | undefined {
  return new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1];
}

export function parseXliff(xml: string): XliffFile {
  const file = /<file\b([^>]*)>/.exec(xml);
  if (!file) throw new Error('No <file> element');
  const units: XliffUnit[] = [];
  for (const match of xml.matchAll(/<trans-unit\b([^>]*)>([\s\S]*?)<\/trans-unit>/g)) {
    const id = attribute(match[1] as string, 'id');
    if (id === undefined) throw new Error('A <trans-unit> has no id');
    const body = match[2] as string;
    const note = inner(body, 'note');
    units.push({
      id,
      source: inner(body, 'source') ?? '',
      target: inner(body, 'target'),
      note: note === undefined ? undefined : decodeEntities(note).trim(),
    });
  }
  return {
    sourceLanguage: attribute(file[1] as string, 'source-language') ?? '',
    targetLanguage: attribute(file[1] as string, 'target-language'),
    units,
  };
}

/** The expressions that a fragment carries as placeholders, in the order they appear. */
export function placeholdersOf(fragment: string): string[] {
  return [...fragment.matchAll(/<x\b([^>]*)\/>/g)].map(
    (match) => attribute(match[1] as string, 'equiv-text') ?? '',
  );
}

/** A fragment as plain text, each placeholder written as its expression. */
export function textOf(fragment: string): string {
  return decodeEntities(
    fragment.replace(/<x\b([^>]*)\/>/g, (_, attributes: string) =>
      (attribute(attributes, 'equiv-text') ?? '').replace(/&/g, '&amp;'),
    ),
  );
}
