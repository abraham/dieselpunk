import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkTabs } from '@dieselpunk/core';
import '@dieselpunk/core/tabs/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkTabs>('punk-tabs');

const meta = preview.type<{ args: StoryArgs<PunkTabs> }>().meta({
  title: 'Components/Tabs',
  tags: ['navigation'],
  component: 'punk-tabs',
  subcomponents: { 'punk-tab': 'punk-tab' },
  args: {
    ...args,
    'aria-label': 'Machine',
    'tab-slot':
      '<punk-tab slot="tab" panel="pg-inputs">Inputs</punk-tab><punk-tab slot="tab" panel="pg-outputs">Outputs</punk-tab><punk-tab slot="tab" panel="pg-locked" disabled>Locked</punk-tab>',
    'default-slot':
      '<div id="pg-inputs"><p>Iron plates and lubricant.</p></div><div id="pg-outputs"><p>Precision gears.</p></div><div id="pg-locked"><p>Locked.</p></div>',
  },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 480px">${template(storyArgs)}</div>`,
  parameters: {
    githubLink: { auto: true },
    docs: {
      description: {
        component: `
A list of tabs that show one panel at a time. The tab pair is registered together by \`@dieselpunk/core/tabs/register.js\`. Give \`punk-tabs\` an \`aria-label\`.

**Panels:** a \`punk-tab\` names its panel by \`id\` in \`panel\`. The panel can be inside the tabs, or anywhere else in the same tree (beside them, as long as it is in the same document or shadow root). The tabs own the panels' \`role="tabpanel"\`, \`aria-labelledby\`, and \`hidden\`, and put \`tabindex="0"\` on a panel with nothing to Tab to. They give back what they wrote when a tab is removed or the tabs leave the page. A panel is hidden with the \`hidden\` attribute, which a \`display\` rule of your own on the panel overrides, so put layout on an element inside the panel.

**Selection:** the first enabled tab is selected unless one has \`selected\`. \`value\` is the selected tab's \`panel\`. \`punk-tab-change\` with \`{ value, tab, panel }\` is sent when the user selects a tab, and not when the application sets \`value\` or \`selected\`.

**Activation:** with \`auto\` the arrow keys select the tab they reach. With \`manual\` they only move focus, and Enter or Space selects.

**Keyboard:** one tab is the tab stop. Left and Right move between tabs (swapped in right-to-left languages), and Up and Down for \`orientation="vertical"\`. Home and End go to the first and last enabled tab. Nothing wraps, and disabled tabs are skipped. Tab from a tab goes to its panel when the panel has something to reach or a \`tabindex\`, otherwise past the tabs.

**Layout:** the list wraps onto more rows and never scrolls sideways. The selected tab is pressed in and has a bar on the edge that faces the panel, so it differs from the rest by shape as well as surface.
`,
      },
    },
  },
});

export const Playground = meta.story();

const tabs = () => html`
  <div class="wb-stack">
    ${group(
      'Automatic activation, panels inside',
      html`<punk-tabs aria-label="Machine">
        <punk-tab slot="tab" panel="st-a1">Inputs</punk-tab>
        <punk-tab slot="tab" panel="st-a2">Outputs</punk-tab>
        <punk-tab slot="tab" panel="st-a3" disabled>Locked</punk-tab>
        <div id="st-a1"><p>Iron plates and lubricant.</p></div>
        <div id="st-a2"><p>Precision gears.</p></div>
        <div id="st-a3"><p>Locked.</p></div>
      </punk-tabs>`,
    )}
    ${group(
      'Vertical',
      html`<punk-tabs aria-label="Machine" orientation="vertical">
        <punk-tab slot="tab" panel="st-b1">Inputs</punk-tab>
        <punk-tab slot="tab" panel="st-b2">Outputs</punk-tab>
        <div id="st-b1"><p>Iron plates and lubricant.</p></div>
        <div id="st-b2"><p>Precision gears.</p></div>
      </punk-tabs>`,
    )}
    ${group(
      'Manual activation, an icon, and the panels beside the tabs',
      html`<div class="wb-stack">
        <punk-tabs aria-label="Machine" activation="manual">
          <punk-tab slot="tab" panel="st-c1">
            <span slot="icon" aria-hidden="true">${icon('check')}</span>Inputs
          </punk-tab>
          <punk-tab slot="tab" panel="st-c2">Outputs</punk-tab>
        </punk-tabs>
        <div id="st-c1"><p>Panels can be anywhere in the same tree.</p></div>
        <div id="st-c2"><p>Precision gears.</p></div>
      </div>`,
    )}
    ${group(
      'Long labels wrap',
      html`<div style="max-inline-size: 200px">
        <punk-tabs aria-label="Machine">
          <punk-tab slot="tab" panel="st-d1">Eingangsmaterialien und Zwischenprodukte</punk-tab>
          <punk-tab slot="tab" panel="st-d2">Ausgangsprodukte</punk-tab>
          <div id="st-d1"><p>Text.</p></div>
          <div id="st-d2"><p>Text.</p></div>
        </punk-tabs>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${tabs()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(tabs),
});
