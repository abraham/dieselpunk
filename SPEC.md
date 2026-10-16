# Industrial UI Component Library Specification

**Status:** Draft 1
**Target:** Web applications and browser-based games
**Implementation:** TypeScript 6, ESNext, Lit 3, Web Components
**Package name:** `@dieselpunk/core`
**Element prefix:** `punk-`

## 1. Product Summary

Industrial UI is a framework-agnostic Web Component library for building dense, tactile, factory-management interfaces. Its visual language should evoke the practical machinery, inventory screens, production controls, and beveled metal surfaces familiar from Factorio without redistributing or tracing Factorio's copyrighted artwork, textures, icons, sounds, fonts, or source code.

The library must feel:

- mechanical rather than futuristic;
- dense, legible, and optimized for repeated use;
- tactile, with visibly raised, inset, pressed, selected, and disabled states;
- warm and worn, using charcoal metal, muted brass, safety yellow, and signal orange;
- suitable for mouse, keyboard, touch, and game-style interfaces.

## 2. Goals

1. Provide reusable Lit-based components for inventory, crafting, logistics, production, research, and settings interfaces.
2. Preserve the native behavior, accessibility, and composability expected from modern Web Components.
3. Allow applications to reproduce a convincing industrial game UI using only CSS custom properties and original application assets.
4. Support plain HTML as a first-class integration target, with optional typed imports for TypeScript applications.
5. Keep the base package small, tree-shakeable, and free of framework runtime dependencies other than Lit and its first-party localization library, `@lit/localize`.

## 3. Non-Goals

- Recreating Factorio screens pixel-for-pixel.
- Shipping extracted game assets or using the Factorio logo, item art, typeface, sound effects, or proprietary names.
- Providing game simulation, inventory rules, recipe calculation, drag-and-drop business logic, or persistence.
- Replacing a general-purpose application design system outside industrial or game-like interfaces.
- Rendering game-world graphics, maps, or sprites.

## 4. Design Principles

### 4.1 Dense but Ordered

The default density uses compact spacing, strong alignment, and predictable sizing. An optional low-density mode increases spacing and target sizes for touch use, accessibility, or less information-heavy screens without changing component behavior. Inventory grids and toolbars must remain visually stable as values change. Large empty marketing-style layouts are out of scope.

### 4.2 Tactile State

Interactive surfaces communicate state through depth as well as color:

- idle controls appear raised;
- hover increases edge contrast;
- pressed controls move inward by 1px and become inset;
- selected controls use a warm orange outline and darker inset surface;
- disabled controls flatten, desaturate, and retain readable labels;
- focus uses a high-contrast two-tone ring that is drawn on `:focus-visible`, and a control never loses its focus indication without an equivalent replacement.

### 4.3 Original Industrial Materials

Surfaces may use procedural CSS noise, repeating patterns, bevels, seams, rivets, and grime-like variation. Any bundled texture, icon, or sound must be original and documented as such. The library must not contain assets extracted, traced, modified, or derived from Factorio game files. Consumers provide their own item and recipe imagery through slots or URLs and are responsible for the rights to those assets.

### 4.4 Information Before Decoration

Counts, progress, warnings, labels, and selection state must remain readable at a glance. Texture cannot reduce text contrast or obscure icons.

## 5. Technical Foundation

### 5.1 Runtime

- TypeScript 6.0 with strict mode enabled, targeting ESNext. Version 6 is required for compatibility with `typescript-eslint`.
- Node.js 26 for development tooling. Repository scripts are written in TypeScript and run directly by Node without a separate compile step.
- Lit 3 and `LitElement` for rendering and lifecycle management.
- `@lit/localize`, in runtime mode, for the words components render themselves (§13).
- Native Shadow DOM by default.
- ES modules (ESNext output) with per-component exports. Emitted code is not downleveled, so source may use only syntax and APIs available in the browser baseline below.
- No global stylesheet requirement.
- Browser baseline: current and previous major versions of Chrome, Edge, Firefox, and Safari.

### 5.2 Package Layout

```text
packages/core/
  src/
    components/
    directives/
    styles/
    tokens/
    utilities/
    index.ts
  test/
  package.json
  tsconfig.json
apps/storybook/
```

Each public component receives its own module and registration module:

```ts
import { PunkButton } from '@dieselpunk/core/button';
import '@dieselpunk/core/button/register.js';
```

The class export must not register a custom element as a side effect. The `register.js` entry point may safely define it after checking `customElements.get()`.

### 5.3 Public API Rules

- Properties use camelCase; attributes use kebab-case.
- Boolean attributes follow native HTML presence semantics.
- Components dispatch composed, bubbling `CustomEvent` instances for user actions.
- Event names use the `punk-` prefix, except where a native event such as `input` or `change` accurately represents the interaction.
- All visual customization is exposed through documented CSS custom properties and `::part()` names.
- Application data is passed as properties; rich visual content is passed through slots.
- Components do not mutate arrays or objects supplied by consumers.
- Public classes, properties, methods, events, slots, CSS properties, and parts are documented in a generated Custom Elements Manifest.

## 6. Visual System

### 6.1 Typography

Use a bundled or consumer-provided open-licensed square grotesque or humanist sans font. The default fallback stack must remain broadly available:

```css
--punk-font-family: "Chakra Petch", "Trebuchet MS", sans-serif;
--punk-font-mono: "IBM Plex Mono", "Courier New", monospace;
```

Text must use `letter-spacing: 0`. Labels use medium or semibold weight rather than all-caps tracking. Numeric counters use tabular numerals.

### 6.2 Core Tokens

```css
:root {
  --punk-color-canvas: #1d1e1c;
  --punk-color-panel: #41433f;
  --punk-color-panel-raised: #565954;
  --punk-color-panel-inset: #292b28;
  --punk-color-edge-light: #747870;
  --punk-color-edge-dark: #171815;
  --punk-color-control-edge: #b8b5ac;
  --punk-color-text: #f0ead8;
  --punk-color-text-muted: #b8b4a7;
  --punk-color-accent: #f59b23;
  --punk-color-accent-strong: #ffb52e;
  --punk-color-warning: #f2cf44;
  --punk-color-danger: #d9573f;
  --punk-color-success: #7fa84f;
  --punk-color-info: #65a9c2;

  --punk-space-1: 4px;
  --punk-space-2: 8px;
  --punk-space-3: 12px;
  --punk-space-4: 16px;
  --punk-space-5: 24px;

  --punk-density-scale: 1;

  --punk-control-height-sm: 28px;
  --punk-control-height-md: 36px;
  --punk-control-height-lg: 44px;
  --punk-slot-size: 40px;
  --punk-border-width: 2px;
  --punk-radius: 2px;
  --punk-color-focus: #f2cf44;
  --punk-color-focus-inner: #1d1e1c;
  --punk-duration-fast: 80ms;
  --punk-duration-normal: 140ms;
}
```

Themes override semantic tokens rather than component internals. The initial release includes `industrial` dark, `industrial-light`, `high-contrast`, and `reduced-texture` themes. The light theme retains the warm metal, bevel, and safety-color visual language while using light gray canvas and panel surfaces with dark text. It must meet the same contrast requirements as the default dark theme and may be selected explicitly or activated from `prefers-color-scheme: light` when the consumer enables automatic color-scheme selection.

Density is independent from color theme. The initial release includes `compact` and `low` density modes. `compact` is the default. `low` density increases control heights, internal padding, layout gaps, and slot size by approximately 20-25% while preserving information hierarchy and stable layout. Consumers apply density to the document or any subtree through `data-punk-density="low"`; components inherit the resulting density tokens. Individual components may override inherited density through a documented `density: 'compact' | 'low'` property where a local exception is useful.

### 6.3 Surface Recipe

Raised controls use a light top/left edge, dark bottom/right edge, and a subtle vertical surface variation. Inset areas reverse those edges. Corners remain nearly square, with a maximum radius of 4px. Components must not use glass effects, neon glow, pill shapes, or large soft shadows.

### 6.4 Icons

- Use original SVG icons on a 20x20 or 24x24 grid.
- Prefer bold geometric silhouettes that remain recognizable at 16px.
- Decorative SVG is not used as a substitute for product or item art.
- Icon-only controls require an accessible name and tooltip.

### 6.5 Motion and Sound

Motion is short and functional: button depression, progress updates, panel appearance, slot selection, and warning pulses. All animation must respect `prefers-reduced-motion`.

Sound is an optional adapter package, disabled by default. No sound file is included in core. Consumers may map interaction events to licensed audio assets.

## 7. Component Inventory

### 7.1 Layout and Surfaces

#### `<punk-panel>`

A structural metal surface.

- Properties: `variant: 'raised' | 'inset' | 'flat'`, `density: 'compact' | 'low'`.
- Slots: default, `header`, `footer`.
- Parts: `surface`, `header`, `body`, `footer`.
- The component must not impose a fixed width or height.

#### `<punk-window>`

A titled application or game window, optionally movable and dismissible.

- Properties: `heading`, `open` (default `false`, as for `<dialog>`), `modal`, `movable`, `dismissible`.
- Events: `punk-open`, `punk-close`, `punk-move-start`, `punk-move-end`.
- Slots: `icon`, default, `footer`.
- Parts: `window`, `titlebar`, `title`, `move-button` (while `movable`), `close-button`, `body`, `footer`.
- Modal behavior uses the native `<dialog>` element internally where supported.
- Dragging is opt-in and constrained to the viewport; dragging never starts from interactive titlebar descendants.
- A movable window has a move button as the single-pointer alternative to dragging (WCAG 2.2 SC 2.5.7). It starts move mode: the arrow keys move the window by 8px (32px with Shift), a click places the center of the titlebar, Enter confirms, and Escape cancels.

#### `<punk-divider>`

A horizontal or vertical etched separator with optional centered label.

#### `<punk-stack>` and `<punk-cluster>`

Minimal layout primitives for consistent vertical and wrapping horizontal spacing. These components expose no industrial decoration.

### 7.2 Actions and Inputs

#### `<punk-button>`

- Properties: `variant: 'default' | 'primary' | 'danger'`, `size`, `disabled`, `loading`, `type`.
- Slots: default, `icon-start`, `icon-end`.
- Events: native `click` only.
- A loading button preserves its width and accessible name.

#### `<punk-icon-button>`

A square button for one icon. It requires `label`; `label` supplies the accessible name and default tooltip.

#### `<punk-checkbox>` and `<punk-switch>`

Form-associated custom elements with `checked`, `indeterminate`, `disabled`, `name`, and `value`. They support form reset and constraint validation where applicable.

#### `<punk-slider>`

A rugged range input with optional tick marks and numeric readout.

- Properties: `min`, `max`, `step`, `value`, `disabled`, `showValue`.
- Events: native `input` and `change`.
- Keyboard behavior matches `<input type="range">`.

#### `<punk-select>`

A compact single-select control using a native `<select>` internally in version 1. A custom searchable combobox is deferred until its accessibility behavior is independently specified and tested.

#### `<punk-text-field>` and `<punk-number-field>`

Inset fields with optional prefix, suffix, validation message, and stepper controls. They are form-associated and preserve native text-editing behavior.

### 7.3 Navigation and Disclosure

#### `<punk-tabs>` and `<punk-tab>`

- Orientation: horizontal or vertical.
- Activation: automatic by default; manual activation is configurable.
- Implements the WAI-ARIA Tabs keyboard pattern.
- A tab names its panel by id in `panel`, resolved in the tab's root node, so a panel can be inside `<punk-tabs>` or beside it. The tab list wraps and never scrolls sideways.
- The active tab uses an inset orange-accented state.

#### `<punk-toolbar>`

A fixed-height action strip supporting roving tabindex, separators, keyboard navigation, and slotted controls. A select, text field, number field, and slider keep their own tab stop, since they use the arrow keys themselves. An `overflow` slot takes the consumer's trigger: items that do not fit are marked `data-punk-overflow` and hidden, and `punk-overflow-change` reports them so the consumer can fill its menu. The toolbar builds no menu. Without an `overflow` slot nothing is hidden and the toolbar scrolls inside itself.

#### `<punk-accordion>`

An etched disclosure group for settings and recipe categories. Uses native button semantics and supports single or multiple expanded sections.

### 7.4 Inventory and Production

#### `<punk-slot>`

The foundational square receptacle for items, recipes, tools, and equipment.

- Properties: `selected`, `disabled`, `highlighted`, `invalid`, `size`, `label`, `value`.
- Slots: default image/content, `badge`, `overlay`.
- Parts: `slot`, `content`, `badge`, `overlay`.
- Supports click, Enter, and Space activation.
- Does not implement drag-and-drop; consumers compose that behavior using pointer and drag events.

#### `<punk-item-stack>`

Displays item artwork, count, durability, and quality in the same receptacle as `<punk-slot>`. It shares the slot's base instead of nesting a slot, so a grid never holds an option inside an option.

- Properties: `name`, `count`, `capacity`, `durability`, `quality`, `selected`, `disabled`.
- Slots: `icon`.
- The count is abbreviated only when explicitly requested with `compact-count`.
- Accessible text includes the complete item name and unabridged quantity.

#### `<punk-slot-grid>`

A responsive, keyboard-navigable grid of slotted `<punk-slot>` or `<punk-item-stack>` children.

- Properties: `columns`, `selection: 'none' | 'single' | 'multiple'`, `disabled`, `values`. Its items identify themselves with a `value`.
- Events: `punk-selection-change` (`{ values, items }`), `punk-activate`.
- Uses CSS Grid with stable `--punk-slot-size` tracks.
- With `selection` of `none` it is a `group` of buttons; with `single` or `multiple` it is a `listbox` of `option` items (not `role="grid"`, since a wrapping layout has no rows and cells). Focus is a roving `tabindex`, one tab stop, and moving it never changes the selection.
- Arrow keys move in reading order and by row; Home/End move to row boundaries, and Ctrl+Home/Ctrl+End to the first and last item.

#### `<punk-recipe>`

A selectable recipe tile with icon, title, craft duration, availability, and ingredient status.

- Properties: `name`, `duration`, `available`, `selected`, `craftableCount`.
- Slots: `icon`, `ingredients`, `products`.
- Events: `punk-activate`.

#### `<punk-progress-bar>`

Displays determinate or indeterminate production, research, or transfer progress.

- Properties: `value`, `max`, `variant: 'default' | 'success' | 'warning' | 'danger'`, `label`, `showValue`.
- Uses the ARIA `progressbar` role with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`, which is omitted when indeterminate. It renders custom markup instead of the native `<progress>` element, whose styling is inconsistent across engines.
- Value animation is visual only; accessibility values update immediately.

#### `<punk-meter>`

A segmented horizontal or vertical meter for power, fluid, heat, durability, or capacity. Thresholds control semantic color changes.

#### `<punk-status-light>`

A compact status indicator with icon and text. Color is never the only indication of status.

#### `<punk-production-stat>`

A compact metric containing label, value, trend, unit, and optional sparkline slot. Numeric width remains stable with tabular figures.

#### `<punk-connection-row>`

Represents a logistics or circuit connection with source, direction, destination, status, and a removable action. Applications provide node icons and labels.

### 7.5 Feedback and Overlays

#### `<punk-tooltip>`

- Opens after a configurable pointer delay and immediately on keyboard focus.
- Supports rich content but never contains interactive controls.
- Repositions to remain inside the viewport.
- Dismisses on Escape and when its anchor loses hover and focus.

#### `<punk-popover>`

An interactive anchored surface built on the Popover API with a positioning fallback. Focus behavior depends on whether the content is informational or menu-like.

#### `<punk-dialog>`

A modal confirmation or task surface based on native `<dialog>`. It traps focus while open, restores focus on close, closes on Escape unless marked `persistent`, and labels itself from `heading`.

#### `<punk-toast-stack>` and `<punk-toast>`

Transient system feedback with `info`, `success`, `warning`, and `danger` variants. Every toast has a dismiss button. A toast pauses its dismissal timer while hovered, focused, or while the document is hidden. The default is 5000ms for `info` and `success`, and no timeout for `warning`, `danger`, or a toast with an action. The stack keeps two persistent live regions, `role="status"` for `info` and `success` and `role="alert"` for `warning` and `danger`, and puts each toast in the matching one.

## 8. Representative Markup

```html
<punk-window heading="Assembler 03" open dismissible>
  <punk-tabs aria-label="Machine details">
    <punk-tab slot="tab" panel="production">Production</punk-tab>
    <punk-tab slot="tab" panel="modules">Modules</punk-tab>
  </punk-tabs>

  <section id="production">
    <punk-recipe name="Precision gear" duration="0.5" available selected>
      <img slot="icon" src="/items/precision-gear.webp" alt="" />
      <span slot="ingredients">2 iron plates</span>
    </punk-recipe>

    <punk-progress-bar
      label="Crafting precision gear"
      value="64"
      max="100"
      show-value
    ></punk-progress-bar>

    <punk-slot-grid columns="4" selection="single" aria-label="Module slots">
      <punk-item-stack name="Speed module" count="2">
        <img slot="icon" src="/items/speed-module.webp" alt="" />
      </punk-item-stack>
      <punk-slot label="Empty module slot"></punk-slot>
    </punk-slot-grid>
  </section>
</punk-window>
```

## 9. Interaction Model

### 9.1 Keyboard

- Tab moves between component groups and standalone controls.
- Arrow keys navigate composite widgets such as tabs, toolbars, menus, and slot grids.
- Enter activates the focused action.
- Space activates buttons and selectable slots without scrolling the page.
- Escape closes the topmost dismissible overlay.
- Keyboard focus is always visible.

### 9.2 Pointer and Touch

- Minimum touch target: 40x40 CSS pixels for primary controls and slots. Under a coarse pointer, a control shorter than 40px, such as a 36px compact `md` button, extends its hit area to 40px without changing how it looks.
- Hover may reveal supplemental information but never required actions.
- Pointer capture is used for slider and optional window-drag interactions.
- Destructive actions require explicit labels and confirmation when not easily reversible.

### 9.3 Selection

Selection and focus are separate states. A focused slot may be unselected, and a selected slot remains visibly selected after focus moves away. Selection-change events include the selected elements or stable consumer-provided values.

## 10. Accessibility Requirements

The release target is WCAG 2.2 AA.

- Normal text contrast is at least 4.5:1; large text and non-text controls are at least 3:1.
- A control with no visible text or icon of its own, such as an empty slot, has a boundary of at least 3:1 (`--punk-color-control-edge`). A control identified by its label or icon needs no boundary, and inactive controls are exempt (WCAG 2.2 SC 1.4.11).
- Texture and bevel effects degrade cleanly in forced-colors mode.
- Every control is operable by keyboard and assistive technology.
- Components use native elements internally whenever their semantics fit.
- Shadow DOM accessibility relationships are tested across supported browsers.
- Status, warning, and selection states never rely on color alone.
- Animation respects `prefers-reduced-motion`; texture can be reduced with a theme.
- Components remain functional at 200% zoom and with text spacing overrides.
- Tooltips supplement, but never replace, persistent labels for unfamiliar controls.

## 11. Responsive Behavior

- Components respond to their container rather than assuming viewport width.
- Windows use `max-inline-size: min(100%, var(--punk-window-max-width))`.
- Toolbars may wrap only when explicitly configured; otherwise they overflow into a menu supplied by the consumer.
- Slot grids preserve square cells and reduce column count before reducing slot size.
- At narrow widths, window footers stack actions and settings rows place labels above controls.
- No component uses viewport-width-based font sizing.

## 12. Theming and Customization

Consumers may theme at three levels:

1. Global semantic custom properties on `:root` or a theme container.
2. Component-level custom properties such as `--punk-slot-size`.
3. Documented shadow parts for advanced styling.

Components must not expose internal class names as a supported API. Themes are inherited through nested shadow roots using CSS custom properties.

Color theme and density are orthogonal. A consumer can combine any color theme, including `industrial-light`, with either `compact` or `low` density. Applying either option to a subtree must not require components to be recreated.

Example:

```css
.factory-console {
  --punk-color-accent: #e8c547;
  --punk-color-panel: #384348;
  --punk-slot-size: 44px;
  --punk-font-family: "Chakra Petch", sans-serif;
}
```

## 13. Internationalization

- Components do not hard-code user-facing strings except optional defaults that can be overridden.
- Labels support arbitrary text direction and use logical CSS properties.
- Counts and percentages use `Intl.NumberFormat` when formatted by the component.
- Components write the words they render with Lit Localize's `msg()`, in English, each with an id and a description. The English text is the source locale and ships with the components; translations are XLIFF files, built into locale modules in `@dieselpunk/locales`, and an application switches locale with `setLocale()`. Mounted components re-render when the locale is ready.
- Layout is tested with long German labels, Arabic RTL content, and large compact-number values.

## 14. Quality and Testing

### 14.1 Automated Tests

- Unit and DOM tests: Web Test Runner or Vitest browser mode.
- Accessibility checks: Axe for every interactive component fixture.
- Interaction tests: keyboard, focus restoration, form participation, and composed event behavior.
- Visual regression tests: Playwright screenshots in Chromium, Firefox, and WebKit.
- Type tests: public exports, event typings, and property types.
- Custom Elements Manifest validation in CI.

### 14.2 Visual Test Matrix

Every component is captured in:

- idle, hover, focus-visible, active, selected, disabled, and invalid states as applicable;
- industrial dark, industrial light, high-contrast, and reduced-texture themes;
- compact and low density, including industrial light combined with low density;
- desktop and 375px-wide mobile containers;
- 100% and 200% zoom;
- light DOM content with short, long, and missing optional labels.

### 14.3 Performance Budgets

- Core shared runtime and tokens: no more than 12 kB minified and compressed, excluding Lit.
- Individual leaf component: no more than 5 kB minified and compressed unless documented.
- A 100-slot grid must maintain responsive keyboard navigation and scrolling on a mid-range mobile device.
- Components avoid continuous animation, layout polling, and document-wide observers.

## 15. Documentation Site

The documentation app must function as a workbench rather than a marketing landing page. It includes:

- searchable component navigation;
- live examples and editable source;
- API tables generated from the Custom Elements Manifest;
- state and theme matrices;
- keyboard instructions alongside interactive examples;
- framework integration examples for plain HTML, React, Vue, and Svelte;
- an asset policy page explaining how to provide original item icons and textures.

The first screen opens directly to the component workbench with the inventory components visible: the Inventory overview. (Phase 1 opened on a Foundations overview, which remains as a story.)

## 16. Versioning and Compatibility

- Semantic Versioning applies to JavaScript APIs, tag names, slots, events, CSS custom properties, and shadow parts.
- Removing or renaming a documented part is a breaking change.
- Experimental components use an `experimental/` export path and are excluded from stability guarantees.
- Deprecations remain available for at least one minor release and emit development-only warnings where practical.

## 17. Delivery Phases

### Phase 1: Foundation

Tokens, themes, shared surface styles, panel, button, icon button, divider, tooltip, progress bar, and documentation workbench.

### Phase 2: Inventory

Slot, item stack, slot grid, recipe, meter, status light, keyboard selection model, and visual regression coverage.

### Phase 3: Application Shell

Window, dialog, tabs, toolbar, accordion, stack, cluster, form controls, popover, toast, responsive layouts, and framework integration guides.

### Phase 4: Production Interfaces

Production stat, connection row, advanced examples, localization packs, optional interaction-sound adapter, and performance tuning.

## 18. Definition of Done for Version 1.0

Version 1.0 is ready when:

1. All non-experimental components in Sections 7.1 through 7.5 are implemented and documented.
2. Public APIs are represented in a valid Custom Elements Manifest.
3. Automated accessibility tests pass with no serious or critical Axe violations.
4. Keyboard behavior matches the specified WAI-ARIA patterns.
5. Visual regression coverage includes every required state and theme.
6. The package can be consumed from plain HTML and TypeScript without global setup.
7. Tree-shaken component imports do not register or bundle unused components.
8. The library contains no Factorio game files, extracted assets, trademarks presented as branding, or copied UI artwork.
9. The inventory workbench example is usable at desktop and mobile widths without overlap or clipped text.
10. Package size and slot-grid performance stay within the stated budgets.
11. Every stable component supports industrial light and low-density modes, including their combined use, without loss of functionality or accessibility.

## 19. Acceptance Scenario

A developer can install `@dieselpunk/core`, import the registration modules for window, slot grid, item stack, button, and progress bar, and build a responsive assembler interface using their own item art. The result presents a dense, tactile industrial control surface; supports mouse, touch, keyboard, and screen readers; can be recolored through tokens; and requires no React, Vue, or Svelte runtime.
