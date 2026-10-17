/** The public API of the package as a flat, sorted description, and the difference between two. */

interface Named {
  name: string;
  description?: string;
  type?: { text?: string };
  default?: string;
}

interface Member extends Named {
  kind: string;
  privacy?: string;
  static?: boolean;
}

interface ManifestClass {
  name?: string;
  tagName?: string;
  attributes?: Named[];
  members?: Member[];
  events?: Named[];
  slots?: Named[];
  cssParts?: Named[];
  cssProperties?: Named[];
}

export interface Manifest {
  modules: { declarations?: ManifestClass[] }[];
}

export type Surface =
  'attributes' | 'properties' | 'methods' | 'events' | 'slots' | 'parts' | 'cssProperties';

export interface ApiSnapshot {
  exports: string[];
  elements: Record<string, Record<Surface, Record<string, string>>>;
}

const typed = (entry: Named): string =>
  [entry.type?.text?.replace(/\s+/g, ' '), entry.default === undefined ? '' : `= ${entry.default}`]
    .filter(Boolean)
    .join(' ');

const record = (entries: Array<[string, string]>): Record<string, string> =>
  Object.fromEntries(entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** A slot with no name is the default slot; JSON cannot key an object by an empty name usefully. */
const slotName = (name: string): string => (name === '' ? '(default)' : name);

function isPublic(member: Member): boolean {
  return member.privacy !== 'private' && member.privacy !== 'protected' && !member.static;
}

export function describeApi(manifest: Manifest, exportKeys: string[]): ApiSnapshot {
  const elements: ApiSnapshot['elements'] = {};
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (!declaration.tagName) continue;
      const members = (declaration.members ?? []).filter(isPublic);
      elements[declaration.tagName] = {
        attributes: record((declaration.attributes ?? []).map((a) => [a.name, typed(a)])),
        properties: record(
          members.filter((m) => m.kind === 'field').map((m) => [m.name, typed(m)]),
        ),
        methods: record(members.filter((m) => m.kind === 'method').map((m) => [m.name, ''])),
        events: record((declaration.events ?? []).map((e) => [e.name, typed(e)])),
        slots: record((declaration.slots ?? []).map((s) => [slotName(s.name), ''])),
        parts: record((declaration.cssParts ?? []).map((p) => [p.name, ''])),
        cssProperties: record((declaration.cssProperties ?? []).map((p) => [p.name, typed(p)])),
      };
    }
  }
  return {
    exports: [...exportKeys].sort(),
    elements: Object.fromEntries(Object.entries(elements).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

export interface ApiDifference {
  removed: string[];
  added: string[];
  changed: string[];
}

function flatten(snapshot: ApiSnapshot): Map<string, string> {
  const flat = new Map<string, string>();
  for (const key of snapshot.exports) flat.set(`exports ${key}`, '');
  for (const [tag, surfaces] of Object.entries(snapshot.elements)) {
    flat.set(`${tag}`, '');
    for (const [surface, entries] of Object.entries(surfaces)) {
      for (const [name, value] of Object.entries(entries))
        flat.set(`${tag} ${surface} ${name}`, value);
    }
  }
  return flat;
}

export function diffApi(before: ApiSnapshot, after: ApiSnapshot): ApiDifference {
  const was = flatten(before);
  const is = flatten(after);
  const difference: ApiDifference = { removed: [], added: [], changed: [] };
  for (const [key, value] of was) {
    if (!is.has(key)) difference.removed.push(key);
    else if (is.get(key) !== value) difference.changed.push(`${key}: ${value} -> ${is.get(key)}`);
  }
  for (const key of is.keys()) if (!was.has(key)) difference.added.push(key);
  return difference;
}

export const isSame = (difference: ApiDifference): boolean =>
  difference.removed.length + difference.added.length + difference.changed.length === 0;

/** Every public name that the manifest lists with no description, as `tag kind name`. */
export function undocumentedApi(manifest: Manifest): string[] {
  const found: string[] = [];
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      const tag = declaration.tagName;
      if (!tag) continue;
      const groups: Array<[string, Named[]]> = [
        ['attribute', declaration.attributes ?? []],
        ['member', (declaration.members ?? []).filter(isPublic)],
        ['event', declaration.events ?? []],
        ['slot', declaration.slots ?? []],
        ['part', declaration.cssParts ?? []],
        ['css property', declaration.cssProperties ?? []],
      ];
      for (const [kind, entries] of groups) {
        for (const entry of entries) {
          if (!entry.description?.trim())
            found.push(`${tag} ${kind} ${slotName(entry.name) || '(default)'}`);
        }
      }
    }
  }
  return found.sort();
}
