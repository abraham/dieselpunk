# Visual System

**Scope:** tokens, themes, density, contrast, surfaces, texture, focus, forced colors, the shared non-color vocabulary, typography, icons, motion, and responsive layout.
**Code:** `src/tokens/`, `src/styles/`, `scripts/build-css.ts`, `scripts/render-css.ts`, `scripts/check-contrast.ts`.

## 1. Tokens

### 1.1 Source of truth

Tokens are authored once, in TypeScript data modules that import neither Lit nor the DOM, so Node scripts and the library share them ([toolchain.md §3](toolchain.md)):

| Module                    | Holds                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| `tokens/base.ts`          | Non-color tokens at compact density                              |
| `tokens/default-theme.ts` | The `industrial` palette, which component fallbacks inline       |
| `tokens/themes.ts`        | Every theme's palette, reusing the default one                   |
| `tokens/density.ts`       | Low-density overrides; compact values are derived from `base.ts` |
| `tokens/token.ts`         | `token(name)`, the only way component styles read a token        |

A token name is `--punk-<name>`. Categories: `color-*` (semantic colors), `space-1` to `space-5`, `control-height-sm|md|lg`, `slot-size`, `icon-size-sm|md|lg`, `border-width`, `radius`, `duration-fast|normal`, `z-overlay|modal|toast` (used only where the top layer is unavailable), `font-family`, `font-mono`, `density-scale`, `surface-gradient-strength`, `texture-opacity`, and `tooltip-max-width`.

### 1.2 No global stylesheet

`token(name)` returns `var(--punk-<name>, <compact, industrial default>)`, with the default inlined from the source. An unthemed page therefore renders every component correctly, and any ancestor can override any token. Components never declare token values in `:host`, which would shadow values inherited from ancestors.

### 1.3 Emitted CSS

`build-css.ts` writes two optional stylesheets:

```css
/* tokens.css */
:where(:root) {
  /* base tokens */
}
:where(:root),
[data-punk-theme='industrial'] {
  /* industrial colors */
}
[data-punk-density='compact'] {
  /* compact density */
}
[data-punk-density='low'] {
  /* low density */
}

/* themes.css */
[data-punk-theme='industrial-light'] {
  /* light colors */
}
[data-punk-theme='high-contrast'] {
  /* high-contrast colors */
}
[data-punk-theme='reduced-texture'] {
  /* industrial colors, no texture or gradient */
}
[data-punk-theme='auto'] {
  /* industrial */
}
@media (prefers-color-scheme: light) {
  [data-punk-theme='auto'] {
    /* industrial-light */
  }
}
```

`:where(:root)` has zero specificity, so a theme or density attribute wins in any stylesheet order, including on `<html>`. The explicit `compact` rule lets a compact subtree sit inside a low-density one. Each theme block sets `color-scheme`, so scrollbars and native form chrome match.

### 1.4 Tokens never reference tokens

A token's value is a literal. A custom property whose value uses `var()` is resolved where it is declared, so a derived token on `:root` would ignore an override of its inputs on a subtree. Derived values are composed where they are used: the focus ring from its two colors, the raised gradient from two panel colors and `surface-gradient-strength` with `color-mix()`.

## 2. Themes

| Theme              | Intent                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `industrial`       | The default. Charcoal metal, brass, safety orange                                              |
| `industrial-light` | The same material language on pale steel, with dark text and a darker accent so fills meet 3:1 |
| `high-contrast`    | Black and white with a yellow accent; no gradient, no texture; text at least 7:1               |
| `reduced-texture`  | The `industrial` palette with flat fills and no noise                                          |
| `auto`             | `industrial`, or `industrial-light` under `prefers-color-scheme: light`                        |

Themes override semantic color tokens, never component internals. `tokens/themes.ts` holds the values; the workbench's Colors page shows them with measured ratios. Every theme defines exactly the same token names.

## 3. Density

| Token                             | `compact` (default) | `low`             |
| --------------------------------- | ------------------- | ----------------- |
| `space-1` to `space-5`            | 4, 8, 12, 16, 24    | 5, 10, 15, 20, 30 |
| `control-height-sm`, `-md`, `-lg` | 28, 36, 44          | 34, 44, 54        |
| `slot-size`                       | 40                  | 50                |
| `density-scale`                   | 1                   | 1.25              |

Font sizes do not change with density. Density applies to a document or subtree with `data-punk-density`, and to one panel's subtree with its `density` property. Theme and density are orthogonal: every combination is supported, and changing either restyles mounted components without re-creating them.

## 4. Contrast

### 4.1 Rules

`check-contrast.ts` computes WCAG ratios from the token sources and fails, for any theme, when:

| Pair                                                                     | Against                                  | Minimum                        |
| ------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------ |
| `text`                                                                   | canvas, panel, panel-raised, panel-inset | 4.5:1 (7:1 in `high-contrast`) |
| `text-muted`                                                             | canvas, panel, panel-inset               | 4.5:1 (7:1 in `high-contrast`) |
| `accent-text` on `accent`, `danger-text` on `danger`                     |                                          | 4.5:1 (7:1 in `high-contrast`) |
| Fills: `accent`, `accent-strong`, `warning`, `danger`, `success`, `info` | panel-inset                              | 3:1                            |
| Outlines: `accent` (selection), `warning` (highlight)                    | canvas, panel, panel-raised              | 3:1                            |
| `control-edge`                                                           | all four surfaces                        | 3:1                            |
| `focus` (outer ring)                                                     | all four surfaces                        | 3:1                            |
| `focus-inner` against `focus`                                            |                                          | 3:1                            |

### 4.2 Placement rules that make the gate sufficient

The gate checks token pairs. These rules make sure components only draw pairs the gate checks:

- **Muted text never sits on `panel-raised`.** Raised surfaces carry controls, which use `text`.
- **Status fills sit on `panel-inset`.** `danger`, `success`, and `info` fall below 3:1 on `panel` and `panel-raised` in the dark palette, so every status fill is drawn in an inset trough or lens: meter and durability fills, progress fills, status shapes, and invalid frames.
- **Error and status text is `text`, never `danger`.** The state is carried by a shape, a frame, and a word ([accessibility.md §6](accessibility.md)).
- **Readouts carry their own surface.** The production stat and connection row draw on an inset readout plate (`styles/readout.ts`), so their contrast does not depend on where the application puts them.
- **Control boundaries.** A control with no visible text or icon of its own (an empty slot, an empty field, a checkbox box, a switch or slider track) draws its boundary in `control-edge`. A control identified by its label or icon needs no gated boundary, and disabled controls are exempt (WCAG 2.2 SC 1.4.11). The decorative bevel edges (`edge-light`, `edge-dark`) are not gated.

If a theme fails a rule, the theme's token changes. The rule does not.

## 5. Surfaces and texture

| Surface  | Fill                                                                                                 | Edges                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `raised` | Vertical gradient from `panel-raised` to `panel`, blended by `surface-gradient-strength` (0 is flat) | 1px light top and inline-start, 1px dark bottom and inline-end, and a `border-width` outline in `edge-dark` |
| `inset`  | `panel-inset`                                                                                        | The raised edges reversed                                                                                   |
| `flat`   | `panel`                                                                                              | Outline only                                                                                                |

- `styles/surfaces.ts` exports the three fragments and the shadow lists (`raisedShadow`, `raisedHoverShadow`, `insetShadow`, `outlineShadow`), so a control swaps bevels on hover and press without restating its surface. Hover adds a half-strength second ring, which raises edge contrast in every theme without a new color.
- Corners are at most 4px (`radius`). No glass, glow, pill shapes, blur, or soft shadows.
- **Texture** is one original 128px tiled SVG noise (feTurbulence) as a data URI, on a `pointer-events: none` pseudo-element at `texture-opacity`. Only panels carry it; controls use gradients alone, which keeps paint cheap in dense screens. `reduced-texture` and `high-contrast` set the opacity and gradient strength to zero.

## 6. Focus

- The ring is two-tone: `0 0 0 2px <focus-inner>, 0 0 0 4px <focus>`, drawn on a pseudo-element so it never competes with a bevel's `box-shadow`. In light and high-contrast themes the outer ring is the dark color, so it always contrasts with the surrounding surface.
- `focusRing(selector)` draws it for an inner focus target on `:focus-visible`. `hostFocusRing(selector)` draws it for a host that is itself focused, on a positioned element that fills the host. Both share one implementation. The selector is `position: relative`, and nothing between it and the host clips.
- The default outline is removed only where the ring replaces it.
- Under forced colors the ring is a 2px solid `Highlight` outline.

## 7. Forced colors

- `forcedColorsSurface(selector, colors?)` returns the `@media (forced-colors: active)` block for one surface: gradients, texture, and bevels become a 2px solid border in system colors (`Canvas`/`CanvasText`, or `ButtonFace`/`ButtonText` for controls).
- Selected and active emphasis uses `Highlight`, disabled uses `GrayText`, and focus a `Highlight` outline.
- States stay apart by outline style, not color: selected is a heavy `Highlight` outline, highlighted dotted, invalid dashed. Variants that differ only by fill gain a border difference (a primary button's 4px border, a danger button's dashed border).
- Glyphs drawn as background images are erased by forced colors, so every glyph is drawn with a system color (`ButtonText`, `CanvasText`, `HighlightText`) in a forced-colors rule. Patterns use `Highlight` with `Canvas` gaps, so they survive.

## 8. The non-color vocabulary

These shared cues carry state wherever color would. Components reuse them rather than invent new ones.

| Meaning                            | Cue                                                                                                                       | Module                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Status (`neutral` … `danger`)      | Ring, diamond, filled circle, triangle, square, in an inset lens                                                          | `styles/status-shape.ts`                   |
| Fill state                         | Solid (default or optimal), regular ticks (success), diagonal hatch (warning), cross-hatch (danger)                       | progress bar, meter, item stack durability |
| Receptacle state                   | Selected: a 3px outer ring and a darker fill; highlighted: a dotted outline; invalid: an inner frame and a hatched corner | `styles/receptacle.ts`                     |
| Expanded, collapsed                | Minus and plus                                                                                                            | accordion                                  |
| Checked, mixed, unchecked; on, off | Check, dash, empty; a thumb with a bar at the end, a thumb with a ring at the start                                       | toggles                                    |
| Trend                              | Triangle up, triangle down, bar                                                                                           | production stat                            |
| Direction                          | Arrow with one head or two                                                                                                | connection row                             |
| Validation message                 | Triangle shape and the word                                                                                               | `styles/field.ts`                          |

## 9. Typography

- Core bundles no font. Defaults are `"Chakra Petch", "Trebuchet MS", sans-serif` and `"IBM Plex Mono", "Courier New", monospace`; the workbench loads both (SIL OFL).
- `letter-spacing: 0`. Labels use medium or semibold weight, not all-caps tracking.
- **Changing numbers use the mono family and `tabular-nums`.** The default sans has no tabular figures, so counts, values, and readouts that change in place are set in `font-mono`, and a value from 1,111 to 8,888 keeps its width.
- No viewport-relative font sizing.

## 10. Icons and art

Core ships no icons. Built-in glyphs (check marks, arrows, close X, status shapes, spinner gear) are drawn with CSS. Icon slots take the application's SVG or images, sized to `icon-size-*` and colored with `currentColor` where the art allows. Icon-only controls require an accessible name and show a tooltip. The workbench's demo icons and item art are original, drawn on a 24px grid in `currentColor`, and are not part of either package.

## 11. Motion

Motion is short and functional: a button's 1px press, a fill growing over `duration-normal`, a toast's fade, a switch's slide. Nothing animates continuously except the progress bar's indeterminate stripes and a loading spinner. Under `prefers-reduced-motion: reduce` every transition and animation stops, and the indeterminate and loading states are static. Accessible values never wait for a visual animation.

## 12. Responsive layout

- **Containers decide.** Components respond to their container with container queries and wrapping flex or grid layouts, never to the viewport (windows and toasts measure the viewport only to stay inside it).
- **Reflow.** At 200% zoom a 375px window is 187 CSS pixels wide. No component scrolls sideways or overflows its container down to 187px, in any theme, density, or content variant, including long German words and right-to-left text.
- **Wrap before shrink, shrink before clip.** Labels wrap with `overflow-wrap: break-word` (not `anywhere`, which breaks compound words too eagerly). Single-line controls have a minimum height, not a fixed one, and grow when their label wraps. A grid drops columns before its slots shrink. A word is broken only when it is wider than the whole container.
- **Logical properties** everywhere, so right-to-left needs no extra rules except for glyphs that point (arrows flip with `:dir(rtl)`).
- **Coarse pointers.** Under `pointer: coarse` an interactive target is at least 40px: a control extends its hit area with a transparent pseudo-element and keeps its look; a receptacle in a grid, whose extended areas would overlap, renders at 40px instead.
- **Footers and settings rows** stack at container widths of 480px and below.

## Verification

- `test/tokens.test.ts` (Node): every theme has the same names, values are hex or literals, no token references another, the default palette module matches `themes.ts`, and emitted CSS matches the renderer.
- `check:contrast` and its tests, including a test per rule that fails when the rule's pair is broken.
- `test/browser/foundations.test.ts`: unstyled rendering, attribute theming in both stylesheet orders and on `<html>`, nested themes and densities, `auto`, and subtree overrides. Each component's own tests repeat the unstyled check.
- `test/browser/reflow.test.ts`: 187, 256, 375, and 512px across the gallery.
- Each component's non-color test forces every status color to one value and requires its states to stay different.
- The visual matrix, including the `chromium-forced` project ([testing.md §6](testing.md)).
- `test/browser/production-surface.test.ts`: every text node and glyph of the readouts resolves to `panel-inset` or a status lens.

## Gaps

- **The surface rule is tested for two components.** The placement rules of §4.2 are what make the token gate sufficient, but only the production stat and connection row have a test that resolves the real background behind every text node and glyph. Closing it: generalize `production-surface.test.ts` to the whole gallery, with each text node's allowed surfaces derived from its color token (muted text not on `panel-raised`, status fills only on `panel-inset`).
