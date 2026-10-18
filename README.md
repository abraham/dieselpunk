# Dieselpunk

Industrial game-style Web Components, built with [Lit](https://lit.dev). Dense, tactile controls for inventory, crafting, logistics, and production screens, and for the rest of an application: forms, navigation, data, and overlays. Every component works from plain HTML, is accessible to WCAG 2.2 AA, and comes in several themes and two densities.

Documentation and live examples: **[dieselpunk.dev](https://dieselpunk.dev)**

```js
// With a bundler such as Vite; for plain HTML with an import map, see the Integration guide.
import '@dieselpunk/core/tokens.css';
import '@dieselpunk/core/themes.css';
import '@dieselpunk/core/button/register.js';
```

```html
<punk-button variant="primary">Start production</punk-button>
```

## Packages

| Package                                    | Contents                                                   |
| ------------------------------------------ | ---------------------------------------------------------- |
| [`@dieselpunk/core`](packages/core)        | The components, design tokens, and themes                  |
| [`@dieselpunk/locales`](packages/locales)  | Translations of the components' messages, for Lit Localize |
| [`packages/workbench`](packages/workbench) | The Storybook published at dieselpunk.dev (private)        |
| [`packages/testing`](packages/testing)     | Shared test tooling (private)                              |

## Development

Requires Node 26 or later.

```sh
npm install
npm start          # build core and open the workbench
npm run build      # build every package
npm test           # run the test suites
```

How the library is meant to work is written down in [specs/](specs/README.md).

## License

[MIT](LICENSE)
