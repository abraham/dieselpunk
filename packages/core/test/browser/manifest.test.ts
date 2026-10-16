import { commands } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tokenNames } from '../../src/tokens/token.ts';
import { cleanup, track } from './helpers.ts';
import './commands.ts';
import { buildGallery, componentNames } from './fixtures/gallery.ts';

// The manifest is checked against what the components actually render and declare, not against
// its own JSDoc source, so it cannot agree with itself while being wrong.

interface Named {
  name: string;
  description?: string;
}
interface ManifestClass {
  kind: string;
  name: string;
  tagName?: string;
  description?: string;
  attributes?: Named[];
  slots?: Named[];
  cssParts?: Named[];
  cssProperties?: Named[];
}
interface Manifest {
  schemaVersion: string;
  modules: { declarations?: ManifestClass[] }[];
}

interface ElementClass {
  observedAttributes: string[];
  elementStyles: { cssText?: string }[];
}

let manifest: Manifest;
const documented = new Map<string, ManifestClass>();

// Shared base styles read these, but the component overrides the property they feed, so it is not API.
const zeroedByComponent: Record<string, string[]> = {
  'icon-button': ['button-padding-inline'],
};

beforeAll(async () => {
  manifest = (await commands.readManifest()) as Manifest;
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.tagName) documented.set(declaration.tagName, declaration);
    }
  }
});

afterEach(cleanup);

const tagFor = (name: string) => `punk-${name}`;
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();
const names = (list: Named[] | undefined) => sorted((list ?? []).map((item) => item.name));

function declared(name: string): ManifestClass {
  const found = documented.get(tagFor(name));
  if (!found) throw new Error(`The manifest has no class for <${tagFor(name)}>`);
  return found;
}

/** Elements of one tag across every content variant, so every rendered state is covered. */
async function instances(name: string): Promise<Element[]> {
  const found: Element[] = [];
  for (const variant of ['short', 'long', 'unlabeled', 'rtl'] as const) {
    const gallery = track(buildGallery(variant, [name as (typeof componentNames)[number]]));
    found.push(...gallery.querySelectorAll(tagFor(name)));
  }
  await Promise.all(
    found.map(
      (element) => (element as Element & { updateComplete?: Promise<boolean> }).updateComplete,
    ),
  );
  return found;
}

describe('manifest', () => {
  it('is a valid manifest with a class for every component', () => {
    expect(manifest.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(sorted(documented.keys())).toEqual(sorted(componentNames.map(tagFor)));
  });

  it('lists exactly the elements that are registered', () => {
    for (const tag of documented.keys()) {
      expect(customElements.get(tag), tag).toBeDefined();
    }
  });

  it.each(componentNames)('describes punk-%s and each of its members', (name) => {
    const entry = declared(name);
    expect(entry.description?.trim(), `${entry.name} description`).toBeTruthy();
    for (const category of ['attributes', 'slots', 'cssParts', 'cssProperties'] as const) {
      for (const item of entry[category] ?? []) {
        expect(item.description?.trim(), `${entry.name} ${category} ${item.name}`).toBeTruthy();
      }
    }
  });

  it.each(componentNames)('lists the parts rendered by punk-%s, and no others', async (name) => {
    const rendered = (await instances(name)).flatMap((element) =>
      [...(element.shadowRoot?.querySelectorAll('[part]') ?? [])].flatMap((node) =>
        (node.getAttribute('part') ?? '').split(/\s+/).filter(Boolean),
      ),
    );
    expect(sorted(rendered)).toEqual(names(declared(name).cssParts));
  });

  it.each(componentNames)('lists the slots rendered by punk-%s, and no others', async (name) => {
    const rendered = (await instances(name)).flatMap((element) =>
      [...(element.shadowRoot?.querySelectorAll('slot') ?? [])].map((slot) => slot.name),
    );
    expect(sorted(rendered)).toEqual(names(declared(name).slots));
  });

  it.each(componentNames)('lists the attributes punk-%s observes, and no others', (name) => {
    const ctor = customElements.get(tagFor(name)) as unknown as ElementClass;
    expect(sorted(ctor.observedAttributes)).toEqual(names(declared(name).attributes));
  });

  it.each(componentNames)('documents the --punk-* properties punk-%s reads', (name) => {
    const ctor = customElements.get(tagFor(name)) as unknown as ElementClass;
    const css = ctor.elementStyles.map((style) => style.cssText ?? '').join('\n');
    // Properties are read either by `var()` in the styles or by name in the class itself.
    const readInStyles = [...css.matchAll(/var\(\s*--punk-([a-z0-9-]+)/g)].map(
      ([, token]) => token,
    );
    const readInClass = [...String(ctor).matchAll(/--punk-([a-z0-9-]+)/g)].map(
      ([, token]) => token,
    );
    const read = sorted([...readInStyles, ...readInClass] as string[]);
    const sharedTokens = new Set<string>(tokenNames);
    const documentedProperties = names(declared(name).cssProperties);

    // A property the component reads that is not a shared token is its own API and must be listed.
    const own = read
      .filter((token) => !sharedTokens.has(token) && !zeroedByComponent[name]?.includes(token))
      .map((token) => `--punk-${token}`);
    expect(documentedProperties).toEqual(expect.arrayContaining(own));
    // Anything listed must actually be read, so a rename cannot leave a stale entry behind.
    for (const property of documentedProperties) {
      expect(read, property).toContain(property.replace('--punk-', ''));
    }
  });
});
