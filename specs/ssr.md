# Server Rendering

**Scope:** rendering core's components to HTML on a server with Lit SSR (`@lit-labs/ssr`), what that HTML holds and what it cannot, what a component does when its definition loads over it, hydration, and sharing styles between server-rendered shadow roots.
**Code:** `packages/core/src/internal/punk-element.ts`, `src/internal/server-values.ts`, `src/hydrate.ts`, `src/ssr.ts`, and the constructor, `willUpdate()`, and `render()` of every component; the SSR fixture of `check:consumer` (`test/package/ssr/`).

## 1. Model

- **A first paint, then the client.** An application may render core's components on a server with `@lit-labs/ssr`. The HTML it sends, with each component's shadow tree as a declarative shadow root, paints styled components before any script runs. When a component's definition loads, the component replaces the server's shadow tree with its client render (§4), or, on a page that opts in, hydrates it: keeps it and attaches to it (§5).
- **Why replace by default:** Lit's hydration keeps the values the server rendered and checks none of them, so anything the server could not know (§3) stays wrong until it changes again. With Lit's `lit-element-hydrate-support.js` alone, a hydrated production stat in a `lang="de"` page would still read `12,345.6`, a panel's header and a divider's label would stay hidden although they have content, and every hydrated shadow root would keep the server's `<style>` and adopt none of the shared sheets of [component-model.md §10](component-model.md). Replacement is correct with no agreement between server and client. Core's hydration (§5) makes the client agree first, and is opt-in because its bytes serve only pages that hydrate.
- **Optional.** Client-only use is unchanged. Core has no dependency on `@lit-labs/ssr` or `@lit-labs/ssr-client`, not even an optional peer; the application installs them. Core does not bundle Lit ([toolchain.md §2](toolchain.md)), so Lit's own `node` export condition selects its server build, and core's exports need no `node` condition.
- **Version.** Lit SSR is a Lit Labs package and may change. Core supports the `@lit-labs/ssr` major version that matches its `lit` dependency, and the fixture installs the latest release of it.

## 2. On the server

Lit SSR runs a component's constructor, its property setters, `willUpdate()`, and `render()`, and evaluates its static styles. It does not call `connectedCallback`, `update()`, `firstUpdated()`, `updated()`, or a controller's `hostConnected`. Its DOM shim gives an element attributes, `ElementInternals` with no-op form methods, and events, but no tree: no `children`, parent, `querySelector`, `closest`, `matches`, or slot assignment, and no `document` or `window`.

- **Imports.** Importing any class or registration entry under the shim throws nothing and does nothing beyond what [component-model.md §10](component-model.md) allows at module load.
- **Rendering.** Rendering any tag, with any attributes and children, throws nothing. The code that runs on the server reads only the component's own properties and attributes. It never reads the tree, `document`, `window`, layout, or an observer; a value that depends on them takes the server value of §3. `serverValues()` (`internal/server-values.ts`), true on the server and in a hydrating render (§5), guards a read only where a render path cannot avoid one.
- **No `connectedCallback` opt-in.** Core works with `LitElementRenderer`'s defaults and needs no `renderOptions`. What a component writes to its host on connect (roles, `tabindex`, ARIA states, ids; [component-model.md §7](component-model.md)) arrives with the upgrade, not in the server's HTML.
- **No ids.** No id is generated on the server, so the server's ids never meet the client's `uid` ids.
- **Messages.** `msg()` returns the server's active Lit Localize locale: English without configuration. That locale is module state shared by every request, so a server does not render two languages at once; the upgrade renders the page's locale in any case.
- **Development warnings** fire on the server as in the browser when the server resolves the `development` condition (`node --conditions=development`), which selects the same modules with their warnings ([package-contract.md §6](package-contract.md)).

## 3. What the server cannot know

| Input                                                                                        | The server renders                                                                                                                   | After the upgrade                                                    |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| The language for formatting, from the nearest `lang` ([localization.md §7](localization.md)) | The host's own `lang`, else `en`                                                                                                     | The nearest `lang`                                                   |
| Direction read in script                                                                     | The host's own `dir`, else left to right. Direction in CSS (`:dir()`, logical properties) is the browser's, and right from the start | The element's direction                                              |
| Light-DOM children: options, items, counts, overflow                                         | As if it had none. Slotted content still shows, since the browser assigns it to the server's slots                                   | Read from the children                                               |
| Slot presence ([component-model.md §4](component-model.md))                                  | The slots the host's `data-punk-slots` names (`default` for the default slot); without it, none: optional strips hidden              | Strips shown where their slot has content                            |
| What a component writes on connect                                                           | Nothing                                                                                                                              | Written                                                              |
| `open` on an overlay                                                                         | Closed: the dialog, window, and drawer as a closed `<dialog>`, the popover, tooltip, and menu as a popover not shown                 | Open, and modal where the overlay is ([overlays.md §3](overlays.md)) |
| Layout: sizes, the toolbar's overflow, a menu's placement                                    | As before the first layout                                                                                                           | Measured                                                             |

An application avoids a visible change at the upgrade by setting on each host what the server can read: `lang` and `dir`, where the page's are not `en` and left to right, and `data-punk-slots` with the names of the slots it fills, such as `<punk-panel data-punk-slots="header footer">`. Without the hint a server-rendered panel hides its header and footer until the upgrade. The hint is read only on the server and in the hydrating render; afterwards the real children decide, so a wrong hint lasts only until the upgrade. An overlay with `open` still opens only at the upgrade.

## 4. Upgrade

- **Replace.** When a component's definition loads and its host already has a shadow root, the component empties that root, adopts its shared style sheets, and renders as on the client. The result equals a client render of the same markup: the same shadow tree, the same host attributes apart from generated ids, the shared sheets, and no `<style>`.
- **With or without hydration support.** Components replace unless the page loads both Lit's hydration support and `@dieselpunk/core/hydrate.js` (§5): Lit's support alone, which an application may load for its own components, does not hydrate them. A core component inside an application component's server-rendered shadow root waits for that component's `defer-hydration` to be removed, as Lit's hydration support arranges.
- **No flash.** The replacement is the element's first update, in the task that defines it, so no frame paints between the server's tree and the client's.
- **Before the upgrade** the server's HTML is static. Slotted links work, and a native control in a shadow tree can take focus and input. On the upgrade, focus inside the old tree moves to the component's focus target, and a value typed or a box checked in a form control's inner native control becomes the control's value, with no `input` or `change` event. Nothing else done before the upgrade is kept.
- **Forms.** A form submitted before its controls upgrade does not include their values: an undefined element is not form-associated. An application that must accept such a submission enables its submit button once the definitions load, or renders native controls.

## 5. Hydration

A page hydrates core's components by importing `@lit-labs/ssr-client/lit-element-hydrate-support.js` and then `@dieselpunk/core/hydrate.js`, before any component. A component then keeps the server's shadow tree and attaches to it instead of rebuilding it. **Why:** the nodes a user already sees, focused, or typed into stay the same nodes, and the upgrade creates no DOM for a tree that is already right.

- **Agreement.** Lit records the hydrating render's values as committed without reading the DOM, so that render must produce exactly what the server sent: a value that differs would stay as the server rendered it until it changed again, and a different template throws `Hydration value mismatch`. The hydrating render therefore runs with `serverValues()` true, and every read of an input the server cannot see takes the server's value: the inputs of §3, a form control's name from `<label>` elements, a disabled `<fieldset>`, a date or time field's parsing, and state written to a component before it hydrates, by its owner or its own connect (a step's position, a radio's checked state, a menu item in a menubar, a button's tab stop in a toolbar).
- **Empty text.** Lit hydrates an empty text binding with no text node and would write later text into the closing marker, so `hydrate.js` gives each one a node.
- **Then the page's values.** In the microtask after hydrating, once the children already queued have hydrated, the component requests every property again and fires `slotchange` on each of its slots, which were assigned while the page was parsed. Owners find their children ([component-model.md §8](component-model.md)), slot presence is read, and an ordinary update commits only what differs from the server's.
- **Styles.** A hydrated shadow root removes the server's style elements (§6) and adopts its shared sheets, so [component-model.md §10](component-model.md) holds as after a client render.
- **Before and after.** Interaction before the upgrade works as in §4, and focus stays because the nodes stay. Text typed into a field is kept as in §4, since the field's value binding is committed while hydrating. The final state equals a client render of the same markup.
- **Without either import,** components replace as §4 says. Core never loads Lit's hydration support itself and gains no dependency for it.
- **Order is a requirement.** Lit's support patches `LitElement` only if it evaluates before `lit-element`, and the page's import order does not guarantee that once a bundler groups or hoists modules (a Rolldown or Vite `codeSplitting` group orders modules across the whole graph). The application must keep the support first: its own entry module or `<script type="module">` ahead of the app bundle, or a bundler setting that keeps execution order (Rolldown's `strictExecutionOrder`). Unpatched Lit would render a second tree into each server root, so `hydrate.js` claims a root only when the patch is in place (`observedAttributes` includes `defer-hydration`); otherwise components replace as §4 says, silently. **Why** no warning: the setup guide states the order, the fallback is correct, and a check that only explains it is bytes in every hydrating page.
- **Cost.** `hydrate.js` is about 0.6 kB, paid only by pages that import it; `PunkElement` carries only the hook it installs into. A hydrated element creates no shadow DOM and renders twice: to attach, and with the page's values.

## 6. Cost

- **Client.** The upgrade renders each element once, as a client-only page does, and a hydrated element twice (§5). The replacement of §4 and the hook for §5 live in `PunkElement` and are counted in every entry's size ([performance.md §2](performance.md)); hydration itself is `hydrate.js`, its own size entry.
- **Server output.** Lit SSR writes a component's styles into every instance's declarative shadow root, and styles are most of each instance's bytes: 100 server-rendered slots are about 692 kB of HTML. Brotli absorbs the repetition (about 2.2 kB), but gzip's 32 KB window does not when instances are far apart: nine icon buttons about 40 KB apart add 32.3 kB gzipped against 2.5 kB with brotli, and a host that serves only gzip (GitHub Pages) pays the larger figure. Shared styles (below) write each sheet once: 94 kB raw and 3.1 kB gzipped for the slots, 8.6 kB gzipped for the buttons. Long collections are still rendered on the client ([performance.md §4.1](performance.md)).

**Shared styles.** A server may render with `shareStyles(LitElementRenderer)` from `@dieselpunk/core/ssr.js` (`src/ssr.ts`), with the page running `sharedStylesScript` in its `<head>`. **Why** a script: markup has no way to share a style sheet between shadow roots, and a `<link>` in each root costs a request and may paint unstyled until it loads.

- **Once per render.** A shadow root whose sheets were all written earlier in the same render holds only `<punk-styles sheets="…">`, naming its sheets in order. Any other root writes every one of its sheets as a `<style data-punk-sheet="…">`, then the same `<punk-styles>`. A root never mixes written and named sheets, so the cascade order is the component's.
- **Ids** are a 64-bit hash of a sheet's text, so separately rendered parts of a page, and different processes, agree on them. Sheets are shared within one `render()` call; a page assembled from several writes each part's sheets again, which is correct but larger.
- **Every Lit element.** The renderer extends Lit SSR's `LitElementRenderer`, which core imports nothing from: the application passes its own in. It shares the sheets of every Lit element it renders, the application's too, and leaves any root that is not shaped as Lit SSR writes it untouched.
- **The script** defines `<punk-styles>` (about 0.43 kB gzipped). When one connects, it builds a constructed sheet from each `<style data-punk-sheet>` its root holds and has not seen, adopts the named sheets into its root in order, and removes those `<style>` elements and itself. In the `<head>` it runs before the body is parsed, so each root is styled as it is parsed, before the first paint. Run later, it upgrades every `<punk-styles>` in document order, and roots that only name their sheets paint unstyled until then. A root that names a sheet no earlier root wrote, such as one whose first writer was inside a `<template>`, is left as it is.
- **Without the script** only the roots that write their sheets are styled. Pages that must paint styled without script do not share styles.
- **The upgrade** is unchanged: replacing (§4) empties the root and adopts the component's own sheets, and hydrating (§5) removes any `<style>` and `<punk-styles>` the script did not, then adopts them.
- **The tag** `punk-styles` is defined only by the script, in the page; `ssr.js` registers nothing when imported ([package-contract.md §2](package-contract.md)).

## 7. Application setup

Example: the server imports registration entries and renders a full page; the client imports the same entries. To hydrate (§5), the client first imports Lit's hydration support and then `@dieselpunk/core/hydrate.js`.

```ts
// server.ts
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/button/register.js';
import { html, renderThunked } from '@lit-labs/ssr';
import { RenderResultReadable } from '@lit-labs/ssr/lib/render-result-readable.js';

const page = html`<!doctype html>
  <html lang="en">
    <head>
      <link rel="stylesheet" href="/tokens.css" />
      <script type="module" src="/client.js"></script>
    </head>
    <body>
      <punk-panel><span slot="header">Assembler</span><punk-button>Craft</punk-button></punk-panel>
    </body>
  </html>`;
response.body = new RenderResultReadable(renderThunked(page));

// client.ts
// To hydrate, import these two first:
// import '@lit-labs/ssr-client/lit-element-hydrate-support.js';
// import '@dieselpunk/core/hydrate.js';
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/button/register.js';
```

`tokens.css` and `themes.css` are linked as in a client-only page; their custom properties reach declarative shadow roots like any other. The workbench's Server rendering guide shows this setup, both ways of loading the components, sharing styles, and what the first paint cannot know ([workbench.md §4](workbench.md)).

To share styles (§6), the server renders the whole page in one render with the shared renderer, which it can create once, and inlines the script ahead of the body:

```ts
// server.ts
import { LitElementRenderer, html, renderThunked } from '@lit-labs/ssr';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { shareStyles, sharedStylesScript } from '@dieselpunk/core/ssr.js';

const elementRenderers = [shareStyles(LitElementRenderer)];
const page = html`<!doctype html>
  <html lang="en">
    <head>
      ${unsafeHTML(`<script>${sharedStylesScript}</script>`)}
      <link rel="stylesheet" href="/tokens.css" />
      <script type="module" src="/client.js"></script>
    </head>
    <body>
      …
    </body>
  </html>`;
response.body = new RenderResultReadable(renderThunked(page, { elementRenderers }));
```

**Content Security Policy.** A server-rendered page takes the policy of [security.md §4.3](security.md) and adds `style-src-elem 'unsafe-inline'`, or the hashes of the components' styles: each declarative shadow root carries its component's styles in a `<style>` element, where a client-only page adopts them as constructed stylesheets. With shared styles, only the roots that write their sheets carry them, and `script-src` adds the hash of `sharedStylesScript` (`'sha256-'` and the base64 SHA-256 of its text), which the server can compute when it starts. Scripts stay as strict otherwise; hydration needs no inline script. No gate renders a server page under this policy, since the SSR fixture drives its pages with inline scripts.

## Verification

- **`check:consumer`** installs the packed core with `@lit-labs/ssr` and `@lit-labs/ssr-client` into a throwaway project of its own ([testing.md §8](testing.md)) and runs the SSR fixture in `test/package/ssr/`:
  - Under Node, it imports every registration entry and renders every tag, empty and with representative attributes and children. It fails on a throw, a logged error, output without a declarative shadow root, or a generated id. With shared styles, nine icon buttons in one render must write as many `<style>` elements as one, and every shadow root must name its sheets.
  - In Chromium, it serves a server-rendered page with `lang="de"` and `dir="rtl"` and lets it upgrade four times: without Lit's hydration support, with it alone, with it and `hydrate.js`, and with both evaluated after `lit-element`, which must replace. It serves the same page rendered in one render with shared styles twice more, replacing and hydrating; before the upgrade, each element's first server node must look as on the first page (its computed display, colors, border, padding, font, and size), and no shadow root may hold a `<style>` or `<punk-styles>`. Every element's shadow tree and host attributes must equal a client render of the same markup, and so must the whole subtree of each composed case (owners with their children, a control named by a `<label>`, a control in a disabled `<fieldset>`, fields with values and hints, groups that set their children's state); every shadow root must adopt its shared sheets and hold no `<style>`; numbers are German, strips with content are shown, an overlay with `open` is open; a value typed before the upgrade is the control's value; and nothing is logged.
  - Each element's first server node is marked before the upgrade. It must be the same node after it on the pages that hydrate, and gone on the others.
- §2's rule that server code reads no tree is enforced by the Node render, which throws on any such read.
- `src/internal/punk-element.test.ts`: an element defined over a filled shadow root replaces it and adopts the shared sheets, moves focus from the old tree to itself, and a text field keeps text typed before the upgrade with no event.
- `src/ssr.test.ts` (each browser engine): the renderer writes a root's sheets once per render and then only names them, writes every sheet of a root with a new one, starts over in each render with the same ids, and leaves other roots alone. Pages parsed in a frame adopt the named sheets in order while they are parsed, through nested roots, with no `<style>` or `<punk-styles>` left; the script also works after the body, leaves a root that names an unwritten sheet as it is, and defines its tag once.

## Gaps

- **Messages while hydrating.** A hydrating render reads messages in the page's active Lit Localize locale, which agrees with the server only when both use the same one at that moment (English, without configuration). A page whose locale differs then keeps the server's words until the locale changes. Closing it: the server writes its locale into the page, and `hydrate.js` renders the hydrating pass in it.
- **No new state is checked automatically.** A component that adds state written before it hydrates, outside §3, must read it through `serverValues()`; the fixture finds a missed one only if a composed case covers it.
- **Shared styles need script.** Without `sharedStylesScript`, a root that only names its sheets paints unstyled (§6), so a page that must paint styled without script keeps a `<style>` in every root and its gzip cost. Closing it: declarative sharing of style sheets between shadow roots, proposed but shipped in no engine; revisit when it ships, and render to it instead.
- **No gate renders under the policy.** The hash of `sharedStylesScript` and the `<style>` elements of the roots that write their sheets are not checked under a Content Security Policy (§7).
