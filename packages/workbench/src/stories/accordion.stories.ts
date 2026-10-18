import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkAccordion } from '@dieselpunk/core';
import '@dieselpunk/core/accordion/register.js';
import { icon } from '../icons/icons.ts';
import { axeConfig, repeatedLandmarks } from '../lib/a11y.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkAccordion>('punk-accordion');

const meta = preview.type<{ args: StoryArgs<PunkAccordion> }>().meta({
  title: 'Components/Accordion',
  component: 'punk-accordion',
  subcomponents: { 'punk-accordion-item': 'punk-accordion-item' },
  args: {
    ...args,
    'default-slot':
      '<punk-accordion-item heading="Inputs" expanded><p>Iron plates and lubricant.</p></punk-accordion-item><punk-accordion-item heading="Outputs"><p>Precision gears.</p></punk-accordion-item><punk-accordion-item heading="Maintenance" disabled><p>Locked.</p></punk-accordion-item>',
  },
  argTypes,
  render: (storyArgs) => html`<div style="max-inline-size: 480px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A stack of collapsible sections. Each \`punk-accordion-item\` is a heading holding a button that expands or collapses a panel. The tag pair is registered together by \`@dieselpunk/core/accordion/register.js\`.

**Structure:** the item heading is \`role="heading"\` with an \`aria-level\` (\`level\`, 1 to 6, default 3; choose the level that fits the page outline). The button has \`aria-expanded\` and \`aria-controls\`, and the panel is a labeled \`region\`. State is shown by a plus or a minus as well as by color, so it survives forced colors.

**Single and multiple:** by default one item is open at a time, and expanding one collapses the others, whether the user or code does it. Set \`multiple\` to let several stay open. Several expanded items at connection with \`multiple\` off keep the first and warn once in development builds.

**Events:** \`punk-toggle\` with \`{ expanded }\` is sent when the user expands or collapses an item, and not when \`expanded\` is set from code.

**Keyboard:** every enabled heading is a tab stop. Enter and Space toggle the item. Down and Up move focus between headings, Home and End go to the first and last, and focus does not wrap. Disabled items are skipped. Arrows pressed inside panel content are left alone.

**Heading text:** use the \`heading\` attribute or the \`heading\` slot. An item with neither warns in development builds.
`,
      },
    },
  },
});

export const Playground = meta.story();

const items = () => html`
  <div class="wb-stack">
    ${group(
      'Single: one open at a time',
      html`<punk-accordion>
        <punk-accordion-item heading="Inputs" expanded
          ><p>Iron plates and lubricant.</p></punk-accordion-item
        >
        <punk-accordion-item heading="Outputs"><p>Precision gears.</p></punk-accordion-item>
        <punk-accordion-item heading="Maintenance" disabled><p>Locked.</p></punk-accordion-item>
      </punk-accordion>`,
    )}
    ${group(
      'Multiple',
      html`<punk-accordion multiple>
        <punk-accordion-item heading="Fuel" expanded><p>Coal.</p></punk-accordion-item>
        <punk-accordion-item heading="Byproducts" expanded><p>Slag.</p></punk-accordion-item>
        <punk-accordion-item heading="Repairs"><p>Weekly.</p></punk-accordion-item>
      </punk-accordion>`,
    )}
    ${group(
      'Icon, rich heading and level',
      html`<punk-accordion>
        <punk-accordion-item level="2" expanded>
          <span slot="icon" aria-hidden="true">${icon('check')}</span>
          <span slot="heading">Settings <b>(2)</b></span>
          <p>The heading is level 2.</p>
        </punk-accordion-item>
      </punk-accordion>`,
    )}
    ${group(
      'A long heading wraps',
      html`<div style="max-inline-size: 200px">
        <punk-accordion>
          <punk-accordion-item
            heading="Eingangsmaterialien und Zwischenprodukte der Montagemaschine"
            ><p>Text.</p></punk-accordion-item
          >
        </punk-accordion>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${items()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(items),
  parameters: { a11y: { config: axeConfig(repeatedLandmarks) } },
});
