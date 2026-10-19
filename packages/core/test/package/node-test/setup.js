// What happy-dom lacks that the components use. Enough to render and read properties; it does not
// submit form values or report validity.
HTMLElement.prototype.attachInternals ??= function () {
  return {
    setFormValue() {},
    setValidity() {},
    labels: [],
    form: null,
    validity: { valid: true },
  };
};
if (!('rows' in HTMLTableSectionElement.prototype)) {
  Object.defineProperty(HTMLTableSectionElement.prototype, 'rows', {
    get() {
      return this.querySelectorAll(':scope > tr');
    },
  });
}
