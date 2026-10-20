import { html } from 'lit';
import type { TemplateResult } from 'lit';
import type { SlotPresence } from './slot-presence.ts';

/** A field's `prefix` or `suffix` slot inside its box, hidden while empty. Only some fields have them. */
export function fieldAffix(presence: SlotPresence, name: 'prefix' | 'suffix'): TemplateResult {
  return html`<span part=${name} class=${name} ?hidden=${!presence.has(name)}
    ><slot name=${name} @slotchange=${presence.handleSlotChange}></slot
  ></span>`;
}
