import { isServer } from 'lit';
import { expect, it } from 'vitest';
import '@dieselpunk/core/select/register.js';
import '@dieselpunk/core/table/register.js';
import '@dieselpunk/core/text-field/register.js';

const mount = async (markup) => {
  document.body.innerHTML = markup;
  const element = document.body.firstElementChild;
  await element.updateComplete;
  return element;
};

it('loads the browser build of Lit', () => {
  expect(isServer).toBe(false);
});

it('renders a select with its options and a field with its label', async () => {
  const select = await mount(
    '<punk-select label="Item"><option value="a">Iron</option><option value="b" selected>Copper</option></punk-select>',
  );
  expect(select.shadowRoot.querySelectorAll('option')).toHaveLength(2);
  expect(select.value).toBe('b');
  const field = await mount('<punk-text-field label="Name" value="Ada"></punk-text-field>');
  expect(field.shadowRoot.querySelector('[part="label"]').textContent.trim()).toBe('Name');
  expect(field.shadowRoot.querySelector('input').value).toBe('Ada');
});

it('renders a table', async () => {
  const table = await mount(
    '<punk-table aria-label="Items"><table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Iron</td></tr></tbody></table></punk-table>',
  );
  expect(table.shadowRoot).not.toBeNull();
});
