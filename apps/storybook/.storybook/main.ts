import type { StorybookConfig } from '@storybook/web-components-vite';
import { defaultClientConditions, mergeConfig } from 'vite';

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  addons: ['@storybook/addon-docs'],
  stories: ['../src/stories/**/*.stories.ts', '../src/stories/**/*.mdx'],
  core: { disableTelemetry: true },
  // The workbench imports the package through its exports map, so it needs the build in dist/.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      // The `development` condition turns on the library's dev warnings (specs/package-contract.md §6).
      resolve: { conditions: ['development', ...defaultClientConditions] },
    }),
};

export default config;
