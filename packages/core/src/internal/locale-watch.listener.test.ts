import { expect, it, vi } from 'vitest';

// Its own file, so the module is first loaded here, after the spy is in place.
it('adds one listener however many hosts there are, and keeps it when the last has gone', async () => {
  const added: string[] = [];
  const removed: string[] = [];
  const add = window.addEventListener.bind(window) as (...args: unknown[]) => void;
  vi.spyOn(window, 'addEventListener').mockImplementation((type, fn, options) => {
    added.push(type);
    add(type, fn, options);
  });
  vi.spyOn(window, 'removeEventListener').mockImplementation((type) => {
    removed.push(type);
  });

  const { watchLocale } = await import('./locale-watch.ts');
  expect(added).toEqual([]);
  const stops = Array.from({ length: 100 }, () => watchLocale({ requestUpdate: vi.fn() }));
  expect(added).toEqual(['lit-localize-status']);
  stops.forEach((stop) => stop());
  watchLocale({ requestUpdate: vi.fn() })();
  expect(added).toEqual(['lit-localize-status']);
  expect(removed).toEqual([]);
});
