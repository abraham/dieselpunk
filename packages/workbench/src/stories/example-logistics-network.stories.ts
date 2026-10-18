import preview from '#.storybook/preview';
import { html, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import type { PunkCloseDetail, PunkDialog, PunkToastStack } from '@dieselpunk/core';
import '@dieselpunk/core/button/register.js';
import '@dieselpunk/core/connection-row/register.js';
import '@dieselpunk/core/dialog/register.js';
import '@dieselpunk/core/popover/register.js';
import '@dieselpunk/core/select/register.js';
import '@dieselpunk/core/toast/register.js';
import '@dieselpunk/core/toolbar/register.js';
import '@dieselpunk/core/window/register.js';
import { icon } from '../icons/icons.ts';

const meta = preview.meta({
  title: 'Examples/Logistics network',
  tags: ['!autodocs'],
  parameters: {
    docs: {
      description: {
        story:
          "A list of connections with a filter, a menu that adds one, a confirmation before a removal, and an Undo. After a removal, focus goes to the next row's remove button, or to the list's heading after the last.",
      },
    },
  },
});

type Condition = 'running' | 'waiting' | 'blocked';
interface Connection {
  id: string;
  from: string;
  to: string;
  kind: string;
  direction: 'forward' | 'backward' | 'both';
  condition: Condition;
}

const variants: Record<Condition, 'success' | 'warning' | 'danger'> = {
  running: 'success',
  waiting: 'warning',
  blocked: 'danger',
};
const words: Record<Condition, string> = {
  running: 'Running',
  waiting: 'Waiting for input',
  blocked: 'Blocked',
};

const initial = (): Connection[] =>
  [
    ['Iron mine', 'Smelter A', 'Belt', 'forward', 'running'],
    ['Copper mine', 'Smelter B', 'Belt', 'forward', 'running'],
    ['Smelter A', 'Gear assembler', 'Belt', 'forward', 'running'],
    ['Smelter B', 'Circuit assembler', 'Belt', 'forward', 'waiting'],
    ['Gear assembler', 'Module assembler', 'Belt', 'forward', 'running'],
    ['Circuit assembler', 'Module assembler', 'Belt', 'forward', 'blocked'],
    ['Water pump', 'Boiler 1', 'Pipe', 'forward', 'running'],
    ['Boiler 1', 'Turbine', 'Pipe', 'forward', 'running'],
    ['Turbine', 'Boiler 1', 'Pipe', 'backward', 'waiting'],
    ['Substation', 'Assembler row', 'Circuit wire', 'both', 'running'],
    ['Module assembler', 'Storage chest', 'Belt', 'forward', 'running'],
    ['Storage chest', 'Dispatch', 'Belt', 'forward', 'blocked'],
  ].map(
    ([from, to, kind, direction, condition], index) =>
      ({
        id: `c${index + 1}`,
        from,
        to,
        kind,
        direction,
        condition,
      }) as Connection,
  );

const menuItem = (label: string) =>
  html`<button
    role="menuitem"
    style="display: block; inline-size: 100%; padding: 8px 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: start"
  >
    ${label}
  </button>`;

export const LogisticsNetwork = meta.story({
  render: () => {
    const host = document.createElement('div');
    host.className = 'wb-stack';
    host.style.maxInlineSize = '760px';
    let connections = initial();
    let filter: 'all' | Condition = 'all';
    let pending: Connection | undefined;
    let added = 0;
    const visible = () => connections.filter((c) => filter === 'all' || c.condition === filter);

    const heading = () => host.querySelector<HTMLElement>('#network-heading');
    const toasts = () => host.querySelector('punk-toast-stack') as PunkToastStack;
    const removeButton = (id: string) =>
      host
        .querySelector(`punk-connection-row[value="${id}"]`)
        ?.shadowRoot?.querySelector<HTMLElement>('[part="remove-button"]');
    // The list draws first, and then the dialog gives focus back to a button that is gone.
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    const onFilter = (event: Event) => {
      filter = (event.target as HTMLInputElement).value as typeof filter;
      draw();
    };
    const add = (event: Event) => {
      const kind = (event.target as HTMLElement).closest('[role="menuitem"]')?.textContent?.trim();
      if (!kind) return;
      added++;
      connections = [
        ...connections,
        {
          id: `n${added}`,
          from: `New source ${added}`,
          to: `New destination ${added}`,
          kind,
          direction: 'forward',
          condition: 'waiting',
        },
      ];
      draw();
    };
    const ask = (event: CustomEvent<{ value: string }>) => {
      pending = connections.find((c) => c.id === event.detail.value);
      draw();
      host.querySelector<PunkDialog>('punk-dialog')?.show();
    };
    const decide = async (event: CustomEvent<PunkCloseDetail>) => {
      const removed = pending;
      pending = undefined;
      if (!removed || event.detail.returnValue !== 'remove') {
        draw();
        return;
      }
      const shown = visible();
      const at = shown.findIndex((c) => c.id === removed.id);
      const index = connections.findIndex((c) => c.id === removed.id);
      connections = connections.filter((c) => c.id !== removed.id);
      draw();
      const undo = document.createElement('punk-button');
      undo.setAttribute('size', 'sm');
      undo.textContent = 'Undo';
      undo.addEventListener('click', async () => {
        connections = [...connections.slice(0, index), removed, ...connections.slice(index)];
        draw();
        await settle();
        removeButton(removed.id)?.focus();
      });
      toasts().show({
        message: `Removed ${removed.from} to ${removed.to}.`,
        variant: 'info',
        action: undo,
        duration: 10000,
      });
      await settle();
      // The row that took its place, or the heading when it was the last.
      const next = visible()[at];
      (next ? removeButton(next.id) : heading())?.focus();
    };

    function draw() {
      render(
        html`
          <div>
            <h2>Logistics network</h2>
            <p>
              Filter by status, add a connection from the menu, and remove one with its button. A
              removal asks first, and a toast offers Undo.
            </p>
          </div>
          <punk-window heading="Connections" open>
            <punk-toolbar aria-label="Connection tools" wrap>
              <punk-select label="Show" @change=${onFilter}>
                <option value="all" ?selected=${filter === 'all'}>All connections</option>
                <option value="running" ?selected=${filter === 'running'}>Running</option>
                <option value="waiting" ?selected=${filter === 'waiting'}>Waiting</option>
                <option value="blocked" ?selected=${filter === 'blocked'}>Blocked</option>
              </punk-select>
              <punk-button id="network-add">
                <span slot="icon-start">${icon('plus')}</span>Add connection
              </punk-button>
            </punk-toolbar>
            <punk-popover
              for="network-add"
              mode="menu"
              placement="bottom"
              data-punk-close-on-activate
              @click=${add}
            >
              ${menuItem('Belt')}${menuItem('Pipe')}${menuItem('Circuit wire')}
            </punk-popover>
            <h3 id="network-heading" tabindex="-1" style="margin-block: 16px 8px">
              Connections (${visible().length} of ${connections.length})
            </h3>
            <div class="wb-stack" role="list" aria-labelledby="network-heading" style="gap: 8px">
              ${repeat(
                visible(),
                (c) => c.id,
                (c) => html`
                  <div role="listitem">
                    <punk-connection-row
                      removable
                      value=${c.id}
                      direction=${c.direction}
                      status=${variants[c.condition]}
                      @punk-remove=${ask}
                    >
                      <span slot="source">${c.from}</span>
                      <span slot="destination">${c.to}</span>
                      <span>${c.kind}</span>
                      <span slot="status">${words[c.condition]}</span>
                    </punk-connection-row>
                  </div>
                `,
              )}
            </div>
          </punk-window>
          <punk-dialog heading="Remove this connection?" alert @punk-close=${decide}>
            <p style="margin: 0">
              ${pending ? `${pending.from} to ${pending.to} (${pending.kind}) stops carrying items.` : ''}
            </p>
            <punk-button slot="footer" data-punk-close="keep">Keep it</punk-button>
            <punk-button slot="footer" variant="danger" data-punk-close="remove"
              >Remove</punk-button
            >
          </punk-dialog>
          <punk-toast-stack label="Notifications"></punk-toast-stack>
        `,
        host,
      );
    }
    draw();
    return host;
  },
});
