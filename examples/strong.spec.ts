import { describe, it, expect } from 'vitest';

// A small unit under test.
function add(a: number, b: number): number {
  return a + b;
}

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '-');
}

describe('add', () => {
  it('returns the sum of two numbers', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(add(-4, 1)).toEqual(-3);
  });
});

describe('slugify', () => {
  it('lower-cases and hyphenates the input', () => {
    const out = slugify('  Hello World  ');
    expect(out).toBe('hello-world');
  });

  it('throws nothing and returns a string for empty input', () => {
    expect(slugify('')).toHaveLength(0);
  });
});
