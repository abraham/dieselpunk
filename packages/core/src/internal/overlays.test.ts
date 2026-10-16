import { afterEach, describe, expect, it, vi } from 'vitest';
import { overlayStack } from './overlays.ts';

afterEach(() => vi.restoreAllMocks());

const keydownCalls = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter(([type]) => type === 'keydown');

describe('the page overlay stack', () => {
  it('holds one keydown listener on the document while an overlay is open, and none otherwise', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const a = { dismissible: true, close: () => overlayStack.remove(a) };
    const b = { dismissible: true, close: () => overlayStack.remove(b) };
    expect(keydownCalls(add)).toHaveLength(0);
    overlayStack.push(a);
    overlayStack.push(b);
    expect(keydownCalls(add)).toHaveLength(1);
    expect(keydownCalls(remove)).toHaveLength(0);
    overlayStack.remove(a);
    expect(keydownCalls(remove)).toHaveLength(0);
    overlayStack.remove(b);
    expect(keydownCalls(remove)).toHaveLength(1);
    expect(overlayStack.size).toBe(0);
  });
});
