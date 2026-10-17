import type { StorybookConfig } from '@storybook/web-components-vite';
import remarkGfm from 'remark-gfm';
import { defaultClientConditions, mergeConfig } from 'vite';

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  addons: [
    {
      name: '@storybook/addon-docs',
      // MDX 2+ has no tables without GitHub-flavored Markdown.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
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
};

export default config;
