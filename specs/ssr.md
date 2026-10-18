# Server Rendering

**Scope:** rendering core's components to HTML on a server with Lit SSR (`@lit-labs/ssr`), what that HTML holds and what it cannot, what a component does when its definition loads over it, and hydration, which follows.
**Code:** `packages/core/src/internal/punk-element.ts`, and the constructor, `willUpdate()`, and `render()` of every component; the SSR fixture of `check:consumer`.

## 1. Model

- **A first paint, then hydration.** An application may render core's components on a server with `@lit-labs/ssr`. The HTML it sends, with each component's shadow tree as a declarative shadow root, paints styled components before any script runs. When a component's definition loads, the component replaces the server's shadow tree with its client render (§4). Hydration, which keeps the server's tree and attaches to it, is the follow-up (§5).
- **Why replace first:** Lit's hydration keeps the values the server rendered and checks none of them, so anything the server could not know (§3) stays wrong until it changes again. With `lit-element-hydrate-support.js` loaded today, a hydrated production stat in a `lang="de"` page still reads `12,345.6`, a panel's header and a divider's label stay hidden although they have content, and every hydrated shadow root keeps the server's `<style>` and adopts none of the shared sheets of [component-model.md §10](component-model.md). Replacement is correct with no agreement between server and client; hydration needs the agreement of §5 first.
- **Optional.** Client-only use is unchanged. Core has no dependency on `@lit-labs/ssr` or `@lit-labs/ssr-client`, not even an optional peer; the application installs them. Core does not bundle Lit ([toolchain.md §2](toolchain.md)), so Lit's own `node` export condition selects its server build, and core's exports need no `node` condition.
- **Version.** Lit SSR is a Lit Labs package and may change. Core supports the `@lit-labs/ssr` major version that matches its `lit` dependency, and the fixture installs the latest release of it.

## 2. On the server

Lit SSR runs a component's constructor, its property setters, `willUpdate()`, and `render()`, and evaluates its static styles. It does not call `connectedCallback`, `update()`, `firstUpdated()`, `updated()`, or a controller's `hostConnected`. Its DOM shim gives an element attributes, `ElementInternals` with no-op form methods, and events, but no tree: no `children`, parent, `querySelector`, `closest`, `matches`, or slot assignment, and no `document` or `window`.

- **Imports.** Importing any class or registration entry under the shim throws nothing and does nothing beyond what [component-model.md §10](component-model.md) allows at module load.
- **Rendering.** Rendering any tag, with any attributes and children, throws nothing. The code that runs on the server reads only the component's own properties and attributes. It never reads the tree, `document`, `window`, layout, or an observer; a value that depends on them takes the server value of §3. `isServer` from `lit` guards a read only where a render path cannot avoid one.
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
| Slot presence ([component-model.md §4](component-model.md))                                  | No content: optional strips hidden                                                                                                   | Strips shown where their slot has content                            |
| What a component writes on connect                                                           | Nothing                                                                                                                              | Written                                                              |
| `open` on an overlay                                                                         | Closed: the dialog, window, and drawer as a closed `<dialog>`, the popover, tooltip, and menu as a popover not shown                 | Open, and modal where the overlay is ([overlays.md §3](overlays.md)) |
| Layout: sizes, the toolbar's overflow, a menu's placement                                    | As before the first layout                                                                                                           | Measured                                                             |

An application avoids a visible change at the upgrade by setting on each host what the server can read: `lang` and `dir`, where the page's are not `en` and left to right. An overlay with `open` still opens only at the upgrade.

## 4. Upgrade

- **Replace.** When a component's definition loads and its host already has a shadow root, the component empties that root, adopts its shared style sheets, and renders as on the client. The result equals a client render of the same markup: the same shadow tree, the same host attributes apart from generated ids, the shared sheets, and no `<style>`.
- **With or without hydration support.** Until §5 is built, the result is the same whether or not the application loads `@lit-labs/ssr-client/lit-element-hydrate-support.js`: core's components replace. Once it is built, they hydrate when the support is loaded and replace when it is not. A core component inside an application component's server-rendered shadow root waits for that component's `defer-hydration` to be removed, as Lit's hydration support arranges.
- **No flash.** The replacement is the element's first update, in the task that defines it, so no frame paints between the server's tree and the client's.
- **Before the upgrade** the server's HTML is static. Slotted links work, and a native control in a shadow tree can take focus and input. On the upgrade, focus inside the old tree moves to the component's focus target, and a value typed or a box checked in a form control's inner native control becomes the control's value, with no `input` or `change` event. Nothing else done before the upgrade is kept.
- **Forms.** A form submitted before its controls upgrade does not include their values: an undefined element is not form-associated. An application that must accept such a submission enables its submit button once the definitions load, or renders native controls.

## 5. Hydration

Hydration is the follow-up to §4: when the application loads Lit's hydration support, a component keeps the server's shadow tree and attaches to it instead of rebuilding it. **Why:** the nodes a user already sees, focused, or typed into stay the same nodes, and the upgrade creates no DOM for a tree that is already right.

- **Agreement.** Lit commits nothing while it hydrates, so the hydrating render must produce exactly what the server sent. A component's first client render under hydration uses the server values of §3, not the page's: the host's own `lang` and `dir`, no children, no slot content, closed overlays. Lit's `Hydration value mismatch` error is then impossible, and so is a silently stale value.
- **Then the page's values.** Right after hydrating, the component reads what the server could not know and updates once if any of it differs, as an ordinary update that commits the differences. A component whose inputs all match the server's (a `lang` set on the host, no optional slots, no children) does not update again.
- **Styles.** After hydrating, a shadow root adopts its shared sheets and removes the server's `<style>`, so [component-model.md §10](component-model.md) holds as after a client render.
- **Before and after.** Interaction before the upgrade works as in §4 and needs no carry-over: focus and typed values stay because the nodes stay. The final state equals a client render of the same markup, as in §4.
- **Without the support** loaded, components replace as §4 says. Core never loads the hydration support itself and gains no dependency for it; the application loads it before Lit, as Lit documents.
- **Cost.** The client creates no shadow DOM for a hydrated element, and renders it a second time only for the inputs that differ. The hydration support's own bytes are the application's.

## 6. Cost

- **Client.** The upgrade renders each element once, as a client-only page does. The replacement of §4 and the hydration of §5 live in `PunkElement` and are counted in every entry's size ([performance.md §2](performance.md)); nothing else ships for server rendering.
- **Server output.** Lit SSR writes a component's styles into every instance's declarative shadow root, and styles are most of each instance's bytes. Compression absorbs the repetition: 100 server-rendered slots are about 634 kB of HTML and about 7 kB gzipped. Pages are served compressed, and long collections are rendered on the client ([performance.md §4.1](performance.md)).

## 7. Application setup

Example: the server imports registration entries and renders a full page; the client imports the same entries. To hydrate (§5), the client imports `@lit-labs/ssr-client/lit-element-hydrate-support.js` first.

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
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/button/register.js';
```

`tokens.css` and `themes.css` are linked as in a client-only page; their custom properties reach declarative shadow roots like any other. The workbench's Integration guide shows this setup ([workbench.md §4](workbench.md)).

## Verification

- **`check:consumer`** installs `@lit-labs/ssr` into its throwaway project beside the packed tarballs ([testing.md §8](testing.md)) and runs an SSR fixture:
  - Under Node, it imports every registration entry and renders every tag, empty and with representative attributes and children. It fails on a throw, a logged error, output without a declarative shadow root, or a generated id.
  - In Chromium, it serves a server-rendered page with `lang="de"` and `dir="rtl"` and lets it upgrade, once with Lit's hydration support loaded and once without. Every element's shadow tree and host attributes must equal a client render of the same markup; every shadow root must adopt its shared sheets and hold no `<style>`; numbers are German, strips with content are shown, an overlay with `open` is open; a value typed before the upgrade is the control's value; and nothing is logged.
  - With hydration support loaded and §5 built, the same page must also keep each element's server nodes: a node marked before the upgrade is the same node after it, unless an input of §3 changed it.
- §2's rule that server code reads no tree is enforced by the Node render, which throws on any such read.

## Gaps

- **The upgrade does not replace.** `PunkElement` has no handling for an existing shadow root. With Lit's hydration support loaded, components hydrate, with the results of §1; without it, Lit renders a second shadow tree after the server's. Focus and values from before the upgrade are not carried over. Closing it: §4 in `PunkElement`.
- **No fixture and no guide.** `check:consumer` has no SSR fixture, and the Integration guide does not describe server rendering.
- **No hydration.** §5 is the follow-up to §4 and is built after it: it needs the replacement path for pages without the support.
