// Runs inside the consumer pages, injected by check-consumer.ts. It lives in its own file because
// it needs DOM types, and the Node-run scripts must not have them.

export function probeConsumer() {
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
  };
}

declare global {
  interface Window {
    probeConsumer: typeof probeConsumer;
  }
}
window.probeConsumer = probeConsumer;
