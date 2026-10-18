import axe from 'axe-core';
import type { AxeResults, Result } from 'axe-core';

/** Runs axe on `root` the way every gallery suite does. */
export function scanForViolations(root: Element): Promise<AxeResults> {
  return axe.run(root, {
    resultTypes: ['violations'],
    elementRef: true,
    // `region` asks that page content sit in landmarks, which is the page's job, not a component's.
    rules: { region: { enabled: false } },
  });
}

// A parent tree item is named by its `label`, and its children, which are its descendants, show
// inside it, so axe counts their text as the item's visible label. The label itself is in the name,
// so the item meets WCAG 2.5.3; only this rule, on only these elements, is set aside.
function exempt(violation: Result): Result {
  if (violation.id !== 'label-content-name-mismatch') return violation;
  const nodes = violation.nodes.filter((node) => {
    const element = node.element;
    return !(
      element?.localName === 'punk-tree-item' &&
      [...element.children].some((child) => child.localName === 'punk-tree-item')
    );
  });
  return { ...violation, nodes };
}

/** The serious and critical violations, less the one exemption above. */
export function seriousViolations(results: AxeResults): Result[] {
  return results.violations
    .map(exempt)
    .filter(
      (violation) =>
        violation.nodes.length > 0 && ['serious', 'critical'].includes(violation.impact ?? ''),
    );
}
