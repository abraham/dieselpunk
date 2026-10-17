# Performance

**Scope:** what the library may cost, in bytes and at run time, and the deterministic gates that hold those costs.
**Code:** `.size-limit.json` and `.size-limit.reasons.json` in each package, `packages/core/scripts/check-size-reasons.ts`, `test/browser/perf.test.ts`, `perf-shell.test.ts`, `perf-production.test.ts`, `perf-idle.test.ts`.

## 1. Principles

1. **Measure before limiting.** A limit is set from a measurement, never guessed.
2. **Assert what is deterministic.** Frame times on a CI runner are too noisy to assert. The gates count what makes a page fast: listeners, observers, timers, animation frames, renders, layout reads, elements, and style sheets.
3. **Change code only where a gate or a limit shows a cost**, and never at the price of a pixel: tuning keeps the visual check green with no new baseline.
4. **Pay per use.** An application pays for the components it registers and nothing else, and a component costs nothing while nothing happens.

## 2. Size budgets

Sizes are minified and gzip-compressed, with Lit (and, for the locales package, `@lit/localize`) excluded. Each entry is measured whole: what an application that imports only that entry downloads, including the shared code it pulls in.

| Entry                                  | Budget       |
| -------------------------------------- | ------------ |
| Shared runtime and tokens              | 12 kB, fixed |
| Each component's register entry        | 5 kB         |
| Each shared base (measured on its own) | 5 kB         |
| Each locale module                     | 1 kB         |
| The locales loader                     | 1 kB         |
| `@dieselpunk/locales/document`         | 0.5 kB       |

- **Limits are a ratchet.** Each entry's limit in `.size-limit.json` is its measured size plus about 6%, rounded up to 0.25 kB, never above its budget without a reason. An entry that grows past its limit fails `check:size`; the change either takes something out or raises the limit with a reason in the same pull request.
- **Every entry has a reason.** `.size-limit.reasons.json` gives each entry's reason, and `check:size` fails when an entry has no reason or a reason has no entry. An entry over its budget states why the excess cannot be split out.
- **Shared bases have their own entries** (the form base and field styles, the modal controller, the roving controller, the close button and status shapes, the localization runtime, the selectable base and receptacle), so their growth is seen once, not only as growth of every entry that uses them.
- **Splitting before raising.** When an entry would pass its budget, the first remedy is to move code that only some users need out of the shared base.

**Why** whole-entry measurement: it is what an application pays. A shared base counts in every entry that imports it, but an application that imports several pays for it once, and the docs' Performance guide says so.

## 3. Runtime rules

**Listeners.**

- No component adds a listener to `document` or `window` while idle. An overlay adds its listeners when it opens and removes them when it closes; a drag adds them for the gesture; a countdown for its life.
- The one permanent listener is the locale watcher's `lit-localize-status` on `window`, one per page ([localization.md §3](localization.md)).
- Containers listen once on themselves, not once per child.

**Observers.** An observer exists only where it carries state that cannot be derived another way:

| Observer           | Who                          | When                                             |
| ------------------ | ---------------------------- | ------------------------------------------------ |
| `ResizeObserver`   | Toolbar without `wrap`       | While connected, one per toolbar                 |
| `ResizeObserver`   | Tooltip, popover             | While open, on the anchor                        |
| `MutationObserver` | Select                       | While connected, to mirror its options           |
| `MutationObserver` | Tooltip anchored to a button | While connected, to keep the description current |

No `IntersectionObserver`, and no observer on `document`.

**Layout reads.** `render()` reads no layout. A keypress reads none, except a vertical move in a slot grid (one rectangle per item). A drag reads its rectangles once, when it starts, and computes every move from them. Text read from slots is read on `slotchange`, not in render.

**Renders.** Setting a property to the value it has renders nothing. Setting one stat's value renders that stat only. Many changes in one task render each component once. A locale change renders each message-rendering component once.

**DOM and styles.** Each instance's shadow tree has a fixed number of elements, independent of its value, label, or status: at most 16 for a production stat and 18 for a connection row, and a meter's segments are one gradient, not elements. Every instance of a class adopts the same `CSSStyleSheet` objects; no template contains a `<style>`.

**Time.** No component polls. No `requestAnimationFrame` loop runs while idle; scroll-driven repositioning of an open overlay is frame-throttled. The only timers are real countdowns (a tooltip's delay, a toast's duration, a stepper's repeat), and none exists while paused or finished. No animation runs continuously except an indeterminate progress bar and a loading spinner, and neither runs under reduced motion.

## 4. Large collections

- A slot grid of 100 items navigates without per-item listeners, observers, or layout reads on horizontal moves, and moving focus changes the `tabindex` of exactly two elements.
- A dashboard of 200 stats and 200 connection rows adds no listener or observer beyond §3, and updates each changed stat with one render.
- **Long lists** are the application's: it pages, filters, or virtualizes them. For a list of hundreds of rows an application may set `content-visibility: auto` with a `contain-intrinsic-size` on the hosts from its own styles; the Performance guide gives the measured effect and the caveats (find-in-page, focus, and scroll anchoring differ by browser). The library does not set it by default.

## 5. The idle page

With every component mounted at once (the gallery) and no input for a second after the first frame settles: no frame callback, timeout, or interval the library started is pending; `document.getAnimations()` is empty; the only observers are those §3 lists for the mounted configuration; and the only listeners on `document` and `window` are the locale listener and those of overlays that are open.

## Verification

- `check:size` (`check-size-reasons.ts`, then `size-limit`) in both packages.
- `perf.test.ts`: the 100-item grid (§4).
- `perf-shell.test.ts`: no listener or observer with every overlay closed; one Escape listener for any number of open overlays; popover listeners and observer only while open; one `ResizeObserver` per non-wrapping toolbar and none with `wrap`; no layout read on a toolbar arrow; one track read per slider drag; ten toasts, ten timers, none while hovered.
- `perf-production.test.ts`: the dashboard (§4), fixed element counts across values, labels, trends, statuses, and directions, shared sheets, renders per change, and one render per locale change.
- `perf-idle.test.ts`: §5.
- Every gate is made to fail once by adding the cost it guards ([testing.md §7](testing.md)).
- Informational, printed in the log and not asserted: dashboard render time, element definition time, one `setLocale` over the dashboard, and a 50-control form.

## Gaps

- **Twelve entries exceed the 5 kB component budget,** each with a stated reason: item stack, recipe, connection row, tabs, window, popover, the toast pair, slider, text field, number field, select, and icon button. Most of the excess is a shared base counted in each entry (the form base and field styles are about 4.4 kB of each field). Closing it means shrinking the shared bases (the form base, the receptacle, the modal surface) rather than raising limits.
- **Many entries have under 100 bytes of headroom.** Any feature added to them must first take something out.
