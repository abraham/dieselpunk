import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineMain } from '@storybook/web-components-vite/node';
import remarkGfm from 'remark-gfm';
import { defaultClientConditions, mergeConfig } from 'vite';

// npm may hoist `storybook` above packages nested in the workbench, so resolve them from here.
const resolvePackage = (name: string) =>
  dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));

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
  features: { sidebarOnboardingChecklist: false, menuOnboardingChecklist: false },
  // The workbench imports the package through its exports map, so it needs the build in dist/.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      // The `development` condition turns on the library's dev warnings (specs/package-contract.md §6).
      resolve: { conditions: ['development', ...defaultClientConditions] },
    }),
});
