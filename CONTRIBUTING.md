# Contributing to ai-test-auditor

Thanks for your interest in improving `ai-test-auditor`! 🎉

## Getting started

```bash
git clone https://github.com/mohdbilal2000/ai-test-auditor.git
cd ai-test-auditor
npm install
```

## Development workflow

| Command              | What it does                    |
| -------------------- | ------------------------------- |
| `npm run dev`        | Rebuild on change (tsup watch). |
| `npm test`           | Run the Vitest suite once.      |
| `npm run test:watch` | Run Vitest in watch mode.       |
| `npm run typecheck`  | Type-check with `tsc --noEmit`. |
| `npm run lint`       | Lint with ESLint.               |
| `npm run format`     | Format with Prettier.           |
| `npm run build`      | Produce the `dist/` bundle.     |

Try your local build against the bundled fixtures:

```bash
npm run build
node dist/cli.js examples/
```

## Project layout

```
src/
  analyze.ts    AST → STRONG/WEAK/FAKE rating (the core heuristics)
  auditor.ts    file discovery + aggregation
  parser.ts     @babel/parser wrapper + AST walk helpers
  reporter.ts   table + JSON formatting
  run.ts        testable CLI core (no process side effects)
  cli.ts        commander wiring + process exit
tests/          Vitest specs mirroring src/
examples/       intentionally STRONG / WEAK / FAKE fixtures
```

## Adding a new detection rule

1. Add or adjust logic in `src/analyze.ts`.
2. Add a focused unit test in `tests/analyze.test.ts`.
3. If it changes example output, update `examples/` and the README.

## Pull requests

- Keep commits small and use [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:` …).
- Make sure `npm test`, `npm run lint`, and `npm run build` all pass.
- Add a line to `CHANGELOG.md` under **Unreleased**.

## Code of Conduct

Be kind and constructive. We follow the spirit of the
[Contributor Covenant](https://www.contributor-covenant.org/).
