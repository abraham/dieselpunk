import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMain } from '@storybook/web-components-vite/node';
import remarkGfm from 'remark-gfm';
import { defaultClientConditions, mergeConfig } from 'vite';

// npm may hoist `storybook` above packages nested in the workbench, so resolve them from here.
const resolvePackage = (name: string) =>
  dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));

const origin = 'https://dieselpunk.dev';
const description =
  'Industrial game-style Web Components, built with Lit: dense, tactile controls for inventory, crafting, logistics, and production screens.';

// Social cards need an absolute image URL; scripts/site.ts puts the image at the site root.
const socialMeta = `
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Dieselpunk" />
  <meta property="og:title" content="Dieselpunk" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${origin}/" />
  <meta property="og:image" content="${origin}/screenshot.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="An assembling machine panel built from Dieselpunk components" />
  <meta name="twitter:card" content="summary_large_image" />
`;

export default defineMain({
  framework: resolvePackage('@storybook/web-components-vite'),
  addons: [
    {
      name: resolvePackage('@storybook/addon-docs'),
      // MDX 2+ has no tables without GitHub-flavored Markdown.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    resolvePackage('@storybook/addon-a11y'),
    resolvePackage('@storybook/addon-vitest'),
  ],
  stories: ['../src/stories/**/*.stories.ts', '../src/stories/**/*.mdx'],
  core: { disableTelemetry: true },
  managerHead: (head) => `${head}${socialMeta}`,
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  // The workbench imports the package through its exports map, so it needs the build in dist/.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      // The `development` condition turns on the library's dev warnings (specs/package-contract.md §6).
      resolve: { conditions: ['development', ...defaultClientConditions] },
    }),
});
