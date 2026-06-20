import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { auditFile } from '../src/auditor.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', 'examples');

describe('examples/strong.spec.ts', () => {
  it('contains only STRONG tests', () => {
    const findings = auditFile(join(examplesDir, 'strong.spec.ts'));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.rating === 'STRONG')).toBe(true);
  });
});

describe('examples/weak.spec.ts', () => {
  it('contains only WEAK tests', () => {
    const findings = auditFile(join(examplesDir, 'weak.spec.ts'));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.rating === 'WEAK')).toBe(true);
  });
});

describe('examples/fake.spec.ts', () => {
  it('contains only FAKE tests', () => {
    const findings = auditFile(join(examplesDir, 'fake.spec.ts'));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.rating === 'FAKE')).toBe(true);
  });
});
