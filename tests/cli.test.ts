import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runAudit } from '../src/run.js';
import { formatJson, formatReport } from '../src/reporter.js';
import { audit } from '../src/auditor.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, '..', 'examples');

describe('runAudit exit codes', () => {
  it('exits 1 by default (fail-on fake) when fakes exist', () => {
    const result = runAudit(examplesDir);
    expect(result.exitCode).toBe(1);
  });

  it('exits 1 with --fail-on weak when weak tests exist', () => {
    const result = runAudit(examplesDir, { failOn: 'WEAK' });
    expect(result.exitCode).toBe(1);
  });

  it('exits 0 when scanning a strong-only file with default fail-on', () => {
    const result = runAudit(join(examplesDir, 'strong.spec.ts'));
    expect(result.exitCode).toBe(0);
  });

  it('exits 0 with fail-on fake against a weak-only file', () => {
    const result = runAudit(join(examplesDir, 'weak.spec.ts'), { failOn: 'FAKE' });
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 with fail-on weak against a weak-only file', () => {
    const result = runAudit(join(examplesDir, 'weak.spec.ts'), { failOn: 'WEAK' });
    expect(result.exitCode).toBe(1);
  });

  it('exits 2 for a missing path', () => {
    const result = runAudit('does/not/exist');
    expect(result.exitCode).toBe(2);
  });
});

describe('--json output', () => {
  it('emits valid JSON with findings and summary', () => {
    const result = runAudit(examplesDir, { json: true });
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('summary');
    expect(parsed).toHaveProperty('findings');
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(parsed.findings[0]).toHaveProperty('rating');
    expect(parsed.findings[0]).toHaveProperty('reason');
  });

  it('does not print the failure banner in JSON mode', () => {
    const result = runAudit(examplesDir, { json: true });
    expect(result.stderr).toBe('');
  });
});

describe('--min-severity filtering', () => {
  it('only shows fake findings when min-severity is fake', () => {
    const result = runAudit(examplesDir, { json: true, minSeverity: 'FAKE' });
    const parsed = JSON.parse(result.stdout);
    expect(parsed.findings.every((f: { rating: string }) => f.rating === 'FAKE')).toBe(true);
  });
});

describe('reporter', () => {
  const result = audit(examplesDir);

  it('formats a grouped human-readable report', () => {
    const text = formatReport(result);
    expect(text).toContain('Summary');
    expect(text).toMatch(/strong/);
    expect(text).toMatch(/fake/);
  });

  it('formats stable JSON', () => {
    const json = formatJson(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
