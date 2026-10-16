import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { PunkCloseDetail, PunkSelectionChangeDetail, ToastVariant } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/checkbox/register.js';
import '@dieselpunk/core/dialog/register.js';
import '@dieselpunk/core/item-stack/register.js';
import '@dieselpunk/core/number-field/register.js';
import '@dieselpunk/core/popover/register.js';
import '@dieselpunk/core/progress-bar/register.js';
import '@dieselpunk/core/recipe/register.js';
import '@dieselpunk/core/select/register.js';
import '@dieselpunk/core/slider/register.js';
import '@dieselpunk/core/slot/register.js';
import '@dieselpunk/core/slot-grid/register.js';
import '@dieselpunk/core/status-light/register.js';
import '@dieselpunk/core/switch/register.js';
import '@dieselpunk/core/tabs/register.js';
import '@dieselpunk/core/text-field/register.js';
import '@dieselpunk/core/toast/register.js';
import '@dieselpunk/core/toolbar/register.js';
import '@dieselpunk/core/window/register.js';
import { icon } from '../icons/icons.ts';
import { item, itemLabels } from '../icons/items.ts';

// SPEC §8 and §19: the assembler window, completed with a toolbar, tabs, a settings form, a
// confirmation dialog, a menu, and toasts. Everything is wired from the outside with the events
// the components send, so this is also what an application's code looks like.

let instances = 0;

const rootOf = (event: Event) =>
  (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-shell]')!;

const notify = (root: HTMLElement, message: string, variant: ToastVariant, heading?: string) =>
  root.querySelector('punk-toast-stack')!.show({ message, variant, heading });

/** The form as the server would see it, one line for each field. */
function showFormData(form: HTMLFormElement): void {
  const lines = [...new FormData(form)].map(([name, value]) => `${name} = ${String(value)}`);
  const output = form.querySelector('output');
  if (output) output.textContent = lines.join('\n') || 'nothing submitted';
}

const menuItem = (label: string) =>
  html`<button
    role="menuitem"
    style="display: block; inline-size: 100%; padding: 8px 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: start"
  >
    ${label}
  </button>`;

export function applicationShell(): TemplateResult {
  const id = `shell-${++instances}`;

  const start = (event: Event) => notify(rootOf(event), 'Crafting resumed.', 'success');
  const pause = (event: Event) => notify(rootOf(event), 'Crafting paused.', 'info');
  const stop = (event: Event) => rootOf(event).querySelector('punk-dialog')!.show();
  const reopen = (event: Event) => rootOf(event).querySelector('punk-window')!.show();

  const decide = (event: CustomEvent<PunkCloseDetail>) => {
    const root = rootOf(event);
    if (event.detail.returnValue !== 'discard') return;
    root.querySelector('punk-progress-bar')!.value = 0;
    notify(root, 'The run was discarded.', 'warning', 'Stopped');
  };

  const menu = (event: Event) => {
    const label = (event.target as HTMLElement).closest('[role="menuitem"]')?.textContent?.trim();
    if (label) notify(rootOf(event), `${label}: done.`, 'info');
  };

  const selected = (event: CustomEvent<PunkSelectionChangeDetail>) => {
    const output = rootOf(event).querySelector<HTMLOutputElement>('output[data-module]');
    if (output) output.textContent = event.detail.values.join(', ') || 'no module selected';
  };

  const apply = (event: SubmitEvent) => {
    event.preventDefault();
    showFormData(event.currentTarget as HTMLFormElement);
    notify(rootOf(event), 'Settings applied.', 'success');
  };

  const liveForm = (event: Event) => showFormData(event.currentTarget as HTMLFormElement);

  return html`
    <div class="wb-stack" style="max-inline-size: 720px" data-shell>
      <div>
        <h2>Application shell</h2>
        <p>
          The assembler of the spec, built from the window, tabs, toolbar, form controls, dialog,
          popover, and toasts. Everything works with the keyboard: Tab between groups, arrows in the
          tabs, the toolbar, and the grid, Enter on Stop for the dialog, and Escape closes the
          dialog, the menu, and the window.
        </p>
        <punk-button @click=${reopen}>Open the assembler</punk-button>
      </div>

      <punk-window heading="Assembler 03" open dismissible movable>
        <punk-toolbar aria-label="Machine actions" wrap>
          <punk-button variant="primary" @click=${start}>
            <span slot="icon-start">${icon('check')}</span>Start
          </punk-button>
          <punk-button @click=${pause}>Pause</punk-button>
          <punk-button variant="danger" @click=${stop}>
            <span slot="icon-start">${icon('close')}</span>Stop
          </punk-button>
          <punk-button id="${id}-actions">Actions</punk-button>
        </punk-toolbar>
        <punk-popover
          for="${id}-actions"
          mode="menu"
          placement="bottom"
          data-punk-close-on-activate
          @click=${menu}
        >
          ${menuItem('Copy recipe')}${menuItem('Clear queue')}${menuItem('Rename machine')}
        </punk-popover>

        <punk-tabs aria-label="Machine details">
          <punk-tab slot="tab" panel="${id}-production">Production</punk-tab>
          <punk-tab slot="tab" panel="${id}-modules">Modules</punk-tab>
          <punk-tab slot="tab" panel="${id}-settings">Settings</punk-tab>
        </punk-tabs>

        <section id="${id}-production">
          <div class="wb-stack">
            <punk-recipe name="Speed module" duration="6" available craftable-count="4" selected>
              ${item('module', 'icon')}
              <span slot="ingredients">2 gears, 1 circuit</span>
              <span slot="products">Speed module</span>
            </punk-recipe>
            <punk-progress-bar
              label="Crafting speed module"
              value="64"
              max="100"
              show-value
            ></punk-progress-bar>
            <div class="wb-row">
              <punk-status-light variant="success">Running</punk-status-light>
              <punk-status-light variant="warning">Coolant low</punk-status-light>
            </div>
          </div>
        </section>

        <section id="${id}-modules">
          <div class="wb-stack">
            <punk-slot-grid
              aria-label="Module slots"
              columns="4"
              selection="single"
              @punk-selection-change=${selected}
            >
              <punk-item-stack name=${itemLabels.module} value="speed" count="2">
                ${item('module', 'icon')}
              </punk-item-stack>
              <punk-item-stack name=${itemLabels.circuit} value="circuit" count="8">
                ${item('circuit', 'icon')}
              </punk-item-stack>
              <punk-slot label="Empty module slot" value="free-1"></punk-slot>
              <punk-slot label="Empty module slot" value="free-2"></punk-slot>
            </punk-slot-grid>
            <output class="wb-caption" data-module>no module selected</output>
          </div>
        </section>

        <section id="${id}-settings">
          <form
            class="wb-stack"
            @submit=${apply}
            @input=${liveForm}
            @change=${liveForm}
            ${ref((form) => {
              if (form) requestAnimationFrame(() => showFormData(form as HTMLFormElement));
            })}
          >
            <punk-text-field label="Machine name" name="name" value="Assembler 03" required>
              <span slot="hint">Shown in the factory list.</span>
            </punk-text-field>
            <punk-number-field
              label="Target speed"
              name="speed"
              value="0.75"
              min="0"
              max="5"
              step="0.25"
            >
              <span slot="suffix">/s</span>
            </punk-number-field>
            <punk-select label="Priority" name="priority">
              <option value="low">Low</option>
              <option value="normal" selected>Normal</option>
              <option value="high">High</option>
            </punk-select>
            <punk-slider label="Power limit" name="power" value="80" show-value></punk-slider>
            <punk-switch name="restart" checked>Restart automatically</punk-switch>
            <punk-checkbox name="notify" checked>Notify when finished</punk-checkbox>
            <div class="wb-row">
              <punk-button variant="primary" type="submit">Apply</punk-button>
              <punk-button type="reset">Reset</punk-button>
            </div>
            <output class="wb-mono" style="white-space: pre-wrap"></output>
          </form>
        </section>

        <punk-button slot="footer" variant="primary" @click=${start}>Resume</punk-button>
      </punk-window>

      <punk-dialog heading="Discard the run?" alert @punk-close=${decide}>
        <p style="margin: 0">Stopping now throws away the 64% already crafted.</p>
        <punk-button slot="footer" data-punk-close="cancel">Keep crafting</punk-button>
        <punk-button slot="footer" variant="danger" data-punk-close="discard">Discard</punk-button>
      </punk-dialog>

      <punk-toast-stack label="Notifications"></punk-toast-stack>
    </div>
  `;
}
