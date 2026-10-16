import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SelectionModel } from '../src/internal/selection-model.ts';
import type { SelectionMode } from '../src/internal/selection-model.ts';

const keys = ['a', 'b', 'c', 'd', 'e'];

function model(mode: SelectionMode, disabled: string[] = [], list: string[] = keys) {
  const result = new SelectionModel(mode);
  result.setItems(list, disabled);
  return result;
}

describe('SelectionModel, mode none', () => {
  it('selects nothing', () => {
    const m = model('none');
    for (const result of [
      m.select('a'),
      m.toggle('a'),
      m.extendTo('c'),
      m.selectAll(),
      m.set(['b']),
    ]) {
      assert.deepEqual(result, { selected: [], changed: false });
    }
  });
});

describe('SelectionModel, mode single', () => {
  it('replaces the selection and reports the change', () => {
    const m = model('single');
    assert.deepEqual(m.select('b'), { selected: ['b'], changed: true });
    assert.deepEqual(m.select('d'), { selected: ['d'], changed: true });
    assert.deepEqual(m.select('d'), { selected: ['d'], changed: false });
  });

  it('never clears the selection by toggling', () => {
    const m = model('single');
    m.select('b');
    assert.deepEqual(m.toggle('b'), { selected: ['b'], changed: false });
    assert.deepEqual(m.toggle('c'), { selected: ['c'], changed: true });
  });

  it('treats extending and selecting all as plain selection or nothing', () => {
    const m = model('single');
    m.select('a');
    assert.deepEqual(m.extendTo('d'), { selected: ['d'], changed: true });
    assert.deepEqual(m.selectAll(), { selected: ['d'], changed: false });
  });

  it('keeps only the first of several keys given to set', () => {
    const m = model('single');
    assert.deepEqual(m.set(['d', 'b']).selected, ['d']);
  });
});

describe('SelectionModel, mode multiple', () => {
  it('adds and removes by toggling', () => {
    const m = model('multiple');
    assert.deepEqual(m.toggle('b').selected, ['b']);
    assert.deepEqual(m.toggle('d').selected, ['b', 'd']);
    assert.deepEqual(m.toggle('b'), { selected: ['d'], changed: true });
  });

  it('replaces the selection with select', () => {
    const m = model('multiple');
    m.toggle('a');
    m.toggle('c');
    assert.deepEqual(m.select('e'), { selected: ['e'], changed: true });
  });

  it('reports selected keys in item order, whatever order they were chosen in', () => {
    const m = model('multiple');
    m.toggle('d');
    m.toggle('a');
    assert.deepEqual(m.selected, ['a', 'd']);
  });

  it('extends from the anchor in either direction and keeps the anchor', () => {
    const m = model('multiple');
    m.toggle('b');
    assert.deepEqual(m.extendTo('d').selected, ['b', 'c', 'd']);
    assert.deepEqual(m.extendTo('a').selected, ['a', 'b']);
    assert.deepEqual(m.extendTo('b').selected, ['b']);
  });

  it('extends from the key itself when there is no anchor', () => {
    const m = model('multiple');
    assert.deepEqual(m.extendTo('c'), { selected: ['c'], changed: true });
    assert.deepEqual(m.extendTo('e').selected, ['c', 'd', 'e']);
  });

  it('moves the anchor with select and toggle', () => {
    const m = model('multiple');
    m.select('a');
    m.toggle('d');
    assert.deepEqual(m.extendTo('e').selected, ['d', 'e']);
  });

  it('selects all enabled keys', () => {
    const m = model('multiple', ['c']);
    assert.deepEqual(m.selectAll(), { selected: ['a', 'b', 'd', 'e'], changed: true });
    assert.deepEqual(m.selectAll().changed, false);
  });

  it('clears and forgets the anchor', () => {
    const m = model('multiple');
    m.toggle('d');
    assert.deepEqual(m.clear(), { selected: [], changed: true });
    assert.deepEqual(m.clear().changed, false);
    assert.deepEqual(m.extendTo('b').selected, ['b']);
  });

  it('reports the anchor, which extending keeps and clearing forgets', () => {
    const m = model('multiple');
    assert.equal(m.anchor, undefined);
    m.select('b');
    assert.equal(m.anchor, 'b');
    m.extendTo('d');
    assert.equal(m.anchor, 'b');
    m.toggle('e');
    assert.equal(m.anchor, 'e');
    m.clear();
    assert.equal(m.anchor, undefined);
    m.set(['a', 'c']);
    assert.equal(m.anchor, 'c');
  });

  it('selects exactly the valid keys given to set', () => {
    const m = model('multiple', ['b']);
    m.toggle('a');
    assert.deepEqual(m.set(['e', 'zz', 'b', 'c', 'e']), { selected: ['c', 'e'], changed: true });
    assert.deepEqual(m.set(['c', 'e']).changed, false);
    assert.deepEqual(m.set([]), { selected: [], changed: true });
  });
});

describe('SelectionModel, disabled and removed keys', () => {
  it('never selects a disabled key by any operation', () => {
    const m = model('multiple', ['b']);
    assert.equal(m.select('b').changed, false);
    assert.equal(m.toggle('b').changed, false);
    m.select('a');
    assert.deepEqual(m.extendTo('c').selected, ['a', 'c']);
  });

  it('ignores unknown keys', () => {
    const m = model('multiple');
    m.toggle('a');
    for (const result of [m.select('zz'), m.toggle('zz'), m.extendTo('zz')]) {
      assert.deepEqual(result, { selected: ['a'], changed: false });
    }
  });

  it('keeps a selected key that becomes disabled until the selection is replaced', () => {
    const m = model('multiple');
    m.toggle('b');
    assert.deepEqual(m.setItems(keys, ['b']), { selected: ['b'], changed: false });
    assert.deepEqual(m.toggle('b'), { selected: ['b'], changed: false });
    assert.deepEqual(m.select('c'), { selected: ['c'], changed: true });
  });

  it('drops a selected key that leaves the list and reports it', () => {
    const m = model('multiple');
    m.toggle('b');
    m.toggle('d');
    assert.deepEqual(m.setItems(['a', 'b', 'c']), { selected: ['b'], changed: true });
    assert.deepEqual(m.setItems(['a', 'b', 'c']).changed, false);
  });

  it('does not count reordering as a change', () => {
    const m = model('multiple');
    m.toggle('a');
    m.toggle('d');
    assert.deepEqual(m.setItems([...keys].reverse()), { selected: ['d', 'a'], changed: false });
  });

  it('forgets an anchor whose key left the list', () => {
    const m = model('multiple');
    m.toggle('b');
    m.setItems(['a', 'c', 'd']);
    assert.deepEqual(m.extendTo('d').selected, ['d']);
  });

  it('counts a key that appears twice once, at its first position', () => {
    const m = model('multiple', [], ['a', 'b', 'a', 'c']);
    assert.deepEqual(m.selectAll().selected, ['a', 'b', 'c']);
  });

  it('can have an empty list', () => {
    const m = model('multiple', [], []);
    assert.deepEqual(m.selectAll(), { selected: [], changed: false });
    assert.deepEqual(m.select('a'), { selected: [], changed: false });
  });
});

describe('SelectionModel, changing mode', () => {
  it('clears the selection when switching to none', () => {
    const m = model('multiple');
    m.toggle('a');
    m.toggle('c');
    assert.deepEqual(m.setMode('none'), { selected: [], changed: true });
    assert.equal(m.mode, 'none');
  });

  it('keeps the first selected key when switching to single', () => {
    const m = model('multiple');
    m.toggle('d');
    m.toggle('b');
    assert.deepEqual(m.setMode('single'), { selected: ['b'], changed: true });
  });

  it('keeps the selection when switching to multiple, and reports no change', () => {
    const m = model('single');
    m.select('c');
    assert.deepEqual(m.setMode('multiple'), { selected: ['c'], changed: false });
    assert.deepEqual(m.toggle('d').selected, ['c', 'd']);
  });
});
