# Package Contract and Public API

**Scope:** what a consumer imports, what importing it does, how the public API is named and shaped, how it is recorded, and how it may change.
**Code:** `packages/*/package.json`, `packages/core/src/index.ts`, `src/components/*/index.ts` and `register.ts`, `src/utilities/register-element.ts`, `src/utilities/dev*.ts`, `src/utilities/warn.ts`, `custom-elements-manifest.config.mjs`, `scripts/check-package.ts`, `scripts/check-api.ts`, `scripts/api-snapshot.ts`, `api.snapshot.json`.

## 1. Entry points

`@dieselpunk/core`:

```json
{
  "type": "module",
  "sideEffects": ["./dist/components/*/register.js", "./dist/css/*.css", "./dist/hydrate.js"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./tokens.css": "./dist/css/tokens.css",
    "./themes.css": "./dist/css/themes.css",
    "./custom-elements.json": "./custom-elements.json",
    "./hydrate.js": { "types": "./dist/hydrate.d.ts", "default": "./dist/hydrate.js" },
    "./*/register.js": "./dist/components/*/register.js",
    "./*": { "types": "./dist/components/*/index.d.ts", "default": "./dist/components/*/index.js" }
  },
  "imports": {
    "#dev": { "development": "./dist/utilities/dev.dev.js", "default": "./dist/utilities/dev.js" }
  }
}
```

- `.` exports every component class, every option and detail type, and nothing that registers an element.
- `./<entry>` exports one family's classes and its `HTMLElementTagNameMap` entries, as type-only declarations.
- `./<entry>/register.js` defines that family's tags. It is the longer pattern, so it wins over `./*` in every resolver; the package check asserts this for every entry.
- `tokens.css` and `themes.css` are optional ([visual-system.md §1](visual-system.md)).
- `custom-elements.json` is published for tooling.
- `hydrate.js` installs the hydration of server-rendered components; a page that hydrates imports it after Lit's hydration support and before any component ([ssr.md §5](ssr.md)). It registers no element.

`@dieselpunk/locales` has `sideEffects: false`, an entry for the loader (`.`), one per target locale, and `document`. None registers an element, and each language is its own chunk ([localization.md §5](localization.md)).

```ts
import { PunkSlotGrid } from '@dieselpunk/core/slot-grid'; // the class, no side effect
import '@dieselpunk/core/slot-grid/register.js'; // defines punk-slot-grid
```

## 2. Registration

- A component module never calls `customElements.define` and never uses `@customElement`. Each class carries a `@tagname` JSDoc tag instead, so the manifest knows its tag.
- `register.ts` calls `registerElement(tag, ctor)`, which defines the tag only if `customElements.get(tag)` is undefined. Importing a register entry twice is harmless.
- **One entry per family.** An entry registers its own family's tags and no other: `tabs` registers `punk-tabs` and `punk-tab`, `accordion` both of its tags, `toast` `punk-toast-stack` and `punk-toast`, `radio-group`, `menu`, `list`, and `breadcrumb` their container and item tags, and every other entry one tag. Registering a slot grid does not register `punk-slot`; an application imports both.
- **The one cross-family registration:** `icon-button/register.js` imports `tooltip/register.js`, because the icon button renders a `punk-tooltip` as its visible label ([layout-and-actions.md §6](layout-and-actions.md)). No other entry may add one.
- `sideEffects` lists exactly the register entries and the stylesheets, so a bundler drops everything else that is unused.

**Why** classes and registration are separate: an application may subclass, scope, or lazily define elements, and a library that defines on import takes those choices away.

## 3. Naming

| Thing        | Rule                                                                                                   | Example                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Tag          | `punk-` and the kebab-case name                                                                        | `punk-item-stack`                        |
| Class        | `Punk` and the PascalCase tag without the prefix                                                       | `PunkItemStack`                          |
| Entry        | The tag without the prefix; a family is named for its container                                        | `item-stack`, `tabs`                     |
| Property     | camelCase                                                                                              | `compactCount`                           |
| Attribute    | kebab-case                                                                                             | `compact-count`                          |
| Event        | `punk-` and a kebab-case verb or noun, unless a native event means exactly the same thing              | `punk-selection-change`; native `change` |
| CSS property | `--punk-<component>-<thing>` for component properties; tokens per [visual-system.md](visual-system.md) | `--punk-stat-value-min`                  |
| Part         | A noun for what it is, not how it looks                                                                | `remove-button`, `track`, `fill`         |
| Private CSS  | `--_name`, set and read in one component's shadow styles; never API                                    | `--_h`                                   |

## 4. API shape

- **Attributes and properties.** Every attribute has a property. Boolean attributes follow native presence semantics; a default-true boolean is not an attribute (use a negative name) unless the native platform has the same convention (`describe="false"` on the tooltip is the one exception, and is documented).
- **Reflection.** Properties that describe configuration or state reflect, so CSS and DOM tooling see them. A form control's live value does not reflect: its attribute is the default that a form reset restores ([forms.md §2](forms.md)).
- **Data and content.** Application data is passed as properties. Rich visual content, such as icons, art, labels with markup, and sparklines, is passed through slots.
- **No mutation.** A component never mutates an array or object it receives. Array properties copy on assignment and on read.
- **Styling API.** Visual customization is through tokens, documented component CSS properties, and parts. Internal class names, private custom properties, and shadow structure are not API.
- **Methods** exist where the platform has an equivalent (`show()`, `close()`, `focus()`, `checkValidity()`) or where a property cannot express the action (`resetPosition()`, `dismiss(reason)`).
- **Unknown values.** An enumerated attribute with an unknown value behaves as its default. A numeric one that is not finite or is out of range is repaired. Both warn in development ([component-model.md §6](component-model.md)).

## 5. Events

- Custom events are `CustomEvent`s that bubble and are composed, dispatched with `PunkElement.emit()`.
- A component emits an event for a change the **user** made. Setting a property from script sends nothing, as a script's change to a native input sends no `change`.
- Native `input` and `change` are real `Event`s, with `input` composed. A control that wraps a native input dispatches `change` again on its host, since the native one does not cross the shadow boundary.
- Every custom event is declared on `HTMLElementEventMap`, and its detail type is exported from the root, so `addEventListener` is typed with no cast.

| Event                              | Detail                     | Sent by                                                   | Cancelable |
| ---------------------------------- | -------------------------- | --------------------------------------------------------- | ---------- |
| `punk-activate`                    | `{ value, item }`          | slot, item stack, recipe, list item, menu item, tree item | no         |
| `punk-selection-change`            | `{ values, items }`        | slot grid, toggle group, list, table, tree                | no         |
| `punk-tab-change`                  | `{ value, tab, panel }`    | tabs                                                      | no         |
| `punk-toggle`                      | `{ expanded }`             | accordion item, tree item                                 | no         |
| `punk-overflow-change`             | `{ hidden }`               | toolbar                                                   | no         |
| `punk-open`                        | none                       | window, dialog, popover, drawer, menu                     | no         |
| `punk-close`                       | `{ reason, returnValue? }` | window, dialog, popover, drawer, menu                     | no         |
| `punk-move-start`, `punk-move-end` | `{ x, y }`                 | window                                                    | no         |
| `punk-dismiss`                     | `{ reason }`               | toast, alert                                              | yes        |
| `punk-remove`                      | `{ value, item }`          | connection row, tag                                       | no         |
| `punk-sort-change`                 | `{ key, direction }`       | table                                                     | no         |
| `punk-page-change`                 | `{ page }`                 | pagination                                                | no         |
| `punk-split-change`                | `{ value }`                | splitter                                                  | no         |

Open and close events report every change of `open`, whoever made it, because an overlay's visibility is state the application must track; the `reason` says who. A cancelable event exists only where an application may need to take over the action (a framework that owns the toast removes it itself; an application that keeps an alert in its own state).

## 6. Development warnings

- `#dev` exports `PUNK_DEV`. Under the `development` export condition it is `true`; otherwise `false`, and bundlers drop guarded code.
- All warnings go through `devWarn(element, message)`, which prefixes the tag name.
- A component warns once per occurrence of a problem: it records the warning, and clears the record when the problem goes away, so the warning comes back if the problem does.
- Warnings are for misuse that still renders: a missing accessible name, an inconsistent range, a child that is not an item, a tab naming a missing panel. Each component's spec lists its warnings.

| Context       | `#dev` resolves to                                                 |
| ------------- | ------------------------------------------------------------------ |
| Consumers     | `imports` in `package.json`, by export condition                   |
| Type checking | `paths` in `tsconfig.json`, to `src/utilities/dev.ts`              |
| Tests         | A Vite alias to `dev.dev.ts`, so tests always run with warnings on |
| Workbench     | The `development` condition, so stories show misuse                |

## 7. The Custom Elements Manifest

- Generated from JSDoc by the analyzer: `@tagname`, `@attr`, `@fires`, `@slot`, `@csspart`, `@cssprop`, and member descriptions. Base classes are in the analyzer's globs, so inherited members are documented on each element.
- Written without indentation (`scripts/compact-manifest.ts` after the analyzer), since tools read it and the indentation is half its size in the package.
- Every element, attribute, property, method, event, slot, part, and CSS property that is public has a non-empty description.
- The manifest is checked against what the components do, not against itself: parts and slots are read from the rendered shadow DOM of every gallery state, attributes from `observedAttributes`, and CSS properties from what each component's styles and class actually read ([testing.md §3](testing.md)).

## 8. The API snapshot

`api.snapshot.json` is the reviewed public surface: for each tag, its attributes, properties, methods, events, slots, parts, and CSS properties with types and defaults, and the package's `exports` keys. `npm run check:api` derives the same description from the manifest and fails on any difference, printing each as removed, added, or changed, and fails on any public name with no description. `npm run check:api -- --update` rewrites the file, which is committed. A change to the API is therefore always a visible change to a reviewed file.

## 9. Internal protocols

Components cooperate across shadow roots and registration entries through small duck-typed protocols, each keyed by symbols exported from an `internal/` module:

| Protocol      | Members                                                                                                         | Implemented by                                                                          | Used by                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| External ARIA | `[setExternalAria]({ description, expanded, haspopup })` (`internal/anchor.ts`)                                 | button base                                                                             | tooltip, popover, menu                                     |
| Roving item   | `[itemDisabled]`, `[focusItem]()`, `[setTabStop](on \| null)`, `[isFocusTarget](target)` (`internal/roving.ts`) | button base, toggles, tab, radio; accordion items (`[itemDisabled]`, `[isFocusTarget]`) | `RovingController`, tabs, radio group, accordion           |
| Owned child   | `[owner]`, `[childChanged]`, `[release]` (`internal/owner.ts`)                                                  | selectable items (and list items), accordion items, tabs, toasts, radios                | slot grid, list, accordion, tabs, toast stack, radio group |

These are implementation contracts between the library's own classes, not application API. The members are marked `@internal`, so they are not described in the manifest, not in the API snapshot, and not covered by Semantic Versioning. The symbols are not exported from the package, so an application cannot call them by accident ([component-model.md §8](component-model.md)). The browser tests of each pair (a tooltip describing a button, a toolbar roving over buttons and toggles, the tabs, radio group, and accordion keyboards) are what show a protocol still connects its classes.

## 10. Versioning

- Semantic Versioning covers JavaScript exports, tag names, attributes, properties, methods, events and their details, slots, parts, CSS custom properties, and the token names.
- Removing or renaming any of these is breaking. Adding is minor. Changing a default is breaking unless the old default was a defect.
- Experimental components are exported under `experimental/` and are outside the guarantee.
- A deprecated name keeps working for at least one minor release, is marked `@deprecated` in JSDoc, and warns once in development.
- The published packages are at `0.1.1`, and move together; the private workspaces stay `0.0.0`. Choosing a version, changelogs, and releases are the owner's.
- **Publishing.** A published GitHub release tagged `v<version>`, matching the packages' version, publishes both from `publish.yml` ([ci.md §8](ci.md)), with npm trusted publishing: no npm token exists, and npm attaches provenance. The first version of a package is published by hand, since a trusted publisher can only be set on a package that exists.
- **License.** MIT, in the repository's `LICENSE`. Each published package's `license` is `MIT`, and it carries an identical `LICENSE` beside its `package.json`, since npm packs only the package's own folder.
- **Published as public.** Each published package sets `publishConfig.access` to `public`, since npm publishes a scoped package as private otherwise, and has a `README.md` for its npm page.

## Verification

- `check:package`: the license field, the `LICENSE` copy, and public access (§10), export resolution (`register.js` wins), `sideEffects` exactly the register entries and CSS, nothing but a register entry calls `define`, each register bundle holds its own family and only its documented dependency, a class-only import registers nothing; `publint --strict`; `attw` with the `esm-only` profile. The same for the locales package, with its chunk rules.
- `*.registration.test.ts` beside each component: the class entry defines nothing; `register.js` defines the family; a second import does not throw.
- `test/browser/manifest.test.ts`: the manifest against rendered parts and slots, observed attributes, read CSS properties, and descriptions.
- `check:api`: the snapshot and descriptions.
- `check:consumer`: typed listeners for every event under the oldest and newest supported TypeScript, with `@ts-expect-error` guards on unions and details ([testing.md §8](testing.md)).

## Gaps

- **`SubmitEvent.submitter` is `null`** when a `punk-button` submits a form, because a custom element cannot be a submitter. This is a platform limit, documented on the button, and not closable inside the library.
