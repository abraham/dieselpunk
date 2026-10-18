# Accessibility

**Scope:** the accessibility architecture shared by every component: semantics, names, relationships across shadow roots, non-color cues, contrast, targets, reflow, forced colors, motion, announcements, and the manual checks no gate can make.
**Target:** WCAG 2.2 AA, in Chromium, Firefox, and WebKit, with every theme and density.

## 1. Principles

1. Native elements whenever their semantics fit; custom roles only where no native element can do the job.
2. Semantics are visible in the DOM that tools read.
3. Names come from text the user can see, or text that sits beside it in the same tree.
4. Nothing relies on color, hover, motion, or a pointer alone.
5. What cannot be automated is written down and done by a person before a release.

## 2. Semantics

- **Native inside.** Buttons, the accordion trigger, the close and remove buttons, text and number inputs, and the select render a native element in the shadow tree. Windows and dialogs are `<dialog>`. Popovers, the toast stack, and tooltips use the Popover API.
- **Custom roles on the host** where a native element cannot be the widget: an item that must be an `option` in one container and a `button` in another, a checkbox or switch whose host is the focus target, a slider that needs pointer capture, a tab, a progress bar or meter with custom markup.
- **Roles and states are host attributes** ([component-model.md §7](component-model.md)), so axe, Playwright's role engine, and application tests see what assistive technology sees.
- **A container owns its children's roles.** The slot grid makes items `option` or `button`, tabs make panels `tabpanel`, and each gives back what it wrote.
- **Composite structure follows WAI-ARIA**, and where no pattern fits exactly, the closest correct one is chosen and said: the slot grid is a `listbox` (or a `group` of buttons) rather than a `grid`, because a wrapping layout has no rows and cells ([keyboard-and-selection.md §6](keyboard-and-selection.md)).

## 3. Accessible names

- **Name from content.** Roles that take their name from content (`button`, `option`, `tab`, `meter`, `progressbar` by label) are named by text rendered in the shadow tree: the label, the count, and the words for each state that applies ("invalid", "durability 40%"). Text that is not shown is visually hidden (`styles/visually-hidden.ts`), never `display: none`.
- **No `aria-label` written onto a host as its name**, so a consumer's `aria-label` always wins and localization stays in one place. Where a host must carry the name for tooling to reach it, the component copies it there and marks it as its own: the slider copies `label` to its host's `aria-label`, and the formatted value to `aria-valuetext`, unless the author set them.
- **Copy, never reference, across a shadow boundary.** An id reference cannot cross one, so a name or description that must reach a control inside a shadow root is copied: a host `aria-label` is mirrored onto an inner button or input.
- **Fields** are named by `label`, else the host's `aria-label`, else the text of an external `<label for>` read on connect and on focus (not live). An external label still focuses the control when clicked.
- **Unique names in lists.** A repeated control is named with its context: a connection row's remove button is "Remove connection: source, destination", or `remove-label`.
- **Readouts read in order.** The production stat and connection row have no role; their text is in reading order (label, value, unit, trend word, change; source, direction word, destination, details, status).
- **A missing name warns** in development, for every component that needs one.

## 4. Relationships across shadow roots

- Id references stay inside one tree: a tab and its panel, an accordion trigger and its region, a field's label, hint, and message.
- **External ARIA protocol.** An overlay that must describe or expand its anchor calls `[setExternalAria]({ description, expanded, haspopup })` when the anchor implements it (the button family, whose inner `<button>` is the real target), and otherwise writes the attribute to the anchor itself. It adds only what it needs, preserves what was there, and removes only what it added.
- **Tooltips describe from the host.** A tooltip's host, which sits beside its anchor in the same tree, gets `role="tooltip"` and an id, and the anchor's `aria-describedby` gains that id. A tooltip is never nested in its anchor, which would add its text to the anchor's name.

## 5. Keyboard and focus

- Every action is available from the keyboard. Composite widgets have one tab stop and arrow keys inside; the patterns are in [keyboard-and-selection.md](keyboard-and-selection.md), and overlay focus in [overlays.md](overlays.md).
- Focus is always visible: the two-tone ring on `:focus-visible`, never removed without a replacement ([visual-system.md §6](visual-system.md)).
- Focus and selection are separate states, and moving focus never changes a selection.
- When the focused element goes away (a removed row, a hidden toolbar item, a closed overlay), focus moves somewhere meaningful: the next item, the overflow trigger, the opener. Where the application owns the removal, the docs show where to move focus.
- Disabled controls leave the tab order, except a loading button, which keeps focus and says it is busy.

## 6. Never color alone

Every state and status has a cue that survives with all colors equal and under forced colors: a shape, a pattern, an outline style, or a word, from the shared vocabulary in [visual-system.md §8](visual-system.md). Status text always carries the meaning; a shape beside it is decorative and hidden from assistive technology. Trends carry no good-or-bad color, because the component cannot know which direction is good.

## 7. Contrast and boundaries

- Text meets 4.5:1 (7:1 in `high-contrast`), and fills, outlines, focus rings, and boundaries 3:1, enforced by the token gate and the placement rules of [visual-system.md §4](visual-system.md).
- A control with no visible text or icon has a 3:1 boundary in `control-edge`. A control identified by its label or icon is not gated on its edges. Disabled controls are exempt (SC 1.4.11).
- Texture and bevels never sit under text at a strength that lowers its contrast, and `reduced-texture` removes them.

## 8. Pointer and targets

- Under a coarse pointer every primary target is at least 40px ([visual-system.md §12](visual-system.md)). Everywhere, every target is at least 24 by 24px or has the spacing SC 2.5.8 allows, or an equivalent control: the number field's half-height steppers are matched by the arrow keys and typing.
- **Dragging has a single-pointer alternative** (SC 2.5.7): a movable window has a move mode operated by clicks and keys, and a slider moves to a click on its track.
- Touch never opens a tooltip; hover never reveals a required action.
- A click in a control's padding acts as a click on the control, and a disabled control's click reaches no listener.

## 9. Reflow, zoom, and text spacing

At 200% zoom and 375px (187 CSS pixels), with long German labels, right-to-left text, and text-spacing overrides, nothing overflows its container or scrolls sideways, and no text is clipped ([visual-system.md §12](visual-system.md)). Toolbars are the accepted exception of SC 1.4.10: without an overflow menu they scroll inside themselves. Overlays fit the viewport and scroll their body.

## 10. Forced colors and motion

- Under forced colors every surface keeps a border, every glyph is redrawn in a system color, and states differ by outline style ([visual-system.md §7](visual-system.md)).
- Under reduced motion nothing moves; accessible values never wait for an animation ([visual-system.md §11](visual-system.md)).

## 11. Announcements

- Nothing announces by default. A component that reports a change while the user is elsewhere does so only when the application opts in: `announce` on the status light and production stat makes the host a polite `status` region, and on the alert a `status` or `alert` region by its variant.
- A loading button announces "Loading" through a visually hidden `status` element beside its inner button, without changing the button's name. A spinner does the same beside its ring, or with its slotted text.
- The toast stack keeps two live regions in the page from the moment it connects, before any toast exists, because a region added together with its content is not reliably announced: `role="status"` for `info` and `success`, `role="alert"` for `warning` and `danger`. Both are `aria-atomic="false"`, so a new toast does not re-read the others.
- Updating dashboards never announce and never move focus.

## 12. Content on hover, timing, and interruption

- **Tooltips** (SC 1.4.13) are dismissible with Escape without moving focus, hoverable (the pointer can move onto them), and persistent until the pointer and focus leave both.
- **Toasts** (SC 2.2.1) pause while hovered, while focus is inside, and while the document is hidden, resume with the time left, and always have a dismiss button. Warnings, errors, and toasts with an action do not time out.
- **Moving content** (SC 2.2.2): the workbench's live examples have a visible pause control, and the docs tell applications to provide one.
- A modal makes the rest of the page inert, including a toast stack outside it; the docs say to put a stack inside a dialog when its toasts must be usable during it.

## 13. Automated checks

axe runs at two levels, and neither replaces the other:

- **The gallery suites are the gate for components.** They render every component in every state, theme, density, and content variant, in all three engines (Verification).
- **The workbench checks compositions** with Storybook's accessibility addon (`@storybook/addon-a11y`, built on axe-core): every story, including the overviews, examples, and foundations, which no gallery group renders.

The workbench configures the addon once, in `.storybook/preview.ts`:

- `parameters.a11y.test` is `'error'`, so a violation of any impact fails the story.
- `parameters.a11y.options.runOnly` is the WCAG 2.0, 2.1, and 2.2 A and AA tags and `best-practice`, because the addon's default stops at WCAG 2.1, below this spec's target.
- The `region` rule is off, as in the gallery suites, since landmarks are the page's job.
- `globals.a11y.manual` is never set: every story is checked when it is shown.

CI runs the addon through `@storybook/addon-vitest`: the workbench's `test:stories` renders every story in Vitest browser mode with Chromium, in the default theme and density, and fails on a violation. Other themes and densities are the gallery suites' job; in the workbench, a reviewer switches them from the toolbar and reads the Accessibility panel, which re-runs on each change.

**Exceptions are visible.** A story with a known violation is marked `a11y: { test: 'todo' }` in its own parameters, never in the meta or the preview, and each one is listed under Gaps. `'off'` is only for a story that shows misuse on purpose. A rule is turned off in a story's `config` only with a comment that names why. A story's rule list replaces the preview's, so each one is built with `axeConfig()` from `src/lib/a11y.ts`, which starts from the rules every story has. Two exceptions are in place, and no story is `'todo'`:

- Theme and density matrices turn off `landmark-unique`, because each cell repeats one example. A state story names each instance instead, as an application with two breadcrumbs or paginations must.
- Tree stories leave open parent items out of `label-content-name-mismatch`, the gallery suites' one exemption: a parent's children show inside it, and its name, its label, is in that text.

A story whose accessible state settles after the first frame waits for it in a `play` function before the check runs: the table's narrow container waits until its scroll area is a tab stop.

The addon checks stories, not MDX docs pages, so the guides are outside it ([workbench.md](workbench.md) Gaps).

## 14. Manual testing

A person runs the Screen reader checklist in the workbench before each release. It covers, with each of NVDA with Firefox and with Chrome on Windows, VoiceOver with Safari on macOS and on iOS, and TalkBack with Chrome on Android:

1. A slot grid: moving, selecting, and hearing the selection.
2. Tabs: moving, activating, and reaching the panel.
3. A window and a dialog: focus in, trapped, and back to the opener.
4. A toast stack: both regions announce, and the dismiss button.
5. A form with a validation message.
6. A popover menu.
7. A stat that announces.
8. Removing a connection row, and where focus goes.

The results table records each combination as passed, failed with an issue link, or not run. A failure is a defect. It is not a gate because CI cannot run a screen reader, so the release record names what was not run ([product.md §9](product.md)).

## Verification

- `test/browser/a11y.test.ts` and `overlays-a11y.test.ts`: axe over every gallery group, theme, density, and content variant, and each open overlay on its own page, with no serious or critical violation; two control tests prove axe can see a violation, including one inside a shadow root. The `region` rule is off, since landmarks are the page's job.
- `test/visual/aria.spec.ts`: Playwright ARIA snapshots of roles, names, and states for every family, in all three engines.
- Each component's tests: names from content, warnings for missing names, ownership restoration, the non-color test, keyboard tables in both directions, and coarse-pointer hit areas.
- `test/browser/reflow.test.ts`, `focus.test.ts`, `forms.test.ts`.
- The `chromium-forced` visual project and each component's forced-colors assertions.
- `packages/locales/test/browser/apply.test.ts`: axe in each shipped locale, including `html-has-lang` and `valid-lang`.
- `packages/workbench`: `test:stories` runs the accessibility addon over every story (§13), in the `smoke` job ([ci.md §3](ci.md)).
- §14 is not automated.

## Gaps

- **The manual checklist has not been run** for any combination; every cell reads "Not run".
- **The listbox slot grid is unverified by ear.** A `listbox` navigated in two dimensions is not an APG pattern, and screen readers may announce it as a flat list. If the checklist shows that, `role="grid"` with generated rows is the alternative to evaluate.
- **A host `aria-label` on `punk-button` is not covered.** Whether axe flags it (`aria-prohibited-attr`) is unknown because the gallery never sets one. Closing it: add the case to the gallery and give the host a role if axe requires one.
- **Platform limits, documented and not closable inside the library:** autofill and password managers do not reliably fill an input inside a shadow root; a native select's open list cannot be themed; native validation messages follow the browser's language; toasts outside a modal are inert while it is open.
