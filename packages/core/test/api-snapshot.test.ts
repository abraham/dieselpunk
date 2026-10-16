import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeApi, diffApi, isSame } from '../scripts/api-snapshot.ts';
import type { Manifest } from '../scripts/api-snapshot.ts';

const manifest = (): Manifest => ({
  modules: [
    {
      declarations: [
        { name: 'Helper' },
        {
          tagName: 'punk-box',
          attributes: [{ name: 'open', type: { text: 'boolean' }, default: 'false' }],
          members: [
            { kind: 'field', name: 'open', type: { text: 'boolean' }, default: 'false' },
            { kind: 'field', name: 'hidden', type: { text: 'number' }, privacy: 'private' },
            { kind: 'field', name: 'styles', static: true },
            { kind: 'method', name: 'show' },
            { kind: 'method', name: 'update', privacy: 'protected' },
          ],
          events: [{ name: 'punk-open', type: { text: 'CustomEvent' } }],
          slots: [{ name: '' }, { name: 'footer' }],
          cssParts: [{ name: 'box' }],
          cssProperties: [{ name: '--punk-box-width', default: '10px' }],
        },
      ],
    },
  ],
});

describe('describeApi', () => {
  const snapshot = describeApi(manifest(), ['./b', '.', './a']);
  const box = snapshot.elements['punk-box'];

  it('describes each tag, and nothing that is not one', () => {
    assert.deepEqual(Object.keys(snapshot.elements), ['punk-box']);
    assert.deepEqual(box?.attributes, { open: 'boolean = false' });
    assert.deepEqual(box?.events, { 'punk-open': 'CustomEvent' });
    assert.deepEqual(box?.parts, { box: '' });
    assert.deepEqual(box?.cssProperties, { '--punk-box-width': '= 10px' });
  });

  it('leaves out private and protected members and static ones', () => {
    assert.deepEqual(box?.properties, { open: 'boolean = false' });
    assert.deepEqual(box?.methods, { show: '' });
  });

  it('names the default slot, and sorts the exports', () => {
    assert.deepEqual(Object.keys(box?.slots ?? {}).sort(), ['(default)', 'footer']);
    assert.deepEqual(snapshot.exports, ['.', './a', './b']);
  });
});

describe('diffApi', () => {
  const before = describeApi(manifest(), ['.']);

  it('finds no difference in the same API', () => {
    assert.ok(isSame(diffApi(before, describeApi(manifest(), ['.']))));
  });

  it('calls a removed part, event, and tag removed', () => {
    const changed = manifest();
    const box = changed.modules[0]?.declarations?.[1];
    box!.cssParts = [{ name: 'frame' }];
    box!.events = [];
    const difference = diffApi(before, describeApi(changed, ['.']));
    assert.deepEqual(difference.removed, ['punk-box events punk-open', 'punk-box parts box']);
    assert.deepEqual(difference.added, ['punk-box parts frame']);

    const gone = diffApi(before, describeApi({ modules: [] }, ['.']));
    assert.ok(gone.removed.includes('punk-box'));
  });

  it('calls a changed default changed, and a new export added', () => {
    const changed = manifest();
    changed.modules[0]!.declarations![1]!.attributes = [
      { name: 'open', type: { text: 'boolean' }, default: 'true' },
    ];
    const difference = diffApi(before, describeApi(changed, ['.', './new']));
    assert.deepEqual(difference.changed, [
      'punk-box attributes open: boolean = false -> boolean = true',
    ]);
    assert.deepEqual(difference.added, ['exports ./new']);
    assert.ok(!isSame(difference));
  });
});
