import preview from '#.storybook/preview';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import type { PunkWindow } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/window/register.js';
import { icon } from '../icons/icons.ts';
import { group, themeDensityMatrix } from '../lib/matrix.ts';
import type { StoryArgs } from '../lib/types.ts';

const { args, argTypes, template } = getStorybookHelpers<PunkWindow>('punk-window');

const meta = preview.type<{ args: StoryArgs<PunkWindow> }>().meta({
  title: 'Components/Window',
  tags: ['overlays'],
  component: 'punk-window',
  args: {
    ...args,
    heading: 'Assembler 03',
    open: true,
    dismissible: true,
    movable: true,
    'default-slot': '<p>Crafting speed 0.75</p>',
    'footer-slot':
      '<punk-button slot="footer" variant="primary">Start</punk-button><punk-button slot="footer">Stop</punk-button>',
  },
  argTypes,
  render: (storyArgs) => html`<div style="min-block-size: 280px">${template(storyArgs)}</div>`,
  parameters: {
    docs: {
      description: {
        component: `
A titled application window, optionally modal, movable, and dismissible. Give it a \`heading\`, or an \`aria-label\`. It is a native \`<dialog>\`, so a closed window shows nothing, and \`open\` shows and hides it from code, from an attribute, and from the user.

**Modal:** \`modal\` makes the rest of the page inert, traps focus, and holds the page's scroll. Focus starts on the first thing in the content (an \`autofocus\` element, else the first tabbable one), never on the close or move button, and goes back to what opened it. A click on the backdrop closes nothing. Without \`modal\` the window stays in the flow of its container, and the page is not inert.

**Dismissible:** \`dismissible\` adds the close button and lets Escape close the window. A window that is not dismissible ignores Escape, and keeps Escape from reaching a window beneath it. Escape closes only the topmost overlay.

**Moving:** \`movable\` lets the titlebar be dragged, and adds the move button, for pointers that cannot drag and for the keyboard. The button starts move mode: the arrow keys move the window by 8px (32px with Shift), a click anywhere puts the center of the titlebar there, Enter places the window, and Escape puts it back. The window never leaves the viewport. A press on a control in the titlebar never starts a drag, and \`data-punk-no-drag\` marks others.

**Layout:** the window is at most \`--punk-window-max-width\` wide, and its footer stacks its actions at container widths of 480px and below. A body taller than the window scrolls, and is a focusable region while it does.

**Events:** \`punk-open\`, \`punk-close\` with the reason (\`escape\`, \`close-button\`, or \`method\`), \`punk-move-start\` and \`punk-move-end\` with the offset \`{ x, y }\`.
`,
      },
    },
  },
});

export const Playground = meta.story();

const launcher = (modal: boolean) => html`
  <punk-button
    @click=${(event: Event) =>
      ((event.currentTarget as HTMLElement).nextElementSibling as PunkWindow | null)?.show()}
    >Open the window</punk-button
  >
  <punk-window heading="Assembler 03" ?modal=${modal} dismissible movable>
    <p>Press Escape, or the close button, to close it.</p>
    <punk-button
      slot="footer"
      variant="primary"
      @click=${(event: Event) =>
        ((event.currentTarget as HTMLElement).closest('punk-window') as PunkWindow).close()}
      >Done</punk-button
    >
  </punk-window>
`;

const windows = () => html`
  <div class="wb-stack">
    ${group(
      'Plain, dismissible and movable, and with an icon and actions',
      html`<div class="wb-stack">
        <punk-window heading="Assembler 03" open><p>Crafting speed 0.75</p></punk-window>
        <punk-window heading="Assembler 03" open dismissible movable>
          <span slot="icon" aria-hidden="true">${icon('check')}</span>
          <p>Crafting speed 0.75</p>
          <punk-button slot="footer" variant="primary">Start</punk-button>
          <punk-button slot="footer">Stop</punk-button>
        </punk-window>
      </div>`,
    )}
    ${group(
      'A narrow window stacks its actions',
      html`<punk-window
        heading="Assembler 03"
        open
        dismissible
        style="--punk-window-max-width: 320px"
      >
        <p>Crafting speed 0.75</p>
        <punk-button slot="footer" variant="primary">Start</punk-button>
        <punk-button slot="footer">Stop</punk-button>
      </punk-window>`,
    )}
    ${group(
      'A long heading wraps',
      html`<div style="max-inline-size: 240px">
        <punk-window
          heading="Montagemaschine für schwere industrielle Getriebe, Baureihe zwei"
          open
          dismissible
        >
          <p>Fertigungsgeschwindigkeit</p>
        </punk-window>
      </div>`,
    )}
  </div>
`;

export const States = meta.story({
  render: () => html`<div style="max-inline-size: 640px">${windows()}</div>`,
});

/** A modal window covers the story, so it opens from a button. */
export const Modal = meta.story({
  render: () => launcher(true),
});

export const ThemeAndDensityMatrix = meta.story({
  render: () => themeDensityMatrix(windows),
});
