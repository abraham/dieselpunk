import type { LitElement, PropertyDeclaration } from 'lit';
import { setHydrating, setHydration } from './internal/server-values.ts';

// Hydration of server-rendered components (specs/ssr.md §5): import this entry after Lit's
// hydration support (`@lit-labs/ssr-client/lit-element-hydrate-support.js`) and before the
// components. Without that support, components replace the server's tree as they would anyway (§4).

const always: PropertyDeclaration = { hasChanged: () => true };
const claimed = new WeakSet<HTMLElement>();

setHydration({
  claim(element, root) {
    if (!('litElementHydrateSupport' in globalThis)) return false;
    // Support that loads after `lit-element` never patches it, and unpatched Lit would render a
    // second tree into the server's. The patch adds `defer-hydration` to observedAttributes.
    const observed = (element.constructor as typeof LitElement).observedAttributes;
    if (!observed.includes('defer-hydration')) return false;
    claimed.add(element);
    // The server's styles: one `<style>`, or with shared styles (§6) any it did not adopt yet.
    for (const child of [...root.children]) {
      if (child.localName === 'style' || child.localName === 'punk-styles') child.remove();
    }
    return true;
  },

  update(element, run) {
    const hydrating = claimed.delete(element);
    // The hydrating render sees only what the server saw, so it matches the server's output.
    setHydrating(hydrating);
    try {
      run();
    } finally {
      setHydrating(false);
    }
    if (!hydrating) return;
    const host = element as unknown as LitElement;
    // An empty text binding hydrates with no text node, and Lit would write later text into the
    // closing marker, so each one gets a node.
    const walker = document.createTreeWalker(host.renderRoot, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) {
      const marker = walker.currentNode as Comment;
      if (marker.data === 'lit-part' && marker.nextSibling?.nodeValue === '/lit-part') {
        marker.after('');
      }
    }
    // Then the page's values, once the children already queued have hydrated: every property
    // again, and the slots, which were assigned while the page was parsed.
    queueMicrotask(() => {
      for (const key of (host.constructor as typeof LitElement).elementProperties.keys()) {
        host.requestUpdate(key, undefined, always);
      }
      for (const slot of host.renderRoot.querySelectorAll('slot')) {
        slot.dispatchEvent(new Event('slotchange'));
      }
    });
  },
});
