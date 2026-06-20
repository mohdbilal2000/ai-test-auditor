/**
 * Core domain types shared across the auditor.
 */

/** The quality rating assigned to a single test. */
export type Rating = 'STRONG' | 'WEAK' | 'FAKE';

/** Severity ordering used by --min-severity and --fail-on. */
export const SEVERITY_ORDER: Record<Rating, number> = {
  STRONG: 0,
  WEAK: 1,
  FAKE: 2,
};

/** A single audited test case. */
export interface TestFinding {
  /** Absolute or relative path to the file the test lives in. */
  file: string;
  /** 1-based line number where the test block starts. */
  line: number;
  /** The test's name (the first string argument to it/test). */
  name: string;
  /** The quality rating. */
  rating: Rating;
  /** Human-readable explanation for the rating. */
  reason: string;
}

/** Aggregate counts for a scan. */
export interface AuditSummary {
  strong: number;
  weak: number;
  fake: number;
  total: number;
}

/** The full result of auditing one or more files. */
export interface AuditResult {
  findings: TestFinding[];
  summary: AuditSummary;
}

/** Options that influence how a directory/file is audited. */
export interface AuditOptions {
  /** Only include findings at or above this severity. */
  minSeverity?: Rating;
}
