import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import { Ledger } from './owner.ts';

afterEach(cleanup);

function element(attributes: Record<string, string> = {}): HTMLButtonElement {
  const button = document.createElement('button');
  for (const [name, value] of Object.entries(attributes)) button.setAttribute(name, value);
  return track(button);
}

describe('Ledger', () => {
  it('gives back the value each attribute had before its first write', () => {
    const ledger = new Ledger();
    const button = element({ role: 'switch' });
    ledger.write(button, 'role', 'radio');
    ledger.write(button, 'role', 'option');
    ledger.write(button, 'tabindex', '-1');
    expect(button.getAttribute('role')).toBe('option');
    expect(ledger.authored(button, 'role')).toBe('switch');
    ledger.restore(button);
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.hasAttribute('tabindex')).toBe(false);
  });

  it('reads the current value of an attribute it never wrote as the author’s', () => {
    const ledger = new Ledger();
    const button = element({ 'aria-pressed': 'true' });
    expect(ledger.authored(button, 'aria-pressed')).toBe('true');
    expect(ledger.authored(button, 'role')).toBeNull();
  });

  it('enables exactly the elements it disabled', () => {
    const ledger = new Ledger();
    const mine = element();
    const theirs = element();
    theirs.disabled = true;
    ledger.disable(mine);
    ledger.disable(theirs);
    expect(mine.disabled).toBe(true);
    ledger.restoreAll();
    expect(mine.disabled).toBe(false);
    expect(theirs.disabled).toBe(true);
  });

  it('keeps what it wrote to the elements it is told to keep', () => {
    const ledger = new Ledger();
    const kept = element();
    const left = element();
    ledger.write(kept, 'slot', 'rest');
    ledger.write(left, 'slot', 'rest');
    ledger.restoreAll(new Set([kept]));
    expect(kept.getAttribute('slot')).toBe('rest');
    expect(left.hasAttribute('slot')).toBe(false);
    ledger.restoreAll();
    expect(kept.hasAttribute('slot')).toBe(false);
  });
});
