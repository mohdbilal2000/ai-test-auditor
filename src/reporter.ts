import pc from 'picocolors';
import type { AuditResult, Rating, TestFinding } from './types.js';

const RATING_LABEL: Record<Rating, (s: string) => string> = {
  STRONG: (s) => pc.green(s),
  WEAK: (s) => pc.yellow(s),
  FAKE: (s) => pc.red(s),
};

const RATING_ICON: Record<Rating, string> = {
  STRONG: '✔',
  WEAK: '●',
  FAKE: '✘',
};

/** Render the full audit result as a human-readable, grouped report. */
export function formatReport(result: AuditResult): string {
  const { findings, summary } = result;
  const lines: string[] = [];

  if (findings.length === 0) {
    lines.push(pc.dim('No tests matched the current filters.'));
    lines.push('');
    lines.push(formatSummary(summary));
    return lines.join('\n');
  }

  const byFile = groupByFile(findings);
  for (const [file, group] of byFile) {
    lines.push(pc.bold(pc.underline(file)));
    for (const f of group) {
      const icon = RATING_LABEL[f.rating](RATING_ICON[f.rating]);
      const tag = RATING_LABEL[f.rating](f.rating.padEnd(6));
      const loc = pc.dim(`:${f.line}`);
      lines.push(`  ${icon} ${tag} ${f.name}${loc}`);
      lines.push(`      ${pc.dim('↳ ' + f.reason)}`);
    }
    lines.push('');
  }

  lines.push(formatSummary(summary));
  return lines.join('\n');
}

function formatSummary(summary: AuditResult['summary']): string {
  const parts = [
    pc.green(`${summary.strong} strong`),
    pc.yellow(`${summary.weak} weak`),
    pc.red(`${summary.fake} fake`),
  ];
  return pc.bold(`Summary: `) + parts.join(pc.dim(' · ')) + pc.dim(` (${summary.total} tests)`);
}

function groupByFile(findings: TestFinding[]): Map<string, TestFinding[]> {
  const map = new Map<string, TestFinding[]>();
  for (const f of findings) {
    const list = map.get(f.file);
    if (list) list.push(f);
    else map.set(f.file, [f]);
  }
  return map;
}

/** Serialize the result as stable JSON. */
export function formatJson(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}
