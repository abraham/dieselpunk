// The browser half of the SSR fixture (specs/ssr.md §4): after `upgrade()` loads the definitions
// over the server's HTML, every element must equal a client render of the same markup.
/* global customElements, document, Node, setTimeout, window */
// Before the upgrade: the first rendered node of each element, to tell a kept tree from a new one.
window.markServerNodes = () => {
  window.serverNodes = [...document.querySelectorAll('[data-case] > *')]
    .map((host) => [host, [...host.shadowRoot.children].find((el) => el.localName !== 'style')])
    .filter(([, node]) => node);
};

// `hydrated`: whether the page loaded Lit's hydration support, so the server's nodes must stay.
window.checkUpgrade = async (hydrated) => {
  const tags = window.ssrTags;
  await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
  const settle = async (elements) => {
    for (let round = 0; round < 3; round++) {
      await Promise.all(elements.map((element) => element.updateComplete));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  await settle([...document.querySelectorAll('body *')].filter((el) => el.updateComplete));

  // Generated ids differ between two instances, so they are compared as a placeholder. Classes are
  // compared as a set, since the server and a directive space them differently.
  const value = (element, name) => {
    const text = element.getAttribute(name);
    if (name === 'class') return text.split(/\s+/).filter(Boolean).sort().join('.');
    return /^[a-z][\w-]*-\d+$/i.test(text) ? '#' : text;
  };
  // The server writes a control's value as an attribute, and a client render sets the property.
  const names = (element) =>
    element
      .getAttributeNames()
      .filter((name) => !(name === 'value' && /^(input|textarea)$/.test(element.localName)))
      .sort();
  const field = (element) =>
    /^(input|textarea|select)$/.test(element.localName) ? ` .value=${element.value}` : '';
  const tree = (node) =>
    [...node.childNodes]
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.data.trim();
        if (child.nodeType !== Node.ELEMENT_NODE) return '';
        const attributes = names(child);
        return `<${child.localName} ${attributes.map((name) => `${name}=${value(child, name)}`).join(' ')}${field(child)}>${tree(child)}</>`;
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
  if (window.serverNodes.length !== tags.length) {
    problems.push(`${window.serverNodes.length} of ${tags.length} tags had a server node to mark`);
  }
  for (const [host, node] of window.serverNodes) {
    const kept = host.shadowRoot.contains(node);
    if (kept !== hydrated) {
      problems.push(`${host.localName}: the server's nodes were ${kept ? 'kept' : 'replaced'}`);
    }
  }
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

  // A whole subtree, light DOM and every shadow root, so what an owner writes to its children counts.
  const deep = (node) =>
    [...node.childNodes]
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return child.data.trim();
        if (child.nodeType !== Node.ELEMENT_NODE || child.localName === 'template') return '';
        const attributes = names(child);
        const shadow = child.shadowRoot ? `#shadow(${deep(child.shadowRoot)})` : '';
        return `<${child.localName} ${attributes.map((name) => `${name}=${value(child, name)}`).join(' ')}${field(child)}>${shadow}${deep(child)}</>`;
      })
      .join('');
  for (const upgraded of document.querySelectorAll('[data-composed]')) {
    const index = upgraded.dataset.composed;
    const source = document.querySelector(`template[data-source="${index}"]`);
    const seen = deep(upgraded);
    // The fresh copy repeats the case's ids, so the upgraded one leaves the page first.
    const parent = upgraded.parentNode;
    const next = upgraded.nextSibling;
    upgraded.remove();
    const box = document.createElement('div');
    box.append(source.content.cloneNode(true));
    document.body.append(box);
    await settle([...box.querySelectorAll('*')].filter((el) => el.updateComplete));
    const expected = deep(box);
    if (seen !== expected) {
      let at = 0;
      while (seen[at] === expected[at]) at++;
      problems.push(
        `composed case ${index} (${source.content.firstElementChild?.localName}) differs from a client render: …${seen.slice(Math.max(0, at - 60), at + 80)}… instead of …${expected.slice(Math.max(0, at - 60), at + 80)}…`,
      );
    }
    box.remove();
    parent.insertBefore(upgraded, next);
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
