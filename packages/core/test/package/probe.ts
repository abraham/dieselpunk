// Runs inside the consumer pages, injected by check-consumer.ts. It lives in its own file because
// it needs DOM types, and the Node-run scripts must not have them.

export function probeConsumer() {
  const tags = [
    'punk-panel',
    'punk-button',
    'punk-icon-button',
    'punk-progress-bar',
    'punk-tooltip',
  ];
  const bar = document
    .querySelector('punk-progress-bar')
    ?.shadowRoot?.querySelector('[role="progressbar"]');
  const inner = document.querySelector('punk-icon-button')?.shadowRoot?.querySelector('button');
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
  };
}

declare global {
  interface Window {
    probeConsumer: typeof probeConsumer;
  }
}
window.probeConsumer = probeConsumer;
