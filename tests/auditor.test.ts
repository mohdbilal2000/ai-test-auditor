import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { audit, findTestFiles, shouldFail } from '../src/auditor.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', 'examples');

describe('findTestFiles', () => {
  it('discovers .spec/.test files under a directory', () => {
    const files = findTestFiles(examplesDir);
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.every((f) => /\.(spec|test)\.[jt]sx?$/.test(f))).toBe(true);
  });

  it('returns a single file directly when given a file path', () => {
    const file = join(examplesDir, 'fake.spec.ts');
    expect(findTestFiles(file)).toEqual([file]);
  });
});

describe('audit summary', () => {
  it('produces counts across all examples', () => {
    const { summary, findings } = audit(examplesDir);
    expect(summary.total).toBe(findings.length);
    expect(summary.strong).toBeGreaterThan(0);
    expect(summary.weak).toBeGreaterThan(0);
    expect(summary.fake).toBeGreaterThan(0);
    expect(summary.strong + summary.weak + summary.fake).toBe(summary.total);
  });

  it('filters by minSeverity while keeping the full summary', () => {
    const full = audit(examplesDir);
    const filtered = audit(examplesDir, { minSeverity: 'FAKE' });
    expect(filtered.findings.every((f) => f.rating === 'FAKE')).toBe(true);
    // Summary still reflects the entire scan, not the filtered view.
    expect(filtered.summary.total).toBe(full.summary.total);
  });
});

describe('shouldFail', () => {
  const { findings } = audit(examplesDir);

  it('fails on FAKE by default', () => {
    expect(shouldFail(findings, 'FAKE')).toBe(true);
  });

  it('fails on WEAK (which includes FAKE)', () => {
    expect(shouldFail(findings, 'WEAK')).toBe(true);
  });

  it('does not fail when only strong tests exist', () => {
    const strongOnly = findings.filter((f) => f.rating === 'STRONG');
    expect(shouldFail(strongOnly, 'FAKE')).toBe(false);
  });
});
