import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { auditSource } from './analyze.js';
import { SEVERITY_ORDER } from './types.js';
import type { AuditOptions, AuditResult, Rating, TestFinding } from './types.js';

const TEST_FILE = /\.(test|spec)\.[mc]?[jt]sx?$/;
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);

/**
 * Recursively collect every test file under a path. If `path` is itself a
 * file it is returned directly (regardless of naming convention).
 */
export function findTestFiles(path: string): string[] {
  const stat = statSync(path);
  if (stat.isFile()) return [path];

  const files: string[] = [];
  const walkDir = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walkDir(join(dir, entry.name));
      } else if (entry.isFile()) {
        if (TEST_FILE.test(entry.name) && SOURCE_EXT.has(extname(entry.name))) {
          files.push(join(dir, entry.name));
        }
      }
    }
  };
  walkDir(path);
  return files.sort();
}

/** Audit one file, swallowing parse errors into a single FAKE-free empty list. */
export function auditFile(file: string): TestFinding[] {
  const code = readFileSync(file, 'utf8');
  return auditSource(code, file);
}

/**
 * Audit a directory (or single file) and return aggregated findings.
 */
export function audit(path: string, options: AuditOptions = {}): AuditResult {
  const files = findTestFiles(path);
  let findings: TestFinding[] = [];

  for (const file of files) {
    try {
      findings.push(...auditFile(file));
    } catch (err) {
      findings.push({
        file,
        line: 0,
        name: `<could not parse ${basename(file)}>`,
        rating: 'WEAK',
        reason: `Parse error: ${(err as Error).message}`,
      });
    }
  }

  const summary = summarize(findings);

  if (options.minSeverity) {
    const floor = SEVERITY_ORDER[options.minSeverity];
    findings = findings.filter((f) => SEVERITY_ORDER[f.rating] >= floor);
  }

  return { findings, summary };
}

function summarize(findings: TestFinding[]): AuditResult['summary'] {
  const summary = { strong: 0, weak: 0, fake: 0, total: findings.length };
  for (const f of findings) {
    if (f.rating === 'STRONG') summary.strong += 1;
    else if (f.rating === 'WEAK') summary.weak += 1;
    else summary.fake += 1;
  }
  return summary;
}

/**
 * Whether a scan should fail the process given a --fail-on threshold.
 */
export function shouldFail(findings: TestFinding[], failOn: Rating): boolean {
  const floor = SEVERITY_ORDER[failOn];
  return findings.some((f) => SEVERITY_ORDER[f.rating] >= floor);
}
