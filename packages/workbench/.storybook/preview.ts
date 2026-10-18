import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/500.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@dieselpunk/core/tokens.css';
import '@dieselpunk/core/themes.css';
import '../src/styles/workbench.css';
import addonA11y from '@storybook/addon-a11y';
import addonDocs from '@storybook/addon-docs';
import { definePreview, setCustomElementsManifest } from '@storybook/web-components-vite';
import { getStorybookHelpers, setStorybookHelpersConfig } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import manifest from '@dieselpunk/core/custom-elements.json' with { type: 'json' };
import { axeConfig } from '../src/lib/a11y.ts';
import { densities, themes } from '../src/lib/options.ts';

setCustomElementsManifest(manifest as Parameters<typeof setCustomElementsManifest>[0]);
setStorybookHelpersConfig({ hideArgRef: true });

// CSF Next's web-components preview leaves this out, and `subcomponents` tables need it. The
// docs parameter's type does not declare it.
const docs = { extractArgTypes: (tag: string) => getStorybookHelpers(tag).argTypes } as object;

export default definePreview({
  addons: [addonDocs(), addonA11y()],
  tags: ['autodocs'],
  initialGlobals: { theme: 'dark', density: 'compact' },
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
    backgrounds: { disable: true },
    docs,
    // specs/accessibility.md §13. The addon's default rules stop at WCAG 2.1.
    a11y: {
      test: 'error',
      options: {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
      config: axeConfig(),
    },
    options: {
      storySort: {
        order: [
          'Overview',
          'Examples',
          ['Production dashboard', 'Logistics network', 'Interface settings'],
          'Guides',
          [
            'Integration',
            'React',
            'Vue',
            'Svelte',
            'Forms',
            'Focus and overlays',
            'Responsive layouts',
            'Localization',
            'Performance',
            'Accessibility and layout',
            'Screen reader checklist',
          ],
          'Foundations',
          ['Colors', 'Scales', 'Surfaces', 'Machine panel', 'Asset policy'],
          'Components',
          [
            'Accordion',
            'Alert',
            'Badge',
            'Breadcrumb',
            'Button',
            'Checkbox',
            'Cluster',
            'Combobox',
            'Connection Row',
            'Date field',
            'Description list',
            'Dialog',
            'Divider',
            'Drawer',
            'Fieldset',
            'File field',
            'Icon Button',
            'Item Stack',
            'Kbd',
            'List',
            'Menu',
            'Menubar',
            'Meter',
            'Number field',
            'Pagination',
            'Panel',
            'Popover',
            'Production Stat',
            'Progress Bar',
            'Radio Group',
            'Range slider',
            'Recipe',
            'Select',
            'Slider',
            'Slot',
            'Slot Grid',
            'Spinner',
            'Splitter',
            'Stack',
            'Status Light',
            'Steps',
            'Switch',
            'Table',
            'Tabs',
            'Tag',
            'Text field',
            'Textarea',
            'Time field',
            'Toast',
            'Toggle Group',
            'Toolbar',
            'Tooltip',
            'Tree',
            'Window',
          ],
        ],
      },
    },
  },
});
