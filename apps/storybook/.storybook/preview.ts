import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@dieselpunk/core/tokens.css';
import '@dieselpunk/core/themes.css';
import '../src/styles/workbench.css';
import { setCustomElementsManifest } from '@storybook/web-components-vite';
import type { Preview } from '@storybook/web-components-vite';
import { setStorybookHelpersConfig } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import manifest from '@dieselpunk/core/custom-elements.json' with { type: 'json' };
import { densities, themes } from '../src/lib/options.ts';

setCustomElementsManifest(manifest as Parameters<typeof setCustomElementsManifest>[0]);
setStorybookHelpersConfig({ hideArgRef: true });

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'industrial', density: 'compact' },
  globalTypes: {
    theme: {
      description: 'Theme (data-punk-theme)',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: themes.map(({ value, title }) => ({ value, title })),
      },
    },
    density: {
      description: 'Density (data-punk-density)',
      toolbar: {
        title: 'Density',
        icon: 'component',
        dynamicTitle: true,
        items: densities.map(({ value, title }) => ({ value, title })),
      },
    },
  },
  decorators: [
    // Attributes on the stage, not <html>, so each story is themed independently and the
    // Storybook docs chrome around it keeps its own look. Both attributes combine.
    (story, context) => html`
      <div
        class="wb-stage"
        data-punk-theme=${String(context.globals['theme'])}
        data-punk-density=${String(context.globals['density'])}
      >
        ${story()}
      </div>
    `,
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    backgrounds: { disabled: true },
    options: {
      storySort: {
        order: [
          'Overview',
          'Foundations',
          ['Colors', 'Scales', 'Surfaces', 'Machine panel', 'Asset policy'],
          'Components',
          [
            'Panel',
            'Divider',
            'Button',
            'Icon Button',
            'Progress Bar',
            'Tooltip',
            'Slot',
            'Item Stack',
            'Slot Grid',
            'Recipe',
            'Meter',
            'Status Light',
            'Stack',
            'Cluster',
            'Accordion',
            'Tabs',
            'Toolbar',
            'Window',
            'Dialog',
            'Popover',
            'Toast',
            'Checkbox',
            'Switch',
            'Slider',
            'Text field',
            'Number field',
            'Select',
          ],
          'Guides',
          [
            'Integration',
            'React',
            'Vue',
            'Svelte',
            'Forms',
            'Focus and overlays',
            'Responsive layouts',
            'Accessibility and layout',
          ],
        ],
      },
    },
  },
};

export default preview;
