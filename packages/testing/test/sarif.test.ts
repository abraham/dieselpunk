import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { severeResults } from '../src/sarif.ts';
import type { Sarif } from '../src/sarif.ts';

const at = (uri: string, startLine: number) => [
  { physicalLocation: { artifactLocation: { uri }, region: { startLine } } },
];

// Rules in the driver and in a query pack, as CodeQL writes them.
const sarif = (results: NonNullable<NonNullable<Sarif['runs']>[number]['results']>): Sarif => ({
  runs: [
    {
      tool: {
        driver: {
          rules: [{ id: 'js/xss', properties: { 'security-severity': '7.8' } }],
        },
        extensions: [
          {
            rules: [
              { id: 'js/unused', properties: {} },
              { id: 'js/weak', properties: { 'security-severity': '5.0' } },
              { id: 'js/injection', properties: { 'security-severity': '9.3' } },
            ],
          },
        ],
      },
      results,
    },
  ],
});

describe('severeResults', () => {
  it('reports results scored high or critical, found by id or by index', () => {
    const found = severeResults(
      sarif([
        { ruleId: 'js/xss', locations: at('src/a.ts', 4) },
        { rule: { index: 2, toolComponent: { index: 0 } }, ruleId: 'js/injection' },
        { rule: { id: 'js/injection' }, locations: at('src/b.ts', 9) },
      ]),
    );
    assert.deepEqual(found, [
      'js/xss at src/a.ts:4 (7.8)',
      'js/injection at an unknown file (9.3)',
      'js/injection at src/b.ts:9 (9.3)',
    ]);
  });

  it('ignores medium, unscored, and suppressed results', () => {
    const found = severeResults(
      sarif([
        { ruleId: 'js/weak', locations: at('src/a.ts', 1) },
        { ruleId: 'js/unused', locations: at('src/a.ts', 2) },
        { ruleId: 'js/xss', locations: at('src/a.ts', 3), suppressions: [{ kind: 'inSource' }] },
      ]),
    );
    assert.deepEqual(found, []);
  });

  it('reads an empty analysis', () => {
    assert.deepEqual(severeResults({}), []);
    assert.deepEqual(severeResults({ runs: [{}] }), []);
  });
});
