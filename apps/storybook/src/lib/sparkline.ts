import { html } from 'lit';
import type { TemplateResult } from 'lit';

/** A small line chart for the stat's `sparkline` slot. It is decoration: the stat's text says the number. */
export function sparkline(values: readonly number[]): TemplateResult {
  const width = 60;
  const height = 16;
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const points = values
    .map((value, index) => {
      const x = values.length > 1 ? (index / (values.length - 1)) * width : 0;
      const y = height - 2 - ((value - low) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return html`<svg
    slot="sparkline"
    viewBox="0 0 ${width} ${height}"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <polyline
      points=${points}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
  </svg>`;
}
