import { describe, it, expect, assert } from 'vitest';

function calculateTotal(items: number[]): number {
  return items.reduce((sum, n) => sum + n, 0);
}

describe('calculateTotal', () => {
  // Tautology: asserts on constants, can never fail.
  it('adds up the items', () => {
    expect(true).toBe(true);
  });

  // Tautology via assert.
  it('returns a number', () => {
    assert(1 === 1);
  });

  // No assertion — only a console.log.
  it('handles an empty list', () => {
    console.log(calculateTotal([]));
  });

  // Empty body — asserts nothing.
  it('handles negative numbers', () => {});

  // Commented-out assertion.
  it('throws on invalid input', () => {
    const total = calculateTotal([1, 2, 3]);
    // expect(total).toBe(6);
    void total;
  });

  // Stray .only silently disables the rest of the suite.
  it.only('is the only test that runs', () => {
    expect(calculateTotal([1, 2])).toBe(3);
  });

  // Skipped — never runs.
  it.skip('rounds to two decimals', () => {
    expect(calculateTotal([0.1, 0.2])).toBeCloseTo(0.3);
  });
});
