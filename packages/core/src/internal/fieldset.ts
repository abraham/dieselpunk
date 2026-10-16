/**
 * Whether a disabled `<fieldset>` ancestor disables `element`. It is read live rather than cached
 * from `formDisabledCallback`, which also fires for the element's own `disabled` attribute and
 * would lag one update behind the property. Controls in a fieldset's first `<legend>` stay enabled.
 */
export function isFieldsetDisabled(element: Element): boolean {
  const fieldset = element.parentElement?.closest('fieldset:disabled');
  if (!fieldset) return false;
  const legend = fieldset.querySelector(':scope > legend');
  return !legend?.contains(element);
}
