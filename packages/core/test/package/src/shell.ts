import type {
  PunkActivateDetail,
  PunkCloseDetail,
  PunkCloseReason,
  PunkMoveDetail,
  PunkSelectionChangeDetail,
  PunkTabChangeDetail,
} from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/item-stack/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/recipe/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/slot-grid/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/tabs/register.js';
import '@dieselpunk/core/window/register.js';

// The assembler of SPEC §8 and §19, built from the registration entries a developer would pick,
// with their own item art, and with every event of those components typed.

const art = (shape: string) =>
  `<svg slot="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${shape}</svg>`;

document.body.innerHTML = `
  <form id="assembler">
    <punk-window heading="Assembler 03" open dismissible movable>
      <punk-tabs aria-label="Machine details">
        <punk-tab slot="tab" panel="production">Production</punk-tab>
        <punk-tab slot="tab" panel="modules">Modules</punk-tab>
      </punk-tabs>

      <section id="production">
        <punk-recipe name="Precision gear" duration="0.5" available selected>
          ${art('<circle cx="12" cy="12" r="8"/>')}
          <span slot="ingredients">2 iron plates</span>
        </punk-recipe>

        <punk-progress-bar
          label="Crafting precision gear"
          value="64"
          max="100"
          show-value
        ></punk-progress-bar>

        <punk-slot-grid columns="4" selection="single" aria-label="Module slots">
          <punk-item-stack name="Speed module" value="speed" count="2">
            ${art('<rect x="4" y="4" width="16" height="16"/>')}
          </punk-item-stack>
          <punk-slot label="Empty module slot" value="empty"></punk-slot>
        </punk-slot-grid>
      </section>

      <section id="modules">
        <punk-switch name="overclock">Overclock</punk-switch>
      </section>

      <punk-button slot="footer" variant="primary" type="submit">Apply</punk-button>
    </punk-window>
  </form>
`;

const form = document.querySelector('form')!;
const assembler = document.querySelector('punk-window')!;
const tabs = document.querySelector('punk-tabs')!;
const grid = document.querySelector('punk-slot-grid')!;
const power = document.querySelector('punk-switch')!;

const log: string[] = [];
const record = (entry: string): void => {
  log.push(entry);
  document.documentElement.dataset['events'] = log.join(' ');
};

tabs.addEventListener('punk-tab-change', (event) => {
  const detail: PunkTabChangeDetail = event.detail;
  const panel: HTMLElement | null = detail.panel;
  // @ts-expect-error The detail carries `value`, `tab`, and `panel`, not an index.
  void detail.index;
  record(`tab:${detail.value}:${panel?.id ?? ''}`);
});

grid.addEventListener('punk-selection-change', (event) => {
  const detail: PunkSelectionChangeDetail = event.detail;
  // @ts-expect-error The detail carries `values` and `items`, not `selected`.
  void detail.selected;
  record(`select:${detail.values.join(',')}`);
});

grid.addEventListener('punk-activate', (event) => {
  const detail: PunkActivateDetail = event.detail;
  const item: HTMLElement = detail.item;
  record(`activate:${detail.value}:${item.localName}`);
});

assembler.addEventListener('punk-open', () => record('open'));
assembler.addEventListener('punk-close', (event) => {
  const detail: PunkCloseDetail = event.detail;
  const reason: PunkCloseReason = detail.reason;
  // @ts-expect-error The reasons are a closed union.
  const unknown: PunkCloseReason = 'sulking';
  void unknown;
  record(`close:${reason}`);
});
assembler.addEventListener('punk-move-start', (event) => {
  const detail: PunkMoveDetail = event.detail;
  record(`move-start:${detail.x},${detail.y}`);
});
assembler.addEventListener('punk-move-end', (event) => {
  const detail: PunkMoveDetail = event.detail;
  // @ts-expect-error The detail is an offset, `x` and `y` only.
  void detail.z;
  record(`move-end:${detail.x},${detail.y}`);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  document.documentElement.dataset['submitted'] = JSON.stringify([...new FormData(form)]);
});

// @ts-expect-error `checked` is a boolean.
power.checked = 'yes';
power.checked = false;

document.documentElement.dataset['shell'] = 'ready';
