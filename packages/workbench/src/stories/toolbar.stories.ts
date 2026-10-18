import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkToolbar } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/divider/register.js';
import '@dieselpunk/core/icon-button/register.js';
import '@dieselpunk/core/toolbar/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkToolbar>('punk-toolbar');

const meta = preview.type<{ args: StoryArgs<PunkToolbar> }>().meta({
  title: 'Components/Toolbar',
  tags: ['navigation'],
  component: 'punk-toolbar',
  args: {
    ...args,
    'aria-label': 'Machine tools',
    'default-slot':
      '<punk-button>Start</punk-button><punk-button>Pause</punk-button><punk-divider orientation="vertical"></punk-divider><punk-button variant="danger">Stop</punk-button>',
  },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 480px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A strip of actions with one tab stop. Give it an \`aria-label\`.

**Items:** direct children that are a \`punk-button\`, \`punk-icon-button\`, \`punk-checkbox\`, \`punk-switch\`, \`button\`, or \`a[href]\`, or that have \`data-punk-toolbar-item\`. A \`punk-divider\`, \`hr\`, or \`role="separator"\` is skipped. A select, text field, number field, or slider uses the arrow keys itself, so it is its own tab stop outside the group.

**Keyboard:** Tab enters at the item that last had focus, else the first. Left and Right (swapped in right-to-left languages), Home, and End move among the items without wrapping, and skip separators and disabled items. A second Tab leaves the toolbar.

**Overflow:** when the items do not fit, the trailing ones get \`data-punk-overflow\` and are hidden, the \`overflow\` slot is shown, and \`punk-overflow-change\` reports \`{ hidden }\` so the application can fill a menu of its own. The toolbar builds no menu. Without \`overflow\` content nothing is hidden and the toolbar scrolls inside itself, with a warning in development builds. The toolbar measures when it is resized and when its children change, not when their content does. Toolbars are an accepted exception to reflow (WCAG 1.4.10).

**Wrap:** \`wrap\` lets the strip grow taller instead, and creates no observer.
`,
      },
    },
  },
});

export const Playground = meta.story();

const actions = html`
  <punk-button>Start</punk-button>
  <punk-button>Pause</punk-button>
  <punk-divider orientation="vertical"></punk-divider>
  <punk-icon-button label="Settings">${icon('check')}</punk-icon-button>
  <punk-button variant="danger">Stop</punk-button>
`;

const toolbars = () => html`
  <div class="wb-stack">
    ${group('Default', html`<punk-toolbar aria-label="Machine tools">${actions}</punk-toolbar>`)}
    ${group(
      'Overflow: the trailing items hide, and the application fills the slot',
      html`<div style="max-inline-size: 180px">
        <punk-toolbar aria-label="Machine tools">
          ${actions}
          <punk-icon-button slot="overflow" label="More">${icon('check')}</punk-icon-button>
        </punk-toolbar>
      </div>`,
    )}
    ${group(
      'Wrap',
      html`<div style="max-inline-size: 200px">
        <punk-toolbar aria-label="Machine tools" wrap>${actions}</punk-toolbar>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${toolbars()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(toolbars),
});
