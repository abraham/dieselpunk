# Server Rendering

**Scope:** rendering core's components to HTML on a server with Lit SSR (`@lit-labs/ssr`), what that HTML holds and what it cannot, what a component does when its definition loads over it, and hydration.
**Code:** `packages/core/src/internal/punk-element.ts`, `src/internal/server-values.ts`, `src/hydrate.ts`, and the constructor, `willUpdate()`, and `render()` of every component; the SSR fixture of `check:consumer` (`test/package/ssr/`).

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
- **Development warnings** fire on the server as in the browser, through the same `#dev` module and only in development ([package-contract.md §6](package-contract.md)).

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
- **Styles.** A hydrated shadow root removes the server's `<style>` and adopts its shared sheets, so [component-model.md §10](component-model.md) holds as after a client render.
- **Before and after.** Interaction before the upgrade works as in §4, and focus stays because the nodes stay. Text typed into a field is kept as in §4, since the field's value binding is committed while hydrating. The final state equals a client render of the same markup.
- **Without either import,** components replace as §4 says. Core never loads Lit's hydration support itself and gains no dependency for it.
- **Order is evaluation order.** Lit's support patches `LitElement` only if it evaluates before `lit-element`, and the page's import order does not guarantee that once a bundler groups or hoists modules (a Rolldown or Vite `codeSplitting` group orders modules across the whole graph). Unpatched Lit would render a second tree into each server root. `hydrate.js` therefore claims a root only when the patch is in place (`observedAttributes` includes `defer-hydration`); otherwise components replace as §4 says, and it warns once in development. The application keeps the support first: its own entry module or `<script type="module">` ahead of the app bundle, or a bundler setting that keeps execution order (Rolldown's `strictExecutionOrder`).
- **Cost.** `hydrate.js` is about 0.55 kB, paid only by pages that import it; `PunkElement` carries only the hook it installs into. A hydrated element creates no shadow DOM and renders twice: to attach, and with the page's values.

## 6. Cost

- **Client.** The upgrade renders each element once, as a client-only page does, and a hydrated element twice (§5). The replacement of §4 and the hook for §5 live in `PunkElement` and are counted in every entry's size ([performance.md §2](performance.md)); hydration itself is `hydrate.js`, its own size entry.
- **Server output.** Lit SSR writes a component's styles into every instance's declarative shadow root, and styles are most of each instance's bytes. Compression absorbs the repetition: 100 server-rendered slots are about 634 kB of HTML and about 7 kB gzipped. Pages are served compressed, and long collections are rendered on the client ([performance.md §4.1](performance.md)).

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

`tokens.css` and `themes.css` are linked as in a client-only page; their custom properties reach declarative shadow roots like any other. The workbench's Server rendering guide shows this setup, both ways of loading the components, and what the first paint cannot know ([workbench.md §4](workbench.md)).

**Content Security Policy.** A server-rendered page takes the policy of [security.md §4.3](security.md) and adds `style-src-elem 'unsafe-inline'`, or the hashes of the components' styles: each declarative shadow root carries its component's styles in a `<style>` element, where a client-only page adopts them as constructed stylesheets. Scripts stay as strict; hydration needs no inline script. No gate renders a server page under this policy, since the SSR fixture drives its pages with inline scripts.

## Verification

- **`check:consumer`** installs the packed core with `@lit-labs/ssr` and `@lit-labs/ssr-client` into a throwaway project of its own ([testing.md §8](testing.md)) and runs the SSR fixture in `test/package/ssr/`:
  - Under Node, it imports every registration entry and renders every tag, empty and with representative attributes and children. It fails on a throw, a logged error, output without a declarative shadow root, or a generated id.
  - In Chromium, it serves a server-rendered page with `lang="de"` and `dir="rtl"` and lets it upgrade four times: without Lit's hydration support, with it alone, with it and `hydrate.js`, and with both evaluated after `lit-element`, which must replace and warn once. Every element's shadow tree and host attributes must equal a client render of the same markup, and so must the whole subtree of each composed case (owners with their children, a control named by a `<label>`, a control in a disabled `<fieldset>`, fields with values and hints, groups that set their children's state); every shadow root must adopt its shared sheets and hold no `<style>`; numbers are German, strips with content are shown, an overlay with `open` is open; a value typed before the upgrade is the control's value; and nothing is logged.
  - Each element's first server node is marked before the upgrade. It must be the same node after it on the third page, and gone on the other two.
- §2's rule that server code reads no tree is enforced by the Node render, which throws on any such read.
- `src/internal/punk-element.test.ts`: an element defined over a filled shadow root replaces it and adopts the shared sheets, moves focus from the old tree to itself, and a text field keeps text typed before the upgrade with no event.

## Gaps

- **Messages while hydrating.** A hydrating render reads messages in the page's active Lit Localize locale, which agrees with the server only when both use the same one at that moment (English, without configuration). A page whose locale differs then keeps the server's words until the locale changes. Closing it: the server writes its locale into the page, and `hydrate.js` renders the hydrating pass in it.
- **No new state is checked automatically.** A component that adds state written before it hydrates, outside §3, must read it through `serverValues()`; the fixture finds a missed one only if a composed case covers it.
- **Styles repeat in every instance.** Lit SSR writes a component's styles into each declarative shadow root as a `<style>` (about 10 KB raw for an icon button and its tooltip), since markup has no way to share a sheet between shadow roots. Brotli absorbs the repeats, but gzip's 32 KB window does not when they are far apart: nine icon buttons about 40 KB apart cost 28.5 KB gzipped against 4.1 KB with brotli, and a host that serves only gzip (GitHub Pages) pays the larger figure. Closing it, still to decide:
  - **A link mode.** An opt-in Lit SSR element renderer that replaces each root's `<style>` with a `<link rel="stylesheet">` to one content-hashed file per component, built from `elementStyles` with a tag-to-file manifest; `hydrate.js` removes the `<link>` as it removes the `<style>`. Also drops `style-src-elem 'unsafe-inline'` (§7). Open questions: whether a stylesheet link inside a declarative shadow root blocks the first paint, or the component paints unstyled until it loads (measure on a throttled network, with and without a preload in `<head>`); and whether the base and field styles become shared files, which needs field styles split out of each field's sheet.
  - **The application extracts.** A page that post-processes its server output does the same replacement itself; core only needs `hydrate.js` to remove a `<link>`, and documents the pattern.
  - **The platform.** Declarative sharing of style sheets between shadow roots is proposed but ships in no engine; revisit when it does.
