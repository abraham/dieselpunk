import {
  componentNames,
  contentVariants,
  finishGallery,
  galleryMarkup,
  openTooltips,
} from '../../browser/fixtures/gallery.ts';
import type { ContentVariant } from '../../browser/fixtures/gallery.ts';

// specs/security.md §4.3: every component of the gallery, from the packed package, on a page whose
// policy is the one the spec supports. check-consumer.ts serves it with that policy as a header.

interface TrustedTypePolicyFactory {
  createPolicy(
    name: string,
    rules: { createHTML(input: string): string },
  ): {
    createHTML(input: string): string;
  };
}

const probe = 'csp-probe';
const violations: string[] = [];
let enforced = false;
document.addEventListener('securitypolicyviolation', (event) => {
  if (event.sample.includes(probe)) {
    enforced = true;
    return;
  }
  const target = event.composedPath()[0];
  const host = target instanceof Node ? (target.getRootNode() as Partial<ShadowRoot>).host : null;
  violations.push(
    `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} in <${host?.localName ?? (target as Element | null)?.localName ?? '?'}>`,
  );
});

const variant = (new URLSearchParams(location.search).get('content') ?? 'short') as ContentVariant;
if (!contentVariants.includes(variant)) throw new Error(`Unknown content variant "${variant}"`);

// A string written to a sink must be blocked, or the policy is not in force and the page proves
// nothing. The block is reported like any violation, marked so it is not counted as one.
try {
  document.createElement('div').innerHTML = `<b>${probe}</b>`;
} catch {
  // Reported through `securitypolicyviolation`.
}

// The fixture's own markup goes in through a policy of its own; the library has only `lit-html`.
const { trustedTypes } = window as unknown as { trustedTypes: TrustedTypePolicyFactory };
const fixture = trustedTypes.createPolicy('csp-fixture', { createHTML: (input) => input });
const root = document.createElement('div');
root.innerHTML = fixture.createHTML(galleryMarkup(variant, componentNames));
document.body.append(root);
finishGallery(root);
openTooltips(root);

const elements = [...root.querySelectorAll('*')].filter((element) =>
  element.localName.startsWith('punk-'),
) as Array<Element & { updateComplete?: Promise<boolean> }>;
await Promise.all(elements.map((element) => element.updateComplete));
// Violations are reported in a task after the work that caused them.
await new Promise((resolve) => setTimeout(resolve, 100));

const undefinedTags = componentNames
  .map((name) => `punk-${name}`)
  .filter((tag) => !customElements.get(tag));

Object.assign(window, { cspReport: { enforced, undefinedTags, violations } });
document.documentElement.dataset['csp'] = 'ready';
