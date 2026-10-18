# @dieselpunk/core

Industrial game-style Web Components, built with [Lit](https://lit.dev): dense, tactile controls for inventory, crafting, logistics, and production screens, and for the rest of an application, from forms and navigation to tables and dialogs. They need no framework and no global setup.

![An assembling machine panel built from Dieselpunk components](https://raw.githubusercontent.com/abraham/dieselpunk/main/screenshot.png)

Documentation, every component, and live examples: **[dieselpunk.dev](https://dieselpunk.dev)**

## Install

```sh
npm install @dieselpunk/core
```

## Use

Each component has a class entry, which has no side effects, and a `register.js` entry, which defines the element. Import only the elements a page uses:

```js
import '@dieselpunk/core/tokens.css';
import '@dieselpunk/core/themes.css';
import '@dieselpunk/core/panel/register.js';
import '@dieselpunk/core/button/register.js';
```

```html
<punk-panel>
  <span slot="header">Assembler</span>
  <punk-button variant="primary">Start</punk-button>
</punk-panel>
```

The stylesheets are optional: without them every component renders in the default dark, compact look. To load the package in a browser with no build step, use an import map, as the [Integration guide](https://dieselpunk.dev/?path=/docs/guides-integration--docs) shows.

## Theme and density

Set `data-punk-theme` and `data-punk-density` on `<html>` or on any element; they apply to everything inside it.

```html
<html data-punk-theme="light" data-punk-density="low"></html>
```

Themes are `dark` (the default), `light`, `high-contrast`, `reduced-texture`, and `auto`, which follows the system color scheme. Densities are `compact` (the default) and `low`.

## TypeScript

Types ship with the package. Import classes and types from the package root or a component entry; importing a class never registers its element.

```ts
import type { PunkButton } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
```

`custom-elements.json` describes every element for editors and framework tooling.

## More

- **Forms:** the form controls are form-associated: they submit under their `name`, reset, and validate like native controls.
- **Accessibility:** native elements where they fit, WAI-ARIA keyboard patterns, and visible focus, in every theme and under forced colors.
- **Translations:** the components' few built-in words use Lit Localize. [`@dieselpunk/locales`](https://www.npmjs.com/package/@dieselpunk/locales) has German, French, Spanish, Japanese, and Arabic.
- **Frameworks:** guides for React, Vue, and Svelte are on [dieselpunk.dev](https://dieselpunk.dev).

## License

[MIT](LICENSE)
