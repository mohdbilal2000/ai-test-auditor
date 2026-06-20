# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-20

### Added

- Initial release of `ai-test-auditor`.
- AST-based scanner for Jest / Vitest / Mocha tests (`describe` / `it` / `test`).
- STRONG / WEAK / FAKE rating per test with a human-readable reason.
- Detection of:
  - tautologies (`expect(true).toBe(true)`, `assert(1 === 1)`) via constant folding,
  - assertion-free tests (empty body, `console.log`-only, commented-out asserts),
  - shallow checks (`toBeDefined`-only, snapshot-only, single truthy),
  - name ≠ assertion mismatches,
  - stray `.only` / `.skip` (including inherited from `describe`).
- CLI: `ai-test-auditor <dir>` with `--json`, `--min-severity <weak|fake>`,
  and `--fail-on <fake|weak>` (default `fake` → exit `1`).
- Grouped table and JSON reporters.
- Library API (`audit`, `auditSource`, `runAudit`, …).
- Example fixtures for all three ratings and a full Vitest test suite.

[Unreleased]: https://github.com/mohdbilal2000/ai-test-auditor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mohdbilal2000/ai-test-auditor/releases/tag/v0.1.0
