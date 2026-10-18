// The browser half of the SSR fixture (specs/ssr.md §4): after `upgrade()` loads the definitions
// over the server's HTML, every element must equal a client render of the same markup.
/* global customElements, document, Node, setTimeout, window */
window.checkUpgrade = async () => {
  const tags = window.ssrTags;
  await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  const settle = async (elements) => {
    for (let round = 0; round < 3; round++) {
      await Promise.all(elements.map((element) => element.updateComplete));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  await settle([...document.querySelectorAll('body *')].filter((el) => el.updateComplete));

  // Generated ids differ between two instances, so they are compared as a placeholder.
  const value = (element, name) => {
    const text = element.getAttribute(name);
    return /^punk-.*-\d+$/.test(text) || /-\d+$/.test(text) ? '#' : text;
  };
  const tree = (node) =>
    [...node.childNodes]
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.data.trim();
        if (child.nodeType !== Node.ELEMENT_NODE) return '';
        const attributes = child.getAttributeNames().sort();
        return `<${child.localName} ${attributes.map((name) => `${name}=${value(child, name)}`).join(' ')}>${tree(child)}</>`;
      })
      .join('');
  const host = (element) =>
    element
      .getAttributeNames()
      .filter((name) => name !== 'id')
      .sort()
      .map((name) => `${name}=${value(element, name)}`)
      .join(' ');

  const problems = [];
  for (const tag of tags) {
    const upgraded = document.querySelector(`[data-case="${tag}"] > ${tag}`);
    // On its own, so an overlay does not take the upgraded element as its anchor.
    const box = document.createElement('div');
    const fresh = box.appendChild(document.createElement(tag));
    document.body.append(box);
    await settle([fresh]);
    const root = upgraded.shadowRoot;
    if (tree(root) !== tree(fresh.shadowRoot)) {
      problems.push(`${tag}: its shadow tree is not a client render's`);
    }
    if (host(upgraded) !== host(fresh)) {
      problems.push(
        `${tag}: host attributes [${host(upgraded)}], a client render has [${host(fresh)}]`,
      );
    }
    if (root.querySelector('style')) problems.push(`${tag}: kept the server's <style>`);
    if (root.adoptedStyleSheets.length !== fresh.shadowRoot.adoptedStyleSheets.length) {
      problems.push(
        `${tag}: adopted ${root.adoptedStyleSheets.length} sheets, not ${fresh.shadowRoot.adoptedStyleSheets.length}`,
      );
    }
    box.remove();
  }

  const byId = (id) => document.getElementById(id);
  const part = (id, name) => byId(id).shadowRoot.querySelector(`[part="${name}"]`);
  const stat = part('stat', 'value').textContent.trim();
  if (stat !== new Intl.NumberFormat('de').format(12345.6)) {
    problems.push(`the stat reads ${stat} in a German page`);
  }
  if (part('panel', 'header').hidden) problems.push("the panel's header is hidden");
  if (part('divider', 'label').hidden) problems.push("the divider's label is hidden");
  if (!part('popover', 'surface').matches(':popover-open')) problems.push('the popover is closed');
  if (byId('typed').value !== 'Ada')
    problems.push(`the typed field's value is "${byId('typed').value}"`);
  if (document.activeElement !== byId('typed')) {
    problems.push(`focus is on <${document.activeElement?.localName}>, not the typed field`);
  }
  if (byId('select').value !== 'b')
    problems.push(`the select's value is "${byId('select').value}"`);
  return problems;
};
