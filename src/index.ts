/**
 * Public library API for ai-test-auditor.
 *
 * @example
 * ```ts
 * import { audit } from 'ai-test-auditor';
 * const result = audit('tests/');
 * console.log(result.summary);
 * ```
 */
export { audit, auditFile, findTestFiles, shouldFail } from './auditor.js';
export { auditSource, analyzeBody } from './analyze.js';
export { formatReport, formatJson } from './reporter.js';
export { runAudit } from './run.js';
export { SEVERITY_ORDER } from './types.js';
export type { RunOptions, RunResult } from './run.js';
export type { Rating, TestFinding, AuditResult, AuditSummary, AuditOptions } from './types.js';
