#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import pc from 'picocolors';
import { runAudit } from './run.js';
import type { Rating } from './types.js';

interface CliOptions {
  json?: boolean;
  minSeverity?: string;
  failOn?: string;
}

function parseSeverity(value: string, flag: string): Rating {
  const normalized = value.toLowerCase();
  if (normalized === 'weak') return 'WEAK';
  if (normalized === 'fake') return 'FAKE';
  console.error(pc.red(`Invalid value for ${flag}: "${value}" (expected "weak" or "fake")`));
  process.exit(2);
}

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('ai-test-auditor')
    .description('Catch AI-generated tests that pass but test nothing.')
    .version('0.1.0')
    .argument('<dir>', 'directory or file to scan for test files')
    .option('--json', 'output machine-readable JSON instead of a table')
    .option('--min-severity <level>', 'only report findings at or above this severity (weak|fake)')
    .option(
      '--fail-on <level>',
      'exit with code 1 when a finding at this severity exists (fake|weak)',
      'fake',
    )
    .action((dir: string, options: CliOptions) => {
      const minSeverity = options.minSeverity
        ? parseSeverity(options.minSeverity, '--min-severity')
        : undefined;
      const failOn = parseSeverity(options.failOn ?? 'fake', '--fail-on');

      const result = runAudit(dir, { json: options.json, minSeverity, failOn });

      if (result.stdout) process.stdout.write(result.stdout + '\n');
      if (result.stderr) process.stderr.write(pc.red('\n' + result.stderr + '\n'));
      process.exit(result.exitCode);
    });

  return program;
}

export function run(argv: string[] = process.argv): void {
  buildProgram().parse(argv);
}

/* c8 ignore next 4 -- only runs when invoked as the CLI entry point */
const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  run();
}
