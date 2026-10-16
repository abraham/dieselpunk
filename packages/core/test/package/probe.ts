// Runs inside the consumer pages, injected by check-consumer.ts. It lives in its own file because
// it needs DOM types, and the Node-run scripts must not have them.

export async function probeConsumer() {
  const tags = [
    'punk-panel',
    'punk-button',
    'punk-icon-button',
    'punk-progress-bar',
    'punk-tooltip',
    'punk-slot',
    'punk-item-stack',
    'punk-slot-grid',
    'punk-recipe',
    'punk-meter',
    'punk-status-light',
    'punk-stack',
    'punk-cluster',
    'punk-accordion',
    'punk-accordion-item',
    'punk-tabs',
    'punk-tab',
    'punk-toolbar',
    'punk-window',
    'punk-dialog',
  ];
  const bar = document
    .querySelector('punk-progress-bar')
    ?.shadowRoot?.querySelector('[role="progressbar"]');
  const inner = document.querySelector('punk-icon-button')?.shadowRoot?.querySelector('button');
  // Clicking an item of the grid selects it, and the event carries the value.
  const grid = document.querySelector('punk-slot-grid');
  let changed: string[] | null = null;
  grid?.addEventListener('punk-selection-change', (event) => {
    changed = event.detail.values;
  });
  grid?.querySelector('punk-slot')?.click();
  // Clicking an accordion heading expands the item, and the event carries the new state.
  const section = document.querySelector('punk-accordion-item');
  let toggled: boolean | null = null;
  section?.addEventListener('punk-toggle', (event) => {
    toggled = event.detail.expanded;
  });
  section?.shadowRoot?.querySelector('button')?.click();
  // Clicking the second tab selects it, and the event carries the panel.
  const secondTab = document.querySelector<HTMLElement>('punk-tab:nth-of-type(2)');
  let tabbed: string | null = null;
  document.querySelector('punk-tabs')?.addEventListener('punk-tab-change', (event) => {
    tabbed = event.detail.value;
  });
  secondTab?.click();
  // A dialog opened and closed from code reports how it closed.
  const confirm = document.querySelector('punk-dialog');
  let closed: string | null = null;
  confirm?.addEventListener('punk-close', (event) => {
    closed = `${event.detail.reason}:${event.detail.returnValue}`;
  });
  if (confirm) {
    confirm.show();
    await confirm.updateComplete;
    confirm.close('done');
  }
  return {
    defined: tags.filter((tag) => customElements.get(tag) !== undefined),
    upgraded: Boolean(
      document.querySelector('punk-panel')?.shadowRoot &&
      document.querySelector('punk-button')?.shadowRoot,
    ),
    canvas: getComputedStyle(document.documentElement)
      .getPropertyValue('--punk-color-canvas')
      .trim(),
    ready: document.documentElement.dataset['consumer'] ?? null,
    valuenow: bar?.getAttribute('aria-valuenow') ?? null,
    name: inner?.getAttribute('aria-label') ?? inner?.textContent?.trim() ?? null,
    gridRole: grid?.getAttribute('role') ?? null,
    itemRole: grid?.querySelector('punk-slot')?.getAttribute('role') ?? null,
    changed: changed as string[] | null,
    toggled: toggled as boolean | null,
    tabbed: tabbed as string | null,
    closed: closed as string | null,
  };
}

declare global {
  interface Window {
    probeConsumer: typeof probeConsumer;
  }
}
window.probeConsumer = probeConsumer;
