import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkPagination } from '@dieselpunk/core';
import '@dieselpunk/core/pagination/register.js';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkPagination>('punk-pagination');

const meta = preview.type<{ args: StoryArgs<PunkPagination> }>().meta({
  title: 'Components/Pagination',
  component: 'punk-pagination',
  args: { ...args, page: 5, pages: 12 },
  argTypes,
  render: (storyArgs) => template(storyArgs),
  parameters: {
    docs: {
      description: {
        component: `
Moving through the pages of a long result set: a \`nav\` landmark named "Pagination" (or \`label\`) with previous and next buttons and a button for each page it shows: the first and last, the current one with \`siblings\` on each side, and a gap for the rest. A gap never stands for a single page.

**Names:** each page button shows its number, formatted for the nearest \`lang\`, and is named "Page 3". The current page has \`aria-current="page"\` and is set into the strip with an accent bar, so it is a shape and not only a color.

**Changes:** the application owns the data. A click sets \`page\` and sends \`punk-page-change\` with \`{ page }\`; focus stays on the button that was pressed, or moves to the current page when that button is gone or disabled. A \`page\` out of range is clamped and warns.
`,
      },
    },
  },
});

export const Playground = meta.story();

const paginations = () => html`
  <div class="wb-stack">
    ${group('First page', html`<punk-pagination page="1" pages="5"></punk-pagination>`)}
    ${group('In the middle', html`<punk-pagination page="10" pages="20"></punk-pagination>`)}
    ${group('Two siblings', html`<punk-pagination page="10" pages="20" siblings="2"></punk-pagination>`)}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 480px">${paginations()}</div>`,
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(paginations),
});
