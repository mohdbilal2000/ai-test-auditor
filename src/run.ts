import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { audit, shouldFail } from './auditor.js';
import { formatJson, formatReport } from './reporter.js';
import { SEVERITY_ORDER } from './types.js';
import type { AuditResult, Rating } from './types.js';

export interface RunOptions {
  json?: boolean;
  minSeverity?: Rating;
  failOn?: Rating;
  cwd?: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * The testable core of the CLI: audit a path and produce the exact text and
 * exit code the command would emit, without touching the process.
 */
export function runAudit(dir: string, options: RunOptions = {}): RunResult {
  const failOn: Rating = options.failOn ?? 'FAKE';
  const target = resolve(options.cwd ?? process.cwd(), dir);

  if (!existsSync(target)) {
    return { stdout: '', stderr: `Path not found: ${dir}`, exitCode: 2 };
  }

  const full = audit(target);
  const display: AuditResult = {
    summary: full.summary,
    findings: options.minSeverity
      ? full.findings.filter(
          (f) => SEVERITY_ORDER[f.rating] >= SEVERITY_ORDER[options.minSeverity as Rating],
        )
      : full.findings,
  };

  const stdout = options.json ? formatJson(display) : formatReport(display);
  const failed = shouldFail(full.findings, failOn);
  const stderr =
    failed && !options.json
      ? `✘ Failing: found tests at or above "${failOn.toLowerCase()}" severity.`
      : '';

  return { stdout, stderr, exitCode: failed ? 1 : 0 };
}
